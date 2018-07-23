import { GitHub } from 'github-graphql-api';
import {
  Branch,
  BranchesPage,
  BranchesPageResponse,
  Commit,
  CrawlPosition,
  CrawlType,
  CrawlState,
  Dict,
  HistoryPage,
  HistoryPageResponse,
  RepositoriesPage,
  RepositoriesPageResponse,
  Repository,
  UserResponse,
} from './types';
import Storage from './Storage';

const apiToken = process.env.GITHUB_TOKEN;

if (!apiToken) throw 'please define "GITHUB_TOKEN" env variable';

const github = new GitHub({
  token: apiToken,
});

export class Crawler {
  userId: string;
  userLogin: string;
  crawlType?: CrawlType;
  repositories: Dict<Repository> = {};
  position?: CrawlPosition;
  storage: Storage;
  lastData?: string;
  hasChanged: boolean = false;

  constructor(userId: string, userLogin: string, storage: Storage) {
    this.userId = userId;
    this.userLogin = userLogin;
    this.storage = storage;
    console.log('GitHub API-Token', apiToken);
  }

  static async create(login: string): Promise<Crawler> {
    const storage = await Storage.create();
    const id = await this.getIdFromUser(login);
    const crawler = new Crawler(id, login, storage);
    await crawler.restore();
    await crawler.init();
    return crawler;
  }

  async init() {
    console.log(`Start with ${this.crawlType || 'first'} crawling`);
    if (this.crawlType !== CrawlType.Init) {
      await this.initRepositories();
      await this.initBranches();
    }
    if (this.crawlType === undefined) {
      this.crawlType = CrawlType.Init;
    }
    await this.initCommits();
    this.crawlType = CrawlType.Delta;
    this.save();
  }

  async save(position?: CrawlPosition) {
    const dataStr = JSON.stringify({
      position,
      repositories: this.repositories,
      crawlType: this.crawlType,
    });
    const hasChanged = this.lastData !== dataStr;
    if (hasChanged) {
      this.lastData = dataStr;
      await this.storage.writeItem(this.userId, dataStr);
    } else {
      console.log('skipped writing - no changes detected');
    }
    this.hasChanged = this.hasChanged || hasChanged;
    return hasChanged;
  }

  async restore() {
    const dataStr = await this.storage.readItem(this.userId);
    if (dataStr) {
      const data: CrawlState = JSON.parse(dataStr);
      this.lastData = dataStr;
      this.repositories = data.repositories;
      this.crawlType = data.crawlType;
      this.position = data.position;
    }
  }

  async initRepositories() {
    const repositories = await this.getRepositories();
    // Use cached data if matching
    for (const key in repositories) {
      const repo = this.repositories[key];
      if (repo) {
        repositories[key].commits = repo.commits;
        repositories[key].ownCommits = repo.ownCommits;
        repositories[key].branches = repo.branches;
      }
    }
    this.repositories = repositories;
  }

  async initBranches() {
    for (const repo of Object.values(this.repositories)) {
      console.log(`get branches for ${repo.key}`);
      const branches = await this.getBranches(repo);
      // console.log(branches);
      for (const branchName in branches) {
        if (repo.branches[branchName]) {
          branches[branchName].commits = repo.branches[branchName].commits;
        }
      }
      repo.branches = branches;
    }
  }

  async initCommits() {
    const hasPartialCommits = !!this.position && !!this.position.commits && !!this.position.cursor;
    for (const repoKey in this.repositories) {
      if (this.position && this.position.repoKey !== repoKey) {
        console.log(`skipping commits for ${repoKey}`);
        continue; // Skip data until reaching last crawl position
      }
      console.log(`get commits for ${repoKey}`);
      const repo = this.repositories[repoKey];
      for (const branchName in repo.branches) {
        if (this.position) {
          if (this.position.branchName === branchName) {
            // Last crawl position reached
            if (!hasPartialCommits) {
              this.position = undefined;
              console.log(`skipping commits for ${repoKey}:${branchName}`);
              continue;
            }
          } else {
            // Skip data until reaching last crawl position
            console.log(`skipping commits for ${repoKey}:${branchName}`);
            continue;
          }
        }
        const branch = repo.branches[branchName];
        console.log(`get commits for ${repoKey}:${branchName}`);

        const commits = await this.getCommits(repo, branch);
        console.log(`fetched ${Object.keys(commits).length} new commits`);

        for (const commit of commits) {
          repo.commits[commit.oid] = commit;
          if (!branch.commits.includes(commit.oid)) {
            branch.commits.push(commit.oid);
          }
          if (commit.committerId === this.userId && !repo.ownCommits.includes(commit.oid)) {
            repo.ownCommits.push(commit.oid);
          }
        }
        if (Object.keys(commits).length > 0) {
          await this.save({
            repoKey,
            branchName,
          });
        }
      }
    }
  }

  static paginated(
    resource: string,
    cursor: string | undefined,
    filter: string,
    slot: string,
    asc: boolean = true,
  ): string {
    let limit: number = 100;
    if (cursor) {
      const cursorParts = cursor.split(' ');
      if (!asc && cursorParts.length === 2) {
        limit = Math.min(100, Number.parseInt(cursorParts[1]));
      }
    }
    let pageQuery = `${asc ? 'first' : 'last'}: ${limit}`;
    if (cursor) {
      pageQuery += `, ${asc ? 'after' : 'before'}: "${cursor}"`;
    }
    if (filter) {
      pageQuery += `, ${filter}`;
    }
    return `
      ${resource}(${pageQuery}) {
        totalCount
        pageInfo {
          ${asc ? 'hasNextPage' : 'hasPreviousPage'}
          ${asc ? 'endCursor' : 'startCursor'}
        }
        nodes {
          ${slot}
        }
      }
    `;
  }

  static async getIdFromUser(login: string): Promise<string> {
    const response: UserResponse = await github.query(`
      query {
        user(login: "${login}") {
          id
        }
      }
    `);
    return response.user.id;
  }

  async getRepositories(): Promise<Dict<Repository>> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const repositories: Dict<Repository> = {};
    while (hasNextPage) {
      const repositoryPage: RepositoriesPage = await this.getRepositoriesPage(endCursor);
      hasNextPage = repositoryPage.pageInfo.hasNextPage;
      endCursor = repositoryPage.pageInfo.endCursor;
      for (const node of repositoryPage.nodes) {
        const repo: Repository = {
          owner: node.owner.login,
          name: node.name,
          isPrivate: node.isPrivate,
          key: `${node.owner.login}/${node.name}`,
          branches: {},
          commits: {},
          ownCommits: [],
          languages: node.languages.nodes.map(language => language.name),
          defaultBranchName: (node.defaultBranchRef ? node.defaultBranchRef.name : undefined),
        };
        repositories[repo.key] = repo;
      }
    }
    return repositories;
  }

  async getRepositoriesPage(cursor?: string): Promise<RepositoriesPage> {
    const page = Crawler.paginated(
      'repositories',
      cursor,
      'affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]',
      `
        name
        isPrivate
        languages(first: 5) {
          nodes {
            name
          }
        }
        owner {
          login
        }
        defaultBranchRef {
          name
        }
      `,
    );

    const response: RepositoriesPageResponse = await github.query(`
      query {
        user(login: "${this.userLogin}") {
          ${page}
        }
      }
    `);
    return response.user.repositories;
  }

  async getBranches(repo: Repository): Promise<Dict<Branch>> {
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    const branches: Dict<Branch> = {};
    while (hasNextPage) {
      const branchesPage: BranchesPage = await this.getBranchesPage(repo, endCursor);
      hasNextPage = branchesPage.pageInfo.hasNextPage;
      endCursor = branchesPage.pageInfo.endCursor;
      for (const node of branchesPage.nodes) {
        branches[node.name] = {
          name: node.name,
          count: node.target.history.totalCount,
          rootId: node.target.oid,
          commits: [],
        };
      }
    }
    return branches;
  }

  async getBranchesPage(repo: Repository, cursor?: string): Promise<BranchesPage> {
    const page = Crawler.paginated(
      'refs',
      cursor,
      `refPrefix: "refs/heads/"`,
      `
        name
        target {
          ... on Commit {
            oid
            history(author: { id: "${this.userId}" }) {
              totalCount
            }
          }
        }
      `,
    );

    const response: BranchesPageResponse = await github.query(`
      query {
        repository(owner: "${repo.owner}", name: "${repo.name}") {
          ${page}
        }
      }
    `);
    return response.repository.refs;
  }

  async getCommits(repo: Repository, branch: Branch): Promise<Commit[]> {
    let commitCount = Object.keys(branch.commits).length;
    let hasPreviousPage = commitCount < branch.count;
    let startCursor = `${branch.rootId} ${branch.count - commitCount}`;
    let commits: Commit[] = [];
    if (this.position && this.position.commits && this.position.cursor) {
      commits = this.position.commits;
      startCursor = this.position.cursor;
      this.position = undefined;
    }
    while (hasPreviousPage) {
      commitCount = commits.length;
      const historyPage: HistoryPage = await this.getHistoryPage(repo, branch.name, startCursor);
      hasPreviousPage = historyPage.pageInfo.hasPreviousPage;
      startCursor = historyPage.pageInfo.startCursor;
      commits.push(...historyPage.nodes.map(node => ({
        committerId: node.committer.user && node.committer.user.id,
        oid: node.oid,
        additions: node.additions,
        deletions: node.deletions,
        changedFiles: node.changedFiles,
        committedDate: node.committedDate,
      })));
      console.log(`${commits.length} / ${historyPage.totalCount}`);
      if (commits.length % 1000 < commitCount % 1000) {
        // Backup current status every time commit count crosses 1k mark
        await this.save({
          commits,
          repoKey: repo.key,
          branchName: branch.name,
          cursor: startCursor,
        });
      }
    }
    return commits;
  }

  async getHistoryPage(repo: Repository, branch: string, cursor: string): Promise<HistoryPage> {
    const page = Crawler.paginated(
      'history',
      cursor,
      `author: { id: "${this.userId}" }`,
      `
        committer {
          user {
            id
          }
        }
        oid
        additions
        deletions
        changedFiles
        committedDate
      `,
      false,
    );
    const query = `
      query {
        repository(owner: "${repo.owner}", name: "${repo.name}") {
          ref(qualifiedName: "${branch}") {
            target {
              ... on Commit {
                ${page}
              }
            }
          }
        }
      }
    `;
    const response: HistoryPageResponse = await github.query(query);
    if (response.repository.ref) {
      return response.repository.ref.target.history;
    }
    return {
      totalCount: 0,
      pageInfo: {
        hasPreviousPage: false,
        startCursor: '',
      },
      nodes: [],
    };
  }
}

export default Crawler;
