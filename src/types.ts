export interface Dict<T> {
  [key: string]: T;
}

export interface RepositoriesPage {
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
  nodes: {
    name: string;
    isPrivate: boolean;
    languages: {
      nodes: {
        name: string;
      }[];
    }
    owner: {
      login: string;
    };
    defaultBranchRef?: {
      name: string;
    }
  }[];
}

export interface RepositoriesPageResponse {
  user: {
    repositories: RepositoriesPage;
  };
}

export interface BranchesPageResponse {
  repository: {
    refs: BranchesPage;
  };
}

export interface BranchesPage {
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
  nodes: {
    name: string;
    target: {
      oid: string;
      history: {
        totalCount: number;
      };
    };
  }[];
}

export interface HistoryPageResponse {
  repository: {
    ref?: {
      target: {
        history: HistoryPage;
      };
    };
  };
}

export interface HistoryPage {
  totalCount: number;
  pageInfo: {
    hasPreviousPage: boolean;
    startCursor: string;
  };
  nodes: {
    committer: {
      user?: {
        id: string;
      };
    };
    oid: string;
    additions: number;
    deletions: number;
    changedFiles: number;
    committedDate: string;
  }[];
}

export interface UserResponse {
  user: {
    id: string;
  };
}

export interface Repository {
  owner: string;
  name: string;
  key: string;
  isPrivate: boolean;
  defaultBranchName?: string;
  languages: string[];
  branches: Dict<Branch>;
  commits: Dict<Commit>;
  ownCommits: string[];
}

export interface Branch {
  name: string;
  count: number;
  rootId: string;
  commits: string[];
}

export interface Commit {
  committerId?: string;
  oid: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  committedDate: string;
}

export interface CommitStats {
  isPrivate: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
  dateStr: string;
  monthStr: string;
  weekStr: string;
  yearStr: string;
  weekDayStr: string;
  hourStr: string;
  quarterStr: string;
}

export enum CrawlType {
  Init = 'init',
  Delta = 'delta',
}

export interface CrawlPosition {
  repoKey: string;
  branchName: string;
  commits?: Commit[];
  cursor?: string;
}

export interface CrawlState {
  crawlType: CrawlType;
  repositories: Dict<Repository>;
  position?: CrawlPosition;
}

export interface Counts {
  additions: number;
  deletions: number;
  changedFiles: number;
  commitCount: number;
}

export interface CommitSplit<T> {
  closed: T;
  open: T;
  sum: T;
}

export interface StatsData {
  total: CommitSplit<Counts>;
  languages: Dict<Counts>;
  weekDays: CommitSplit<Dict<WeekDayStats>>;
  dates: CommitSplit<Dict<Counts>>;
  repositories: Dict<RepositoryStats>;
}

export interface WeekDayStats extends Counts {
  hours: Dict<Counts>;
}

export interface RepositoryStats extends Counts {
  years: Dict<Counts>;
}
