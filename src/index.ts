import Crawler from './Crawler';
import Stats from './Stats';

export default async (event: any, context: AWSLambda.Context) => {
  const crawler = await Crawler.create('tamino-martinius');
  const stats = await Stats.create(crawler);
  // console.log(stats);
  return crawler.crawlType;
};
