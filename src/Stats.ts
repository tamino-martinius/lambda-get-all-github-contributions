import {
  Commit,
  Dict,
  Repository,
  Counts,
  StatsData,
  WeekDayStats,
  CommitStats,
  RepositoryStats,
} from './types';
import Storage from './Storage';
import Crawler from './Crawler';

export class Stats {
  crawler: Crawler;
  storage: Storage;
  stats: StatsData = {
    total: {
      closed: Stats.emptyCounts,
      open: Stats.emptyCounts,
      sum: Stats.emptyCounts,
    },
    languages: {},
    weekDays: {
      closed: {},
      open: {},
      sum: {},
    },
    dates: {
      closed: {},
      open: {},
      sum: {},
    },
    repositories: {},
  };
  nextPrivateId: number = 0;

  constructor(crawler: Crawler, storage: Storage) {
    this.crawler = crawler;
    this.storage = storage;
  }

  get statsId() {
    return this.crawler.userLogin;
  }

  static get emptyCounts(): Counts {
    return {
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      commitCount: 0,
    };
  }

  static get emptyWeekDay(): WeekDayStats {
    return {
      ...this.emptyCounts,
      hours: {},
    };
  }

  static get emptyRepository(): RepositoryStats {
    return {
      ...this.emptyCounts,
      years: {},
    };
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
    await stats.init();
    return stats;
  }

  static addCommitToCounts(commit: Commit, total: Counts) {
    total.additions += commit.additions;
    total.deletions += commit.deletions;
    total.changedFiles += commit.changedFiles;
    total.commitCount += 1;
  }

  static addCounts(total: Counts, commit: CommitStats) {
    total.additions += commit.additions;
    total.deletions += commit.deletions;
    total.changedFiles += commit.changedFiles;
    total.commitCount += 1;
  }

  static getCommitStats(repo: Repository, commit: Commit): CommitStats {
    const date = new Date(commit.committedDate);
    return {
      additions: commit.additions,
      deletions: commit.deletions,
      changedFiles: commit.changedFiles,
      isPrivate: repo.isPrivate,
      dateStr: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      monthStr: `${date.getFullYear()}-${date.getMonth()}`,
      weekStr: `${date.getFullYear()}-${Stats.getWeekFromDate(date)}`,
      yearStr: `${date.getFullYear()}`,
      weekDayStr: `${date.getDay()}`,
      hourStr: `${date.getHours()}`,
      quarterStr: `${date.getHours()}-${~~(date.getMinutes() / 15)}`,
    };
  }

  addRepo(name: string, commit: CommitStats) {
    this.stats.repositories[name] = this.stats.repositories[name] || Stats.emptyRepository;
    const repo = this.stats.repositories[name];
    Stats.addCounts(repo, commit);

    const year = commit.yearStr;
    repo.years[year] = repo.years[year] || Stats.emptyCounts;
    Stats.addCounts(repo.years[year], commit);
  }

  addLanguage(language: string, commit: CommitStats) {
    this.stats.languages[language] = this.stats.languages[language] || Stats.emptyCounts;
    Stats.addCounts(this.stats.languages[language], commit);
  }

  addCommitToCounts(commit: CommitStats) {
    const { closed, open, sum } = this.stats.total;
    Stats.addCounts(commit.isPrivate ? closed : open, commit);
    Stats.addCounts(sum, commit);
  }

  addCommitToWeekDays(commit: CommitStats) {
    const { closed, open, sum } = this.stats.weekDays;
    const wd = commit.weekDayStr;
    closed[wd] = closed[wd] || Stats.emptyWeekDay;
    open[wd] = open[wd] || Stats.emptyWeekDay;
    sum[wd] = sum[wd] || Stats.emptyWeekDay;
    Stats.addCounts(commit.isPrivate ? closed[wd] : open[wd], commit);
    Stats.addCounts(sum[wd], commit);

    const hour = commit.hourStr;
    closed[wd].hours[hour] = closed[wd].hours[hour] || Stats.emptyCounts;
    open[wd].hours[hour] = open[wd].hours[hour] || Stats.emptyCounts;
    sum[wd].hours[hour] = sum[wd].hours[hour] || Stats.emptyCounts;
    Stats.addCounts(commit.isPrivate ? closed[wd].hours[hour] : open[wd].hours[hour], commit);
    Stats.addCounts(sum[wd].hours[hour], commit);
  }

  addCommitToDates(commit: CommitStats) {
    const { closed, open, sum } = this.stats.dates;
    const date = commit.dateStr;
    closed[date] = closed[date] || Stats.emptyCounts;
    open[date] = open[date] || Stats.emptyCounts;
    sum[date] = sum[date] || Stats.emptyCounts;
    Stats.addCounts(commit.isPrivate ? closed[date] : open[date], commit);
    Stats.addCounts(sum[date], commit);
  }

  addCommit(commit: CommitStats) {
    this.addCommitToCounts(commit);
    this.addCommitToWeekDays(commit);
    this.addCommitToDates(commit);
  }

  async init() {
    for (const repoKey in this.crawler.repositories) {
      console.log(`Init stats for ${repoKey}`);
      const repo = this.crawler.repositories[repoKey];
      const name = repo.isPrivate ? `${repo.owner}/private#${this.nextPrivateId += 1}` : repoKey;
      for (const commitKey of repo.ownCommits) {
        const commit = Stats.getCommitStats(repo, repo.commits[commitKey]);
        this.addCommit(commit);
        this.addRepo(name, commit);
        for (const language of repo.languages) {
          this.addLanguage(language, commit);
        }
      }
    }
    await this.save();
  }

  async save() {
    console.log(`Save stats`);
    return await this.storage.writeItem(this.statsId, JSON.stringify(this.stats));
  }
}

export default Stats;
