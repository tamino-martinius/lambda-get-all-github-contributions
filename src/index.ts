import Crawler from './Crawler';
import Stats from './Stats';

export default async (event: any, context: AWSLambda.Context) => {
  const crawler = await Crawler.create('tamino-martinius');
  console.log('crawler changed?', crawler.hasChanged);
  const stats = await Stats.create(crawler);
  console.log('stats changed?', stats.hasChanged);
  return stats.hasChanged;
};
