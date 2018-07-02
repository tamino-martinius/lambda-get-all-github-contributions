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
}

console.log(apiToken);

export default async (event: any, context: AWSLambda.Context) => {
  const cron = new Cron();
};
