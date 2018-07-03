import { GitHub } from 'github-graphql-api';
import {
  BranchesPage,
  BranchesPageResponse,
  Commit,
  HistoryPage,
  HistoryPageResponse,
  RepositoriesPage,
  RepositoriesPageResponse,
  Repository,
  Viewer,
  ViewerResponse,
} from './types';
const apiToken = process.env.GITHUB_TOKEN;

if (!apiToken) throw 'please define "GITHUB_TOKEN" env variable';

const github = new GitHub({
  token: apiToken,
});

export class Cron {
  repositories: Repository[] = [];
  userId: string;
  userLogin: string;

  constructor(userId: string, userLogin: string) {
    this.userId = userId;
    this.userLogin = userLogin;
    console.log(apiToken);
  }

  static async create(): Promise<Cron> {
    const { id, login } = await this.getViewer();
    const cron = new Cron(id, login);
    await cron.init();
    return cron;
  }

  async init() {
    await this.initRepositories();
  }

  async initRepositories() {
    this.repositories = await this.getRepositories();
    await Promise.all(this.repositories.map(async (repo) => {
      repo.branches = await this.getBranchNames(repo);
    }));
  }

  static paginated(
    resource: string,
    cursor: string | undefined,
    filter: string,
    slot: string)
  : string {

    let pageQuery = 'first: 100';
    if (cursor) {
      pageQuery += `, after: "${cursor}"`;
    }
    if (filter) {
      pageQuery += `, ${filter}`;
    }
    return `
      ${ resource }(${ pageQuery }) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ${ slot }
        }
      }
    `;
  }

  static async getViewer(): Promise<Viewer> {
    const response: ViewerResponse = await github.query(`
      query {
        viewer {
          id
          login
        }
      }
    `);
    return response.viewer;
  }

  async getRepositories(): Promise<Repository[]> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const repositories: Repository[] = [];
    while (hasNextPage) {
      const repositoryPage: RepositoriesPage = await this.getRepositoriesPage(endCursor);
      hasNextPage = repositoryPage.pageInfo.hasNextPage;
      endCursor = repositoryPage.pageInfo.endCursor;
      repositories.push(...repositoryPage.nodes.map(node => ({
        owner: node.owner.login,
        name: node.name,
        branches: [],
        commits: [],
      })));
    }
    return repositories;
  }

  async getRepositoriesPage(cursor?: string): Promise<RepositoriesPage> {
    const response: RepositoriesPageResponse = await github.query(`
      query {
        user(login: "${ this.userLogin}") {
          ${ Cron.paginated(
            'repositories',
            cursor,
            'affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]',
            `
              name
              owner {
                login
              }
            `,
          )}
        }
      }
    `);
    return response.user.repositories;
  }

  async getBranchNames(repo: Repository): Promise<string[]> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const branchNames: string[] = [];
    while (hasNextPage) {
      const branchesPage: BranchesPage = await this.getBranchesPage(repo, endCursor);
      hasNextPage = branchesPage.pageInfo.hasNextPage;
      endCursor = branchesPage.pageInfo.endCursor;
      branchNames.push(...branchesPage.nodes.map(node => node.name));
    }
    return branchNames;
  }

  async getBranchesPage(repo: Repository, cursor?: string): Promise<BranchesPage> {
    const response: BranchesPageResponse = await github.query(`
      query {
        repository(owner: "${ repo.owner }", name: "${ repo.name }") {
          ${ Cron.paginated(
            'refs',
            cursor,
            `refPrefix: "refs/heads/"`,
            `
              name
            `,
          )}
        }
      }
    `);
    return response.repository.refs;
  }

  async getCommits(repo: Repository, branch: string): Promise<Commit[]> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const commits: Commit[] = [];
    while (hasNextPage) {
      const historyPage: HistoryPage = await this.getHistoryPage(repo, branch, endCursor);
      hasNextPage = historyPage.pageInfo.hasNextPage;
      endCursor = historyPage.pageInfo.endCursor;
      commits.push(...historyPage.nodes);
    }
    return commits;
  }

  async getHistoryPage(repo: Repository, branch: string, cursor?: string): Promise<HistoryPage> {
    const response: HistoryPageResponse = await github.query(`
      query {
        repository(owner: "${ repo.owner }", name: "${ repo.name }") {
          ref(qualifiedName: "${ branch }") {
            target {
              ... on Commit {
                ${ Cron.paginated(
                  'history',
                  cursor,
                  `author: { id: "${ this.userId }" }`,
                  `
                    oid
                    additions
                    deletions
                    changedFiles
                    committedDate
                  `,
                )}
              }
            }
          }
        }
      }
    `);
    return response.repository.ref.target.history;
  }
}

export default Cron;
