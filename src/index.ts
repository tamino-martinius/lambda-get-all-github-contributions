import Cron from './Cron';

export default async (event: any, context: AWSLambda.Context) => {
  const cron = new Cron();
  console.log(await cron.getRepositoryNames());
};
