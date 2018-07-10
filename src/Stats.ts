import {
} from './types';
import Storage from './Storage';
import Crawler from './Crawler';

export class Stats {
  crawler: Crawler;
  storage: Storage;

  constructor(crawler: Crawler, storage: Storage) {
    this.crawler = crawler;
    this.storage = storage;
  }

  static async create(crawler: Crawler): Promise<Stats> {
    const storage = await Storage.create();
    const stats = new Stats(crawler, storage);
    await stats.init();
    return stats;
  }

  async init() {
  }
}

export default Stats;
