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
        history: {
          totalCount: number;
        };
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
    hasNextPage: boolean;
    endCursor: string;
  };
  nodes: Commit[];
}

export interface UserResponse {
  user: {
    id: string;
  };
}

export interface Repository {
  owner: string;
  name: string;
  rootId: string;
  count: number;
  branches: Branch[];
  commits: Commit[];
}

export interface Branch {
  name: string;
  fetched: number;
}

export interface Commit {
  oid: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  committedDate: string;
}
