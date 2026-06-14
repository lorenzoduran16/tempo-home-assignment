import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { parseSinceParam } from "./src/utils/time";
import { globalCache } from "./src/utils/cache";
import { calculateRepoMetrics } from "./src/services/metricsService";
import { generateNarrative } from "./src/services/narrativeService";

dotenv.config();

const app = express();
const PORT = 3000;

// JSON parsing middleware
app.use(express.json());

/**
 * Universal query processor to normalize input parameters from both the React Dashboard
 * and direct restful API client targets (e.g., cURL, Postman).
 */
function extractQueryContext(req: express.Request) {
  let owner = req.query.owner as string | undefined;
  let repo = req.query.repo as string | undefined;
  let sinceParam = req.query.since as string | undefined;
  let untilParam = req.query.until as string | undefined;

  // Unpack single unified repo parameter (e.g. repo=owner/name)
  if (repo && repo.includes("/")) {
    const parts = repo.split("/");
    owner = parts[0].trim();
    repo = parts[1].trim();
  }

  // Parse days shorthand "30d", "7d", or ISO dates
  const sinceDate = parseSinceParam(sinceParam, 30);
  const untilDate = parseSinceParam(untilParam, 0); // Defaults to now

  return {
    owner,
    repoName: repo,
    sinceDate,
    untilDate,
    sinceISO: sinceDate.toISOString(),
    untilISO: untilDate.toISOString(),
  };
}

/**
 * Core Controller for Insights endpoint.
 * Fetches, models, compiles, and caches GitHub PR Flow and Collaboration telemetry.
 */
async function processInsights(req: express.Request, res: express.Response) {
  const { owner, repoName, sinceDate, untilDate, sinceISO, untilISO } = extractQueryContext(req);
  const userToken = req.headers["x-github-token"] as string | undefined;

  if (!owner || !repoName) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Please state the target GitHub repository (e.g., /insights?repo=facebook/react or with separate owner and repo query parameters).",
    });
  }

  // Generate generic cache key (avoiding user specific token to maximize public cache hit ratio)
  const cacheKey = `insights:${owner.toLowerCase()}:${repoName.toLowerCase()}:${sinceISO.substring(0, 10)}:${untilISO.substring(0, 10)}`;
  
  // Skip cache lookup if a custom user GitHub PAT is supplied in headers
  const cachedData = globalCache.get<any>(cacheKey);
  if (cachedData && !userToken) {
    return res.json(cachedData);
  }

  try {
    const processedMetrics = await calculateRepoMetrics(
      owner,
      repoName,
      sinceDate,
      untilDate,
      userToken
    );

    // Cache the completed compilation (5 minute TTL to protect GitHub limits while staying real-time)
    globalCache.set(cacheKey, processedMetrics, 5 * 60 * 1000);
    return res.json(processedMetrics);

  } catch (error: any) {
    console.error("[ERROR] Insights Calculation Failure:", error);

    if (error.status === 429 || error.message === "rate_limit") {
      return res.status(429).json({
        error: "Rate Limit Exceeded",
        message: "GitHub public rate limit has been reached on this instance. Please supply an optional read-only GitHub Personal Access Token (PAT) inside the UI to bypass this rate limit instantly.",
      });
    }

    if (error.status === 401 || error.message === "bad_user_token" || error.message === "bad_credentials") {
      return res.status(401).json({
        error: "Bad Credentials",
        message: "The provided GitHub Personal Access Token is invalid, has expired, or missing scope parameters. Please clear or update your token to resume compiling repository insights.",
      });
    }

    if (error.status === 404 || error.message === "not_found") {
      return res.status(404).json({
        error: "Not Found",
        message: `GitHub repository '${owner}/${repoName}' could not be located. Double-check spelling and verify it is a public repository.`,
      });
    }

    return res.status(error.status || 500).json({
      error: "Insights Compilation Error",
      message: error.message || "An unexpected error occurred during GitHub telemetry extraction.",
    });
  }
}

/**
 * Core Controller for Narrative Summary endpoint.
 * Takes compiled metrics and computes an analytical forensic narrative entirely offline.
 */
async function processNarrative(req: express.Request, res: express.Response) {
  const { owner, repoName, sinceDate, untilDate, sinceISO, untilISO } = extractQueryContext(req);
  const userToken = req.headers["x-github-token"] as string | undefined;

  if (!owner || !repoName) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Please state the target GitHub repository (e.g., /narrative?repo=facebook/react or with separate owner and repo query parameters).",
    });
  }

  const cacheKey = `narrative:${owner.toLowerCase()}:${repoName.toLowerCase()}:${sinceISO.substring(0, 10)}:${untilISO.substring(0, 10)}`;
  const cachedNarrative = globalCache.get<any>(cacheKey);
  if (cachedNarrative && !userToken) {
    return res.json(cachedNarrative);
  }

  try {
    // Attempt to pull metrics from active cache first
    const insightsKey = `insights:${owner.toLowerCase()}:${repoName.toLowerCase()}:${sinceISO.substring(0, 10)}:${untilISO.substring(0, 10)}`;
    let insightsData = globalCache.get<any>(insightsKey);

    if (!insightsData || userToken) {
      // Re-trigger calculation transitively to guarantee data availability
      insightsData = await calculateRepoMetrics(
        owner,
        repoName,
        sinceDate,
        untilDate,
        userToken
      );
      // Pre-populate insights cache
      globalCache.set(insightsKey, insightsData, 5 * 60 * 1000);
    }

    // Generate analytical narrative summary locally (free, robust, 100% reliable)
    const reportNarrative = generateNarrative(insightsData);
    
    // Save summary in cached data map
    globalCache.set(cacheKey, reportNarrative, 5 * 60 * 1000);
    return res.json(reportNarrative);

  } catch (error: any) {
    console.error("[ERROR] Narrative Compilation Failure:", error);

    if (error.status === 401 || error.message === "bad_user_token" || error.message === "bad_credentials") {
      return res.status(401).json({
        error: "Bad Credentials",
        message: "The provided GitHub Personal Access Token is invalid, expired, or holds insufficient scopes. Please clear or verify your token under 'Platform Configuration'.",
      });
    }

    return res.status(error.status || 500).json({
      error: "Narrative Synthesis Failed",
      message: error.message || "An unresolved error occurred during local narrative compiling.",
    });
  }
}

// REGISTER ENDPOINTS (Mount both standard API routers and user-specific endpoints for total compatibility)
app.get("/api/insights", processInsights);
app.get("/insights", processInsights);

app.get("/api/narrative", processNarrative);
app.get("/narrative", processNarrative);

/**
 * Dev Server Routing and static build hosting setup
 */
async function bootUpServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server middleware to handle assets in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Host compiled build files in production mode
    const buildPath = path.join(process.cwd(), "dist");
    app.use(express.static(buildPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYS] GitHub Insights Core active and listening on: http://0.0.0.0:${PORT}`);
  });
}

bootUpServer();
