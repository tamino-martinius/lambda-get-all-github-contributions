import Cron from './Cron';

export default async (event: any, context: AWSLambda.Context) => {
  const cron = await Cron.create();
  console.log(cron);
};
