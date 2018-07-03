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
    nameWithOwner: string;
  }[];
}

export interface RepositoriesPageResponse {
  viewer: {
    repositories: RepositoriesPage;
  };
}

export interface ViewerResponse {
  viewer: Viewer;
}

export interface Viewer {
  id: string;
  login: string;
}

export interface Repository {
  owner: string;
  name: string;
  branches: string[];
}
