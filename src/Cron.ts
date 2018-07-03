import { GitHub } from 'github-graphql-api';
import {
  RepositoriesPage,
  RepositoriesPageResponse,
} from './types';
const apiToken = process.env.GITHUB_TOKEN;

if (!apiToken) throw 'please define "GITHUB_TOKEN" env variable';

const github = new GitHub({
  token: apiToken,
});

export class Cron {
  constructor() {
    console.log(apiToken);
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

  async getViewerId(): Promise<string> {
    const response: {
      viewer: {
        id: string;
      };
    } = await github.query(`
      query {
        viewer {
          id
        }
      }
    `);
    return response.viewer.id;
  }

  async getRepositoryNames(): Promise<string[]> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const repositoryNames: string[] = [];
    while (hasNextPage) {
      const repositoryPage: RepositoriesPage = await this.getRepositoriesPage(endCursor);
      hasNextPage = repositoryPage.pageInfo.hasNextPage;
      endCursor = repositoryPage.pageInfo.endCursor;
      repositoryNames.push(...repositoryPage.nodes.map(node => node.nameWithOwner));
    }
    return repositoryNames;
  }

  async getRepositoriesPage(startCursor?: string): Promise<RepositoriesPage> {
    const response: RepositoriesPageResponse = await github.query(`
      query {
        viewer {
          ${ Cron.paginated(
            'repositories',
            startCursor,
            'affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]',
            `
              nameWithOwner
            `,
          ) }
        }
      }
    `);
    return response.viewer.repositories;
  }
}

export default Cron;
