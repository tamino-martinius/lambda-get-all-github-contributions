export interface Dict<T> {
  [key: string]: T;
}

export interface RepositoriesPage {
  viewer: {
    repositories: {
      totalCount: number;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
      nodes: {
        nameWithOwner: string;
      }[];
    };
  };
}

export interface RepositoriesContributedToPage {
  viewer: {
    repositoriesContributedTo: {
      totalCount: number;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
      nodes: {
        nameWithOwner: string;
      }[];
    };
  };
}
