export interface RepoInfo {
  owner: string;
  name: string;
  description: string;
  stars: number;
  openIssues: number;
  language: string;
  avatarUrl: string;
}

export interface ContributorMetric {
  username: string;
  name: string;
  avatarUrl: string;
  commitsCount: number;
  pullsMerged: number;
  profileUrl: string;
}

export interface ActivityTimelineItem {
  id: string;
  type: "commit" | "pull_request" | "issue";
  title: string;
  author: string;
  date: string;
  detail: string;
}

export interface RawInsights {
  repoInfo: RepoInfo;
  period: {
    since: string;
    until: string;
  };
  overallStats: {
    totalCommits: number;
    totalContributors: number;
    totalPullsMerged: number;
    avgPullTimeToMergeHours: number;
    totalIssuesClosed: number;
    avgIssueTimeToCloseHours: number;
  };
  contributors: ContributorMetric[];
  timeline: ActivityTimelineItem[];
  weeklyActivity: { date: string; commits: number }[];
  rateLimitedMock?: boolean;
}

export interface NarrativeSummary {
  narrative: string;
  confidenceScore: number;
  evidenceChain: string[];
  metricsContext: string;
}
