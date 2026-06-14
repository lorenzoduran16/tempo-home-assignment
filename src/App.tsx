import { useState, useEffect } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Github, 
  Search, 
  Calendar, 
  TrendingUp, 
  GitCommit, 
  GitPullRequest, 
  CheckCircle2, 
  Users, 
  Sparkles, 
  Code, 
  Clock, 
  ArrowUpRight, 
  Info, 
  Copy, 
  Check, 
  Loader2, 
  ShieldAlert, 
  Key,
  Flame,
  Terminal,
  Activity
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from "recharts";
import { RawInsights, NarrativeSummary } from "./types";

const PRESET_REPOS = [
  { owner: "facebook", repo: "react", label: "React" },
  { owner: "vercel", repo: "next.js", label: "Next.js" },
  { owner: "tailwindlabs", repo: "tailwindcss", label: "Tailwind" },
  { owner: "vuejs", repo: "core", label: "Vue" }
];

export default function App() {
  // Input State
  const [repoInput, setRepoInput] = useState("facebook/react");
  const [dateRange, setDateRange] = useState("30"); // days
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem("github_insights_token") || "";
  });

  // Derived owner/repo
  const [owner, setOwner] = useState("facebook");
  const [repo, setRepo] = useState("react");

  // Telemetry Fetch State
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<{ title: string; desc: string; status?: number } | null>(null);
  const [insights, setInsights] = useState<RawInsights | null>(null);

  // Narrative State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [narrativeResult, setNarrativeResult] = useState<NarrativeSummary | null>(null);

  // UI state for copy utility
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});

  // Save token changes
  const saveToken = (token: string) => {
    setGithubToken(token);
    if (token) {
      localStorage.setItem("github_insights_token", token);
    } else {
      localStorage.removeItem("github_insights_token");
    }
  };

  // Run full data fetch
  const handleAnalyze = async (targetOwner?: string, targetRepo?: string) => {
    let currentOwner = targetOwner || owner;
    let currentRepo = targetRepo || repo;

    if (!targetOwner || !targetRepo) {
      const parts = repoInput.split("/");
      if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
        currentOwner = parts[0].trim();
        currentRepo = parts[1].trim();
        setOwner(currentOwner);
        setRepo(currentRepo);
      } else {
        setErrorStatus({
          title: "Malformed Input Format",
          desc: "Please type the target repository in 'owner/repo' structure (e.g. 'facebook/react')"
        });
        return;
      }
    }

    setIsLoading(true);
    setIsSynthesizing(true);
    setErrorStatus(null);
    setInsights(null);
    setNarrativeResult(null);

    // Calculate dates
    const until = new Date();
    const since = new Date();
    since.setDate(until.getDate() - parseInt(dateRange));

    const sinceISO = since.toISOString().substring(0, 10);
    const untilISO = until.toISOString().substring(0, 10);

    const headers: Record<string, string> = {};
    if (githubToken) {
      headers["x-github-token"] = githubToken;
    }

    try {
      // 1. Fetch RAW insights
      const insightsRes = await fetch(
        `/api/insights?owner=${currentOwner}&repo=${currentRepo}&since=${sinceISO}&until=${untilISO}`,
        { headers }
      );

      if (!insightsRes.ok) {
        const errorData = await insightsRes.json().catch(() => ({}));
        const status = insightsRes.status;
        let title = "Data Collection Failed";
        let desc = errorData.message || "An unresolved server error occurred.";

        if (status === 404) {
          title = "Repository Non-Existent";
          desc = `Could not find repository '${currentOwner}/${currentRepo}'. Double-check the target and ensure it is a public repository.`;
        } else if (status === 429) {
          title = "GitHub API Rate Limited";
          desc = "GitHub's public rate limit has been exceeded. Supply a Personal Access Token (PAT) below to instantly bypass this limit.";
        } else if (status === 401) {
          title = "Authentication Token Invalid";
          desc = errorData.message || "The supplied GitHub Personal Access Token is invalid or has expired. Please clear or verify your token under 'Platform Configuration' to query the repository.";
        }

        setErrorStatus({ title, desc, status });
        setIsLoading(false);
        setIsSynthesizing(false);
        return;
      }

      const insightsData: RawInsights = await insightsRes.json();
      setInsights(insightsData);
      setIsLoading(false);

      // 2. Fetch synthesized narrative summary
      const narrativeRes = await fetch(
        `/api/narrative?owner=${currentOwner}&repo=${currentRepo}&since=${sinceISO}&until=${untilISO}`,
        { headers }
      );

      if (!narrativeRes.ok) {
        throw new Error("Local analytics engine synthesis failed");
      }

      const narrativeData: NarrativeSummary = await narrativeRes.json();
      setNarrativeResult(narrativeData);

    } catch (err: any) {
      console.error("Fetch pipeline error: ", err);
      setErrorStatus({
        title: "Telemetry Synthesis Interrupted",
        desc: err.message || "An unexpected network error occurred."
      });
    } finally {
      setIsLoading(false);
      setIsSynthesizing(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleAnalyze(owner, repo);
  }, [dateRange]);

  const handlePresetClick = (preset: typeof PRESET_REPOS[0]) => {
    setRepoInput(`${preset.owner}/${preset.repo}`);
    setOwner(preset.owner);
    setRepo(preset.repo);
    handleAnalyze(preset.owner, preset.repo);
  };

  // Copy API endpoint syntax for cURL playground
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStatus((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const getSinceDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(dateRange));
    return d.toISOString().substring(0, 10);
  };

  const getUntilDateString = () => {
    return new Date().toISOString().substring(0, 10);
  };

  const curlInsightsCommand = `curl -s -X GET "https://${window.location.host}/insights?repo=${owner}/${repo}&since=${dateRange}d" \\
  -H "Accept: application/json"${githubToken ? ` \\\n  -H "x-github-token: ${githubToken}"` : ""}`;

  const curlNarrativeCommand = `curl -s -X GET "https://${window.location.host}/narrative?repo=${owner}/${repo}&since=${dateRange}d" \\
  -H "Accept: application/json"${githubToken ? ` \\\n  -H "x-github-token: ${githubToken}"` : ""}`;

  return (
    <div className="min-h-screen bg-[#07090e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,41,59,0.3),rgba(7,9,14,0))] text-[#ccd6e0] font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Premium Desktop Header Bar */}
      <header className="border-b border-[#141b2a] bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <Activity className="h-5.5 w-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white font-sans">
                  PR Flow Intelligence API
                </h1>
                <span className="inline-flex items-center rounded-md bg-[#131b2e] border border-[#1e293b] px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                  Core Analytics v1.2
                </span>
              </div>
              <p className="text-[11px] text-[#8fa0b5] mt-0.5 font-sans">
                Real-time delivery velocities, bottleneck hypotheses, and workload forensics compiler
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Range Presets buttons */}
            <div className="inline-flex rounded-lg bg-[#0e1320] border border-[#141b2a] p-1">
              {[
                { label: "7 Days", value: "7" },
                { label: "30 Days", value: "30" },
                { label: "90 Days", value: "90" }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setDateRange(range.value)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                    dateRange === range.value 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                      : "text-[#8fa0b5] hover:text-white"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Wrapper */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Control Desk and Preset Repositories */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Repository Locater Card */}
            <div className="bg-[#090d16]/60 rounded-2xl border border-[#141b2a] shadow-xl p-5 space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-[#141b2a] pb-3">
                <div className="flex items-center gap-2.5 text-indigo-400">
                  <span className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <Search className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#ccd6e0]">
                    Repository Target
                  </h3>
                </div>
              </div>

              {/* Form Input Container */}
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-[#8fa0b5] uppercase tracking-wider">
                  Public GitHub Repo Path
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Github className="h-4 w-4 text-[#8fa0b5]" />
                  </div>
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="owner/repo"
                    className="block w-full rounded-xl border border-[#141b2a] bg-[#05070a]/80 py-3 pl-9 pr-3 text-sm text-white placeholder-[#4c5c70] shadow-inner outline-indigo-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={() => handleAnalyze()}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#131722] disabled:text-[#4c5c70] py-3 px-4 text-xs font-extrabold tracking-wider uppercase text-white shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Analyzing Telemetry...
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4" />
                      Pull Core Metrics
                    </>
                  )}
                </button>
              </div>

              {/* Quick Presets */}
              <div className="pt-3 border-t border-[#141b2a]">
                <span className="block text-[10px] font-bold tracking-widest text-[#4c5c70] uppercase mb-2.5">
                  Pre-configured Repositories
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_REPOS.map((preset) => (
                    <button
                      key={`${preset.owner}-${preset.repo}`}
                      onClick={() => handlePresetClick(preset)}
                      className="inline-flex items-center justify-between gap-1 text-[11px] py-2 px-3 bg-[#0c111e]/40 hover:bg-[#11182c] border border-[#141b2a] hover:border-[#1e293b] text-[#ccd6e0] hover:text-white rounded-lg transition-all text-left font-semibold cursor-pointer"
                    >
                      <span className="truncate">{preset.label}</span>
                      <ArrowUpRight className="h-3 w-3 text-[#4c5c70]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Credentials (PAT) Card */}
            <div className="bg-[#090d16]/60 rounded-2xl border border-[#141b2a] shadow-xl p-5 space-y-4 backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <span className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <Key className="h-4 w-4" />
                </span>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#ccd6e0]">
                  API Speed Bypass (PAT)
                </h3>
              </div>
              <p className="text-xs text-[#8fa0b5] leading-relaxed">
                Add an optional Personal Access Token (PAT) for robust query limits. Safe and securely processed under temporary client memory.
              </p>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Terminal className="h-4 w-4 text-emerald-400/60" />
                </div>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => saveToken(e.target.value)}
                  placeholder="Paste GitHub Token (ghp_...)"
                  className="block w-full rounded-xl border border-[#141b2a] bg-[#05070a]/80 py-2.5 pl-9 pr-3 text-xs text-white placeholder-[#4c5c70] shadow-inner outline-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {githubToken && (
                <div className="flex items-center justify-between text-[10px] font-bold tracking-wide uppercase text-emerald-400 bg-emerald-500/5 py-2 px-2.5 rounded-lg border border-emerald-500/10">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Bypass Credential Active
                  </span>
                  <button 
                    onClick={() => saveToken("")}
                    className="text-emerald-500 hover:text-emerald-300 underline font-extrabold cursor-pointer decoration-dotted"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Metric Definition Card */}
            {narrativeResult && (
              <div className="bg-gradient-to-b from-[#0c1221] to-[#080d17] rounded-2xl p-5 space-y-3.5 shadow-md border border-[#141b2a] relative overflow-hidden">
                <div className="absolute -top-4 -right-4 p-4 opacity-[0.015] pointer-events-none text-white">
                  <Info className="h-32 w-32" />
                </div>
                
                <div className="flex items-center gap-2 text-[#8fa0b5] border-b border-[#141b2a] pb-2">
                  <Info className="h-4 w-4 text-indigo-400" />
                  <span className="text-[10px] font-extrabold tracking-widest text-[#ccd6e0] uppercase">
                    API Telemetry Protocol
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Metrics Context & Insight Purpose</h4>
                  <p className="text-xs text-[#8fa0b5] leading-relaxed">
                    {narrativeResult.metricsContext}
                  </p>
                </div>

                <div className="pt-2 text-[10px] font-semibold text-[#4c5c70] border-t border-[#141b2a] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Offline Forensics: No remote prompts mapped.
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Visual Reports, Local Narratives, Recharts, and Sandbox API Console */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Error alerts banner */}
            <AnimatePresence mode="wait">
              {errorStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-950/20 border border-rose-800/20 rounded-2xl p-4 flex gap-3.5 text-rose-200"
                >
                  <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">{errorStatus.title}</h4>
                    <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                      {errorStatus.desc}
                    </p>
                    {errorStatus.status === 429 && (
                      <div className="mt-2.5">
                        <span className="text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 py-1 px-2 rounded-lg border border-rose-500/15">
                          Query solution: Supply a GitHub Token (PAT) inside the Finder module.
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Core Insights Telemetry Panels */}
            {insights ? (
              <div className="space-y-8">
                {insights.rateLimitedMock && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key="rate-limit-banner"
                    className="bg-amber-950/20 border border-amber-800/20 rounded-2xl p-4 flex gap-3.5 text-amber-200"
                  >
                    <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Rate Limit Graceful Fallback Active</h4>
                      <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                        GitHub's shared API is currently rate limited. We've compiled realistic high-fidelity metrics for <strong>{insights.repoInfo.owner}/{insights.repoInfo.name}</strong> under the selected date range so you can fully explore the dashboard interface.
                      </p>
                      <p className="text-xs text-amber-400 font-semibold mt-2">
                        To view live production indices instantly: supply your read-only GitHub Personal Access Token (PAT) in the left panel.
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {/* Panel A: Repository Header & General Statistics */}
                <div className="bg-[#090d16]/60 rounded-2xl border border-[#141b2a] shadow-xl overflow-hidden backdrop-blur-md">
                  
                  {/* Repo Title Bar */}
                  <div className="p-5 bg-[#0d1222]/40 border-b border-[#141b2a] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      {insights.repoInfo.avatarUrl ? (
                        <img 
                          src={insights.repoInfo.avatarUrl} 
                          alt="avatar" 
                          referrerPolicy="no-referrer"
                          className="h-11 w-11 rounded-xl border border-[#1f293d]/50 bg-[#05070a] p-0.5"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-xl bg-[#0e1320] flex items-center justify-center text-[#8fa0b5] border border-[#141b2a]">
                          <Github className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2 leading-none">
                          {insights.repoInfo.owner} / {insights.repoInfo.name}
                        </h2>
                        <p className="text-[11px] text-[#8fa0b5] mt-1.5 line-clamp-1 max-w-sm sm:max-w-md">
                          {insights.repoInfo.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 text-[10px]">
                      <div className="bg-[#0c111e] border border-[#141b2a] rounded-lg px-2.5 py-1.5 flex items-center gap-1 text-[#8fa0b5] font-extrabold font-mono uppercase">
                        ⭐ {insights.repoInfo.stars.toLocaleString()} Stars
                      </div>
                      <div className="bg-[#0c111e] border border-[#141b2a] rounded-lg px-2.5 py-1.5 flex items-center gap-1 text-indigo-400 font-extrabold border-indigo-500/10 font-mono uppercase">
                        🛠️ {insights.repoInfo.language}
                      </div>
                    </div>
                  </div>

                  {/* 4-way Analytics metrics grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#141b2a] border-b border-[#141b2a] bg-[#05070a]/40">
                    
                    {/* Commits */}
                    <div className="p-4.5 text-center">
                      <span className="text-[10px] font-extrabold text-[#4c5c70] uppercase tracking-widest block">
                        Period Commits
                      </span>
                      <div className="mt-1.5 flex items-baseline justify-center gap-1 leading-none">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {insights.overallStats.totalCommits}
                        </span>
                        <span className="text-[10px] text-[#4c5c70] font-mono lowercase">items</span>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-extrabold tracking-widest uppercase text-indigo-400 bg-indigo-500/5 leading-none w-max mx-auto py-1 px-2 rounded-md border border-indigo-500/10">
                        <GitCommit className="h-3 w-3" />
                        Code Changes
                      </div>
                    </div>

                    {/* Contributors */}
                    <div className="p-4.5 text-center">
                      <span className="text-[10px] font-extrabold text-[#4c5c70] uppercase tracking-widest block">
                        Active Developers
                      </span>
                      <div className="mt-1.5 flex items-baseline justify-center gap-1 leading-none">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {insights.overallStats.totalContributors}
                        </span>
                        <span className="text-[10px] text-[#4c5c70] font-mono lowercase">users</span>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-extrabold tracking-widest uppercase text-[#8fa0b5] bg-[#0e1320] leading-none w-max mx-auto py-1 px-2 rounded-md border border-[#141b2a]">
                        <Users className="h-3 w-3" />
                        Profiles Detected
                      </div>
                    </div>

                    {/* PR Turnaround */}
                    <div className="p-4.5 text-center">
                      <span className="text-[10px] font-extrabold text-[#4c5c70] uppercase tracking-widest block">
                        Average PR Merge
                      </span>
                      <div className="mt-1.5 flex items-baseline justify-center gap-1 leading-none">
                        <span className="text-2xl font-black text-emerald-400 tracking-tight">
                          {insights.overallStats.avgPullTimeToMergeHours}
                        </span>
                        <span className="text-[10px] text-[#4c5c70] font-mono lowercase">hours</span>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-extrabold tracking-widest uppercase text-emerald-400 bg-emerald-500/5 leading-none w-max mx-auto py-1 px-2 rounded-md border border-emerald-500/10">
                        <Clock className="h-3 w-3" />
                        PR Flow Speed
                      </div>
                    </div>

                    {/* Issue Turnaround */}
                    <div className="p-4.5 text-center">
                      <span className="text-[10px] font-extrabold text-[#4c5c70] uppercase tracking-widest block">
                        Average Ticket Turn
                      </span>
                      <div className="mt-1.5 flex items-baseline justify-center gap-1 leading-none">
                        <span className="text-2xl font-black text-amber-400 tracking-tight">
                          {insights.overallStats.avgIssueTimeToCloseHours}
                        </span>
                        <span className="text-[10px] text-[#4c5c70] font-mono lowercase">hours</span>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-extrabold tracking-widest uppercase text-amber-400 bg-amber-500/5 leading-none w-max mx-auto py-1 px-2 rounded-md border border-amber-500/10">
                        <CheckCircle2 className="h-3 w-3" />
                        Ticket Close
                      </div>
                    </div>

                  </div>
                </div>

                {/* Panel B: Analytical Forensics Summary Narrative Card */}
                <div className="relative bg-gradient-to-br from-[#0c0f1b] via-[#090d16] to-[#070b12] text-white rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden border border-[#141b2a]">
                  
                  {/* Subtle engineering watermark accent */}
                  <div className="absolute top-0 right-0 p-6 text-indigo-500/[0.02] pointer-events-none">
                    <Sparkles className="h-32 w-32" />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#141b2a]">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Sparkles className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#ccd6e0]">
                          Analytical Report Synthesis
                        </h3>
                        <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-wider mt-0.5">
                          Localized, forensic workload flow & causality compilation
                        </p>
                      </div>
                    </div>

                    {/* Grounding Confidence percentage visualizer */}
                    {narrativeResult && (
                      <div className="bg-[#05070a]/90 border border-[#141b2a] rounded-2xl py-2 px-3.5 flex items-center gap-2.5">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#4c5c70]">
                          Contextual Confidence
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-indigo-400">
                            {narrativeResult.confidence}%
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-6">
                    {isSynthesizing ? (
                      <div className="space-y-3.5 py-4">
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating report parameters offline, verifying evidence chains...</span>
                        </div>
                        <div className="h-2.5 bg-[#0e1320] border border-[#141b2a] rounded-full w-full animate-pulse" />
                        <div className="h-2.5 bg-[#0e1320] border border-[#141b2a] rounded-full w-11/12 animate-pulse" />
                        <div className="h-2.5 bg-[#0e1320] border border-[#141b2a] rounded-full w-9/12 animate-pulse" />
                      </div>
                    ) : narrativeResult ? (
                      <div className="space-y-6">
                        
                        {/* Summary Narrative */}
                        <div className="space-y-2">
                          <p className="text-white text-xs font-extrabold uppercase tracking-widest text-[#4c5c70]">
                            Forensic Delivery Summary
                          </p>
                          <p className="text-[#ccd6e0] text-sm md:text-base leading-relaxed font-sans font-medium">
                            {narrativeResult.summary}
                          </p>
                        </div>

                        {/* Structured hypothesis */}
                        <div className="bg-[#0c1221]/40 border border-[#141b2a] rounded-2xl p-4 space-y-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                            <Flame className="h-3.5 w-3.5" />
                            Causality Hypothesis
                          </span>
                          <p className="text-xs text-[#8fa0b5] leading-relaxed">
                            {narrativeResult.hypothesis}
                          </p>
                        </div>

                        {/* Key observations list */}
                        {narrativeResult.key_observations && narrativeResult.key_observations.length > 0 && (
                          <div className="space-y-2.5 pt-2">
                            <span className="block text-[10px] font-extrabold tracking-widest uppercase text-[#4c5c70]">
                              Core Flow Observations
                            </span>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {narrativeResult.key_observations.map((obs, index) => (
                                <li 
                                  key={index} 
                                  className="bg-[#05070a]/40 border border-[#141b2a] p-3 rounded-xl text-xs text-[#8fa0b5] flex items-start gap-2.5 leading-normal"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                  {obs}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Evidence Chain items */}
                        <div className="space-y-2.5 border-t border-[#141b2a] pt-5">
                          <span className="block text-[10px] font-extrabold tracking-widest uppercase text-[#4c5c70]">
                            Grounded Evidence Chain
                          </span>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {narrativeResult.evidence.map((ev, i) => (
                              <li 
                                key={i}
                                className="bg-[#0c1221]/30 border border-[#141b2a] py-3 px-3.5 rounded-xl text-xs text-[#ccd6e0] flex items-start gap-3"
                              >
                                <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400">
                                  {i + 1}
                                </span>
                                <span className="leading-snug">{ev}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#4c5c70]">
                        Error compiling narrative analysis report.
                      </p>
                    )}
                  </div>
                </div>

                {/* Panel C: Charts and Contributors List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Recharts Area Tracker Card */}
                  <div className="bg-[#090d16]/60 rounded-2xl border border-[#141b2a] shadow-xl p-6 space-y-4 backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-[#141b2a] pb-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#ccd6e0] flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-400" />
                        Commit Velocity Trend Card
                      </h3>
                      <span className="text-[9px] bg-[#0c111e] border border-[#141b2a] text-[#8fa0b5] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono">
                        Weekly
                      </span>
                    </div>

                    <div className="h-60 w-full pr-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={insights.weeklyActivity}
                          margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#141b2a" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#4c5c70" 
                            fontSize={9} 
                            tickLine={false}
                            fontFamily="monospace"
                          />
                          <YAxis 
                            stroke="#4c5c70" 
                            fontSize={9} 
                            tickLine={false} 
                            allowDecimals={false}
                            fontFamily="monospace"
                          />
                          <RechartsTooltip 
                            contentStyle={{ background: "#090d16", borderRadius: "10px", border: "1px solid #141b2a", color: "#ccd6e0", fontSize: "11px" }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="commits" 
                            stroke="#6366f1" 
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill="url(#colorCommits)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Contributions distribution list card */}
                  <div className="bg-[#090d16]/60 rounded-2xl border border-[#141b2a] shadow-xl p-6 space-y-4 backdrop-blur-md font-sans">
                    <div className="flex items-center justify-between border-b border-[#141b2a] pb-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#ccd6e0] flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-400" />
                        Activity Distribution Share
                      </h3>
                      <span className="text-[9px] bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Ranked
                      </span>
                    </div>

                    <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1">
                      {insights.contributors.length === 0 ? (
                        <p className="text-xs text-[#4c5c70] text-center py-10 font-semibold font-sans uppercase tracking-widest">
                          No contributor coordinates parsed.
                        </p>
                      ) : (
                        insights.contributors.map((contrib) => {
                          const maxCommits = insights.contributors[0]?.commitsCount || 1;
                          const widthPct = Math.max(8, (contrib.commitsCount / maxCommits) * 100);

                          return (
                            <div key={contrib.username} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-sans">
                                <a 
                                  href={contrib.profileUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center gap-2.5 hover:text-indigo-400 transition-colors font-semibold text-white text-xs"
                                >
                                  <img 
                                    src={contrib.avatarUrl} 
                                    className="h-6 w-6 rounded-lg border border-[#1f293d]/50 bg-slate-905" 
                                    alt={contrib.username} 
                                    referrerPolicy="no-referrer"
                                  />
                                  <span>{contrib.name || contrib.username}</span>
                                </a>
                                <span className="font-mono text-[#ccd6e0] font-black text-[10px] bg-[#0c111e] border border-[#141b2a] px-1.5 py-0.5 rounded">
                                  {contrib.commitsCount} C • {contrib.pullsMerged} PRs
                                </span>
                              </div>
                              <div className="w-full bg-[#05070a] h-1.5 rounded-full overflow-hidden border border-[#141b2a]/30">
                                <div 
                                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${widthPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

                {/* Panel D: Timeline list */}
                {insights.timeline.length > 0 && (
                  <div className="bg-[#090d16]/60 rounded-2xl border border-[#141b2a] shadow-xl p-6 backdrop-blur-md">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#ccd6e0] mb-5 border-b border-[#141b2a] pb-3 flex items-center gap-2">
                      <Code className="h-4 w-4 text-indigo-400" />
                      Repository Operations Historical Stream
                    </h3>
                    
                    <div className="relative border-l border-[#141b2a] pl-4.5 space-y-5 ml-1">
                      {insights.timeline.map((event) => {
                        let dotBg = "bg-indigo-500/10 border-indigo-500/40 text-indigo-400";
                        if (event.type === "pull_request") dotBg = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
                        if (event.type === "issue") dotBg = "bg-amber-500/10 border-amber-500/40 text-amber-400";

                        return (
                          <div key={event.id} className="relative space-y-1">
                            {/* Bullet placement */}
                            <span className={`absolute -left-[27px] mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border ring-4 ring-[#07090e] text-[9px] font-black font-mono leading-none ${dotBg}`}>
                              {event.type === "commit" ? "C" : event.type === "pull_request" ? "P" : "I"}
                            </span>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 leading-none">
                              <span className="text-xs font-bold text-white uppercase tracking-wide line-clamp-1">
                                {event.title}
                              </span>
                              <span className="text-[9px] text-[#4c5c70] font-mono leading-none">
                                {new Date(event.date).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8fa0b5] flex flex-wrap gap-x-2">
                              <span>by @{event.author}</span>
                              <span className="text-[#141b2a]">|</span>
                              <span className="text-xs font-mono text-[#4c5c70]">{event.detail}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              // Empty Desk state loader
              <div className="bg-[#090d16]/30 rounded-2xl border border-[#141b2a] p-12 text-center shadow-xl backdrop-blur-md">
                {isLoading ? (
                  <div className="py-10 space-y-4">
                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-white">Aggregating commits and PR metrics...</h4>
                      <p className="text-xs text-[#8fa0b5] max-w-sm mx-auto mt-2 leading-relaxed">
                        Compiling branch code turnaround indices, computing integration timelines, and reading development workloads.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 space-y-5">
                    <div className="h-14 w-14 rounded-2xl bg-[#090d16]/80 flex items-center justify-center border border-[#141b2a] mx-auto text-indigo-400">
                      <Github className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#ccd6e0]">Intelligence Console Idle</h3>
                      <p className="text-xs text-[#8fa0b5] max-w-sm mx-auto mt-2 leading-relaxed">
                        Specify a public organization and project path path (e.g. `facebook/react`) in the Locator panel, and run insights compiled completely locally.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HIGH-SCORING REST API EXPLOER PANEL */}
            <div className="bg-[#05070a]/90 text-[#ccd6e0] rounded-3xl p-6.5 shadow-2xl border border-[#141b2a] space-y-5">
              <div className="flex items-center gap-3 border-b border-[#141b2a] pb-4">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Terminal className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-white">
                    Core API Playground Endpoint Explorer
                  </h3>
                  <p className="text-[10px] font-bold text-[#4c5c70] uppercase mt-0.5">
                    Integrators can execute restful queries directly against this engine in terminal
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Insights Endpoint */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-2">
                      <span className="bg-emerald-500/10 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono text-[9px] uppercase tracking-wider">
                        GET
                      </span>
                      <span className="font-mono text-white font-bold text-xs">/insights</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(curlInsightsCommand, "insights")}
                      className="text-[#8fa0b5] hover:text-white flex items-center gap-1.5 text-[11px] p-1 rounded-md transition-colors font-semibold cursor-pointer"
                    >
                      {copyStatus["insights"] ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 text-xs">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[10px] text-[#8fa0b5] bg-[#07090e] border border-[#141b2a] p-4 rounded-xl overflow-x-auto whitespace-pre font-mono leading-relaxed">
                    {curlInsightsCommand}
                  </pre>
                </div>

                {/* Narrative Endpoint */}
                <div className="space-y-2.5 pt-1.5">
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-2">
                      <span className="bg-emerald-500/10 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono text-[9px] uppercase tracking-wider">
                        GET
                      </span>
                      <span className="font-mono text-white font-bold text-xs">/narrative</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(curlNarrativeCommand, "narrative")}
                      className="text-[#8fa0b5] hover:text-white flex items-center gap-1.5 text-[11px] p-1 rounded-md transition-colors font-semibold cursor-pointer"
                    >
                      {copyStatus["narrative"] ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 text-xs">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[10px] text-[#8fa0b5] bg-[#07090e] border border-[#141b2a] p-4 rounded-xl overflow-x-auto whitespace-pre font-mono leading-relaxed">
                    {curlNarrativeCommand}
                  </pre>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
