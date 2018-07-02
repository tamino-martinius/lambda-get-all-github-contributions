import { GitHub } from 'github-graphql-api';
import {
  RepositoriesPage,
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

  async getRepositoryNames(): Promise<string[]> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const repositoryNames: string[] = [];
    while (hasNextPage) {
      const repositoryPage: RepositoriesPage = await this.getRepositoriesPage(endCursor);
      const pageInfo = repositoryPage.viewer.repositories.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      endCursor = pageInfo.endCursor;
      const nodes = repositoryPage.viewer.repositories.nodes;
      repositoryNames.push(...nodes.map(node => node.nameWithOwner));
    }
    return repositoryNames;
  }

  async getRepositoriesPage(
    startCursor?: string,
  ): Promise<RepositoriesPage> {
    return await github.query(`
      query {
        viewer{
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
  }
}

export default Cron;
