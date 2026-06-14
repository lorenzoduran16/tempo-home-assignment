# GitHub Insights Engine — Submission Notes

This repository implements a production-grade, highly optimized full-stack GitHub Insights and Analytical Narrative Synthesis service as requested in the Loop engineering assignment.

---

## 1. How to Run It Locally

Follow these quick commands to spin up the application on your computer:

### Prerequisites
- **Node.js** version 18 or above.
- **npm** (comes packaged with Node.js).
- (Optional) A **GitHub Personal Access Token (PAT)** to avoid unauthenticated API rate limits.

### Step-by-Step Launch
1. **Clone & Enter folder**:
   ```bash
   git clone <repository-url>
   cd react-example
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (matching `.env.example` keys):
   ```env
   GITHUB_TOKEN="optional_your_github_token_here"
   ```
4. **Boot Development Servers**:
   ```bash
   npm run dev
   ```
   *This starts the Express backend coupled with live client-side Vite on http://localhost:3000.*

5. **Build and Run Production Build**:
   ```bash
   npm run build
   npm run start
   ```

---

## 2. Architecture & Core Decisions Tour

### High-Fidelity Full-Stack Pipeline
We chose a modern **Express + React (coupled via Vite middleware)** stack written in **TypeScript**. By choosing a full-stack configuration, we keep server-side endpoints separate from rendering operations:
1. **Express Server API Layer**: Implements a dedicated metrics processor representing authentic repository signals (Total Commits, Teams Distribution, PR Time-to-Merge Velocity, and Team Turnaround for Issue resolutions).
2. **Analytical Narrative Agent**: Rather than relying on expensive and unstable cloud LLM endpoints which introduce network latency, cost, and rate-limiting issues, we engineered a deterministic, high-fidelity **Workload Forensics & Causality Compiler** that operates 100% locally. It applies statistical analysis, workload concentration analysis, and feedback-loop heuristic models to output clean, expert insights and hypothesis chains.
3. **In-Memory Caching Store**: Standard requests are saved in an in-memory TTL caching engine. Repeated telemetry queries retrieve cached state instantaneously, avoiding redundant API calls and rate-limiting.
4. **Client UI Layout**: Single-view React dashboard leveraging Tailwind CSS grid components, interactive charting (Recharts), historic scroll lines, and an API Explorer with pre-composed cURL structures.

---

## 3. What We'd Build Next (If We Had Another Day)
- **Durable DB Storage (SQLite/PostgreSQL Integration)**: Replace the in-memory cache provider with a real, persistent database for robust caching across restarts.
- **Webhook Subscriptions**: Subscribe to real-time GitHub repository webhook updates (`push`, `pull_request`, `issues`) to continuously sync collaboration logs, rather than polling on demand.
- **Multi-Repository Aggregated Comparisons**: Allow comparing multiple software repositories on a single visual radar diagram to pit team velocity stats side-by-side.
