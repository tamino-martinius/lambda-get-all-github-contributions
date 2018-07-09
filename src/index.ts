import Cron from './Cron';
import Storage from './Storage';

export default async (event: any, context: AWSLambda.Context) => {
  const cron = await Cron.create('tamino-martinius');
  console.log(JSON.stringify(cron.repositories));
  // const storage = await Storage.create();
  // console.log(storage);
  // console.log(await storage.writeItem('test', { foo: 'bar' }));
};
