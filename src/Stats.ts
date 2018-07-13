import {
  Commit,
  Dict,
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
  stats: TimeStats = Stats.emptyStats;
  repositoryMapping: Dict<string> = {};
  repositoryStats: Dict<TimeStats> = {};
  nextPrivateId: number = 1;
  processedCommits: Dict<Commit> = {};
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

  get repositoryId() {
    return `${this.crawler.userLogin}-repositories`;
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

  initWeekDay(repo: Repository, commit: Commit, weekDayStr: string, hourStr: string) {
    const repoStats = this.stats.repositories[this.repositoryMapping[repo.key]];
    this.stats.weekDays[weekDayStr] = this.stats.weekDays[weekDayStr] || Stats.emptyWeekDayStats;
    repoStats.weekDays[weekDayStr] = repoStats.weekDays[weekDayStr] || Stats.emptyWeekDayStats;
    const totals = [this.stats.weekDays[weekDayStr], repoStats.weekDays[weekDayStr]];
    for (const total of totals) {
      total.hours[hourStr] = total.hours[hourStr] || Stats.emptyTotals;
      Stats.addCommitToTotals(commit, total);
      Stats.addCommitToTotals(commit, total.hours[hourStr]);
    }
  }

  initStats() {
    for (const repoKey in this.crawler.repositories) {
      const repo = this.crawler.repositories[repoKey];
      for (const commitKey of repo.ownCommits) {
        const commit = repo.commits[commitKey];
        const date = new Date(commit.committedDate);
        const dateStr = `${ date.getFullYear() }-${ date.getMonth() }-${ date.getDate() }`;
        const monthStr = `${ date.getFullYear() }-${ date.getMonth() }`;
        const weekStr = `${ date.getFullYear() }-${ Stats.getWeekFromDate(date) }`;
        const yearStr = `${ date.getFullYear() }`;
        const weekDayStr = `${ date.getDay() }`;
        const hourStr = `${ date.getHours() }`;
        const quarterStr = `${ ~~(date.getMinutes() / 15) }`;
        this.initTimeline(repo, commit, quarterStr, 'quarterly');
        this.initTimeline(repo, commit, hourStr, 'hourly');
        this.initTimeline(repo, commit, dateStr, 'daily');
        this.initTimeline(repo, commit, weekStr, 'weekly');
        this.initTimeline(repo, commit, weekDayStr, 'weekDays');
        this.initTimeline(repo, commit, monthStr, 'monthly');
        this.initTimeline(repo, commit, yearStr, 'yearly');
        this.initWeekDay(repo, commit, weekDayStr, hourStr);
      }
    }
  }

  async init() {
    this.initRepositories();
    this.initStats();
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
