import { GitHub } from 'github-graphql-api';
import {
  BranchesPage,
  BranchesPageResponse,
  Commit,
  Dict,
  HistoryPage,
  HistoryPageResponse,
  RepositoriesPage,
  RepositoriesPageResponse,
  Repository,
  UserResponse,
  Branch,
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

  static async create(login: string): Promise<Cron> {
    const id = await this.getIdFromUser(login);
    const cron = new Cron(id, login);
    await cron.init();
    return cron;
  }

  async init() {
    await this.initRepositories();
    await this.initCommits();
  }

  async initRepositories() {
    const repositories = await this.getRepositories();
    const repoDict: Dict<Repository> = {};
    for (const repo of repositories) {
      repoDict[repo.key] = repo;
    }
    for (const repo of this.repositories) {
      if (repoDict[repo.key]) {
        const dict = repoDict[repo.key];
        if (dict.rootId === repo.rootId) {
          dict.branches = repo.branches;
          dict.commits = repo.commits;
        }
      }
    }
    this.repositories = Object.values(repoDict);
  }

  async initBranches() {
    for (const repo of this.repositories) {
      console.log(`get branches for ${repo.owner}/${repo.name}`);
      const branchNames = await this.getBranchNames(repo);
      repo.branches = branchNames.map((name => ({
        name,
        fetched: 0,
      })));
    }
  }

  async initCommits() {
    for (const repo of this.repositories) {
      const commitDict: Dict<Commit> = {};
      for (const branch of repo.branches) {
        console.log(`get commits for ${repo.owner}/${repo.name}:${branch}`);

        const commits = await this.getCommits(repo, branch);
        for (const commit of commits) {
          // Use dictionary to deduplicate entries
          commitDict[commit.oid] = commit;
        }
      }
      repo.commits = commitDict;
    }
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

  static async getIdFromUser(login: string): Promise<string> {
    const response: UserResponse = await github.query(`
      query {
        user(login: "${ login }") {
          id
        }
      }
    `);
    return response.user.id;
  }

  async getRepositories(): Promise<Repository[]> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const repositories: Repository[] = [];
    while (hasNextPage) {
      const repositoryPage: RepositoriesPage = await this.getRepositoriesPage(endCursor);
      hasNextPage = repositoryPage.pageInfo.hasNextPage;
      endCursor = repositoryPage.pageInfo.endCursor;
      for (const node of repositoryPage.nodes) {
        if (node.defaultBranchRef) {
          repositories.push({
            owner: node.owner.login,
            name: node.name,
            key: `${node.owner.login}/${node.name}`,
            branches: [],
            commits: {},
            rootId: node.defaultBranchRef.target.oid,
            count: node.defaultBranchRef.target.history.totalCount,
          });
        }
      }
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
              defaultBranchRef {
                target {
                  oid
                  ... on Commit {
                    history {
                      totalCount
                    }
                  }
                }
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

  async getCommits(repo: Repository, branch: Branch): Promise<Commit[]> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const commits: Commit[] = [];
    while (hasNextPage) {
      const historyPage: HistoryPage = await this.getHistoryPage(repo, branch.name, endCursor);
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
