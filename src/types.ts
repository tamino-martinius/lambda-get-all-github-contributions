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
