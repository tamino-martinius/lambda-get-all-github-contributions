import Cron from './Cron';
import DB from './DB';

export default async (event: any, context: AWSLambda.Context) => {
  // const cron = await Cron.create();
  // console.log(JSON.stringify(cron.repositories));
  console.log(new DB());

};
