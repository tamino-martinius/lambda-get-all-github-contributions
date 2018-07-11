import {
  Dict,
  GraphStats,
  StatsPosition,
} from './types';
import Storage from './Storage';
import Crawler from './Crawler';

export class Stats implements StatsPosition {
  crawler: Crawler;
  storage: Storage;
  stats: GraphStats = {
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {},
    weekDays: {},
    repositories: {},
  };
  repositoryMapping: Dict<string> = {};
  nextPrivateId: number = 1;
  processedCommits: Dict<string> = {};
  lastData?: string;
  hasChanged: boolean = false;

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
