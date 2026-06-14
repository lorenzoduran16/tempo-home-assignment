/**
 * Resilient GitHub REST API Client
 */

export interface GitHubRepoMeta {
  name: string;
  description: string | null;
  stargazers_count: number;
  open_issues_count: number;
  language: string | null;
  owner: {
    avatar_url: string;
  };
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  requested_reviewers?: Array<{ login: string }>;
}

export interface GitHubReview {
  id: number;
  user: {
    login: string;
  };
  state: string;
}

/**
 * Executes a GitHub API request, handling rate-limiting and authorization gracefully.
 */
export async function fetchGitHubAPI<T>(
  endpoint: string,
  userToken?: string
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`;
  
  const headers: Record<string, string> = {
    "User-Agent": "github-insights-compiler",
    "Accept": "application/vnd.github+json",
  };

  const useUserToken = !!userToken;
  const token = userToken || process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  let response = await fetch(url, { headers });

  // Self-heal server token fallback if 401 Bad Credentials occurs
  if (response.status === 401 && token) {
    if (!useUserToken) {
      console.warn(`[HEAL] Global GITHUB_TOKEN invalid (401). Retrying with plain unauthenticated request: ${url}`);
      const fallbackHeaders = {
        "User-Agent": "github-insights-compiler",
        "Accept": "application/vnd.github+json",
      };
      response = await fetch(url, { headers: fallbackHeaders });
    } else {
      const err = new Error("bad_user_token");
      (err as any).status = 401;
      throw err;
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Unknown error" }));
    
    // Detect GitHub API Rate Limit Exceeded
    if (response.status === 403 && (
      response.headers.get("x-ratelimit-remaining") === "0" || 
      (errorBody.message && errorBody.message.includes("API rate limit exceeded"))
    )) {
      const err = new Error("rate_limit");
      (err as any).status = 429;
      throw err;
    }

    if (response.status === 404) {
      const err = new Error("not_found");
      (err as any).status = 404;
      throw err;
    }

    if (response.status === 401 || (errorBody.message && errorBody.message.toLowerCase().includes("bad credentials"))) {
      const err = new Error(useUserToken ? "bad_user_token" : "bad_credentials");
      (err as any).status = 401;
      throw err;
    }

    const err = new Error(errorBody.message || "GitHub API Request Failure");
    (err as any).status = response.status;
    throw err;
  }

  return response.json() as Promise<T>;
}
