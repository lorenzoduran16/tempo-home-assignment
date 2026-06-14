PR FLOW INTELLIGENCE API

--------------------------------------------
PROJECT OVERVIEW

A lightweight TypeScript backend service that connects to GitHub
and analyzes pull request activity to generate engineering insights.

It exposes structured metrics and uses an LLM to generate a short
narrative explaining patterns in developer contribution and workflow
efficiency.

--------------------------------------------
WHAT IT DOES

- Fetches pull request data from a GitHub repository
- Computes key engineering metrics:
  • Top contributors (merged PRs)
  • Average PR merge time
  • Top reviewers (review activity)

- Exposes insights via REST API
- Generates AI-based explanation from metrics

--------------------------------------------
HOW TO RUN

Install dependencies:
  npm install

Start development server:
  npm run dev

Server runs at:
  http://localhost:3000

--------------------------------------------
API ENDPOINTS

1. GET /insights?repo=owner/repo&since=30d
Returns computed GitHub metrics.

2. GET /narrative?repo=owner/repo&since=30d
Returns LLM-generated explanation of insights.

--------------------------------------------
TECH STACK

- TypeScript
- Node.js (Express/Fastify)
- GitHub REST API
- LLM API (OpenAI or similar)

--------------------------------------------
PROJECT STRUCTURE

src/
  server.ts
  routes/
  services/
  utils/

--------------------------------------------
KEY IDEA

Transform raw GitHub activity into meaningful engineering insights
and explain them using AI in a structured, grounded way.

--------------------------------------------
NOTES

- Uses GitHub API as primary data source
- Keeps computation layer separate from API layer
- LLM is only used for explanation, not raw data fetching
