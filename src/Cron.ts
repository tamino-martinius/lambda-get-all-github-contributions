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

  async getRepositoryNames(): Promise<string[]> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const repositoryNames: string[] = [];
    while (hasNextPage) {
      const repositoryPage: RepositoriesPage = await this.getRepositoryPage(endCursor);
      const pageInfo = repositoryPage.viewer.repositories.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      endCursor = pageInfo.endCursor;
      const nodes = repositoryPage.viewer.repositories.nodes;
      repositoryNames.push(...nodes.map(node => node.nameWithOwner));
    }
    return repositoryNames;
  }

  static pageQuery(startCursor?: string): string {
    let query = 'first: 100';
    if (startCursor) {
      query += `, after: "${startCursor}"`;
    }
    return query;
  }

  async getRepositoryPage(startCursor?: string): Promise<RepositoriesPage> {
    return await github.query(`
      query {
        viewer{
          repositories(${Cron.pageQuery(startCursor)}) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              nameWithOwner
            }
          }
        }
      }
    `);
  }
}

export default Cron;
