export interface RepositoryPage {
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
