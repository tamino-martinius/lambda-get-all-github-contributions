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
    owner: {
      login: string;
    };
    name: string;
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

export interface CronState {
  crawlType: CrawlType;
  repositories: Dict<Repository>;
  position?: CrawlPosition;
}
