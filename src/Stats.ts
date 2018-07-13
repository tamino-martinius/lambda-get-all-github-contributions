import {
  Commit,
  Dict,
  GraphStats,
  Repository,
  StatsKey,
  StatsPosition,
  Totals,
  TimeStats,
  WeekDayStats,
} from './types';
import Storage from './Storage';
import Crawler from './Crawler';

export class Stats implements StatsPosition {
  crawler: Crawler;
  storage: Storage;
  stats: GraphStats = {
    quarterly: {},
    hourly: {},
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

  static get emptyTotals(): Totals {
    return {
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      commitCount: 0,
    };
  }

  static get emptyWeekDayStats(): WeekDayStats {
    return {
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      commitCount: 0,
      hours: {},
    };
  }

  static initStats<T extends TimeStats>(stats: T) {
    stats.quarterly = {};
    stats.hourly = {};
    stats.daily = {};
    stats.weekly = {};
    stats.monthly = {};
    stats.yearly = {};
    stats.weekDays = {};
  }

  static getWeekFromDate(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  static async create(crawler: Crawler): Promise<Stats> {
    const storage = await Storage.create();
    const stats = new Stats(crawler, storage);
    await stats.restore();
    await stats.init();
    return stats;
  }

  static addCommitToTotals(commit: Commit, total: Totals) {
    total.additions += commit.additions;
    total.deletions += commit.deletions;
    total.changedFiles += commit.changedFiles;
    total.commitCount += 1;
  }

  initRepositories() {
    for (const repoKey in this.crawler.repositories) {
      if (!this.repositoryMapping[repoKey]) {
        const repo = this.crawler.repositories[repoKey];
        if (repo.isPrivate) {
          const privateKey = `${ repo.owner }/private#${ this.nextPrivateId }`;
          this.nextPrivateId += 1;
          this.repositoryMapping[repoKey] = privateKey;
          this.repositoryMapping[privateKey] = repoKey;
          this.stats.repositories[privateKey] =
            this.stats.repositories[privateKey] || Stats.emptyTotals;
        } else {
          this.repositoryMapping[repoKey] = repoKey;
          this.stats.repositories[repoKey] =
            this.stats.repositories[repoKey] || Stats.emptyTotals;
        }
      }
    }
  }

  initTimeline(repo: Repository, commit: Commit, key: string, statsKey: StatsKey) {
    const repoStats = this.stats.repositories[this.repositoryMapping[repo.key]];
    this.stats[statsKey][key] = this.stats[statsKey][key] || Stats.emptyTotals;
    repoStats[statsKey][key] = repoStats[statsKey][key] || Stats.emptyTotals;
    const totals = [this.stats[statsKey][key], repoStats[statsKey][key]];
    for (const total of totals) {
      Stats.addCommitToTotals(commit, total);
    }
  }

  async init() {
    await this.initRepositoryMapping();
    await this.save();
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
