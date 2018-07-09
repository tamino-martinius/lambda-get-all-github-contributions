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
    defaultBranchRef :{
      target: {
        oid: string;
      };
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
      history: {
        totalCount: number;
      };
    };
  }[];
}

export interface HistoryPageResponse {
  repository: {
    ref: {
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
  rootId: string;
  branches: Dict<Branch>;
  ownCommits: Dict<Commit>;
}

export interface Branch {
  name: string;
  count: number;
  commits: Dict<Commit>;
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

export interface CronState {
  crawlType: CrawlType;
  repositories: Dict<Repository>;
  position?: {
    repoKey: string;
    branchName: string;
  };
}
