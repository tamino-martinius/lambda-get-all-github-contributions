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

  get positionId() {
    return `${ this.crawler.userId }-stats`;
  }

  get statsId() {
    return this.crawler.userLogin;
  }

  static async create(crawler: Crawler): Promise<Stats> {
    const storage = await Storage.create();
    const stats = new Stats(crawler, storage);
    await stats.restore();
    await stats.init();
    return stats;
  }

  async init() {
  }

  get position(): StatsPosition {
    return {
      stats: this.stats,
      repositoryMapping: this.repositoryMapping,
      nextPrivateId: this.nextPrivateId,
      processedCommits: this.processedCommits,
    };
  }

  async save() {
    const dataStr = JSON.stringify(this.position);
    const hasChanged = this.lastData !== dataStr;
    if (hasChanged) {
      this.lastData = dataStr;
      await this.storage.writeItem(this.positionId, dataStr);
      await this.storage.writeItem(this.statsId, JSON.stringify(this.stats));
    } else {
      console.log('skipped writing - no changes detected');
    }
    this.hasChanged = this.hasChanged || hasChanged;
    return hasChanged;
  }

  async restore() {
    const dataStr = await this.storage.readItem(this.positionId);
    if (dataStr) {
      const data: StatsPosition = JSON.parse(dataStr);
      this.lastData = dataStr;
      this.stats = data.stats;
      this.repositoryMapping = data.repositoryMapping;
      this.nextPrivateId = data.nextPrivateId;
      this.processedCommits = data.processedCommits;
    }
  }
}

export default Stats;
