import Crawler from './Crawler';
import Stats from './Stats';

export default async (event: any, context: AWSLambda.Context) => {
  try {
    const crawler = await Crawler.create('tamino-martinius');
    console.log('crawler changed?', crawler.hasChanged);
    const stats = await Stats.create(crawler);
    console.log('stats changed?', Object.keys(stats.stats.repositories));
  } catch (error) {
    console.log(error);
  }
  return true;
};
