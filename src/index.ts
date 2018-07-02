import { GitHub } from 'github-graphql-api';
import {
  RepositoryPage,
} from './types';
const apiToken = process.env.GITHUB_TOKEN;

if (!apiToken) throw 'please define "GITHUB_TOKEN" env variable';

const github = new GitHub({
  token: apiToken,
});

class Cron {
  constructor() {
  }
  static pageQuery(startCursor?: string): string {
    let query = 'first: 100';
    if (startCursor) {
      query += `, after: "${startCursor}"`;
    }
    return query;
  }

}

console.log(apiToken);

export default async (event: any, context: AWSLambda.Context) => {
  const cron = new Cron();
};
