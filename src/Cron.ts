import { GitHub } from 'github-graphql-api';
import {
  RepositoriesPage,
  RepositoriesPageResponse,
  ViewerResponse,
  Repository,
  Viewer,
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
  }

  static paginated(
    resource: string,
    startCursor: string | undefined,
    filter: string,
    slot: string)
  : string {

    let pageQuery = 'first: 100';
    if (startCursor) {
      pageQuery += `, after: "${startCursor}"`;
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
      })));
    }
    return repositories;
  }

  async getRepositoriesPage(startCursor?: string): Promise<RepositoriesPage> {
    const response: RepositoriesPageResponse = await github.query(`
      query {
        user(login: "${ this.userLogin}") {
          ${ Cron.paginated(
            'repositories',
            startCursor,
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
}

export default Cron;
