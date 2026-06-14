import { RepoPRInsights } from "./metricsService";

export interface NarrativeOutput {
  summary: string;
  key_observations: string[];
  hypothesis: string;
  confidence: number;
  evidence: string[];
  
  // Backward compatibility keys for the older React dashboard UI:
  narrative: string;
  confidenceScore: number;
  evidenceChain: string[];
  metricsContext: string;
}

/**
 * Generates an analytical engineering narrative grounded strictly in compiled metrics.
 * Done entirely offline/locally representing a high-performance causality compiler.
 */
export function generateNarrative(insightsData: RepoPRInsights): NarrativeOutput {
  const { top_contributors, avg_merge_time, top_reviewers, raw_stats, repo } = insightsData;
  const { total_prs, total_commits, total_issues_closed, avg_pull_time_to_merge_hours, total_contributors } = raw_stats;

  // 1. Analyze Core Volumentrics & Rhythms
  const topContrib = top_contributors[0];
  const totalMergedPRs = total_prs;

  let cadence = "stable maintenance";
  if (totalMergedPRs > 15 || total_commits > 50) {
    cadence = "rapid sprint-cycle development";
  } else if (totalMergedPRs > 5 || total_commits > 15) {
    cadence = "continuous iteration";
  }

  // 2. Compute Workload Distribution & Key-person Single Point of Failure
  const topShareCount = topContrib ? topContrib.merged_prs : 0;
  const topSharePct = totalMergedPRs > 0 ? Math.round((topShareCount / totalMergedPRs) * 100) : 0;

  let centralisationStatus = "";
  let keyObservationWorkload = "";
  if (topContrib) {
    if (topSharePct > 60) {
      centralisationStatus = `Workload concentration is heavily centered around @${topContrib.author}, who signed off on ${topSharePct}% of all merged changes. This alerts team managers to a critical 'bus factor' vulnerability.`;
      keyObservationWorkload = `@${topContrib.author} authored a major concentration (${topSharePct}%) of all integrated pull requests.`;
    } else if (topSharePct > 30) {
      centralisationStatus = `Workload distribution is moderately balanced; @${topContrib.author} leads deliveries with a ${topSharePct}% merge share, backed by active auxiliary authors.`;
      keyObservationWorkload = `Modest workload distribution with @${topContrib.author} maintaining a ${topSharePct}% code contribution share.`;
    } else {
      centralisationStatus = "The team exhibits exemplary knowledge sharing and decentralized contribution velocity, suggesting multiple active maintainers are distributing tasks effectively.";
      keyObservationWorkload = "Workload represents healthy decentralization and strong collaborative autonomy among team members.";
    }
  } else {
    centralisationStatus = "No active individual contributor metrics were isolated for this interval.";
    keyObservationWorkload = "No merged pull request patterns are currently recordable.";
  }

  // 3. Evaluate Code Review Responsiveness
  let prReviewComment = "";
  let keyObservationMergeSpeed = "";
  if (totalMergedPRs > 0) {
    if (avg_pull_time_to_merge_hours <= 8) {
      prReviewComment = `With an average time-to-merge of ${avg_pull_time_to_merge_hours} hours, review turnaround is exceptionally responsive, pointing to active pipeline tooling or prompt continuous reviews.`;
      keyObservationMergeSpeed = `Rapid code review feedback cycles: Time-to-Merge completes inside ${avg_pull_time_to_merge_hours} hours.`;
    } else if (avg_pull_time_to_merge_hours <= 24) {
      prReviewComment = `Pull requests are integrated on average within ${avg_pull_time_to_merge_hours} hours, showcasing steady coordination and standard working-day delivery turnaround.`;
      keyObservationMergeSpeed = `Polished merge throughput averaging a solid code turnaround of ${avg_pull_time_to_merge_hours} hours.`;
    } else if (avg_pull_time_to_merge_hours <= 72) {
      prReviewComment = `Code is merged within ${avg_pull_time_to_merge_hours} hours on average. While stable for weekly schedules, this flags potential delays around reviewer availability.`;
      keyObservationMergeSpeed = `Pacing averages standard multi-day intervals (${avg_pull_time_to_merge_hours}h) indicative of milestone review habits.`;
    } else {
      prReviewComment = `An elevated average merge timeline of ${avg_pull_time_to_merge_hours} hours was tracked. This suggests severe review bottlenecks, timezone coordinate mismatch, or highly complex code reviews.`;
      keyObservationMergeSpeed = `Review queues suffer standard delays, with integration delays stretching to ${avg_pull_time_to_merge_hours} hours on average.`;
    }
  } else {
    prReviewComment = "No closed pull request merges were detected within the observed timeframe.";
    keyObservationMergeSpeed = "PR flows show passive maintenance or code freezes over this range.";
  }

  // 4. Trace top reviewers interaction
  const activeReviewersCount = top_reviewers.length;
  const topReviewer = top_reviewers[0];
  let reviewerComment = "";
  let keyObservationReviewLoad = "";
  if (topReviewer && topReviewer.reviews_count > 0) {
    reviewerComment = `Review duties are led by @${topReviewer.reviewer} with ${topReviewer.reviews_count} completed reviews, maintaining code safety across the branch landscape.`;
    keyObservationReviewLoad = `@${topReviewer.reviewer} handled the heaviest code audit load, tracking ${topReviewer.reviews_count} distinct PR reviews.`;
  } else {
    reviewerComment = "No active code reviews were recorded. Code reviews may be bypassing formal review systems via direct pushes.";
    keyObservationReviewLoad = "Limited reviewer footprints; review system relies primarily on passive merging or direct pushes.";
  }

  // 5. Structure narrative summary (3-4 concise human-like sentences)
  const summary = `The repository '${repo}' represents a ${cadence} cadence with ${totalMergedPRs} merged pull requests across the period. ${centralisationStatus} ${prReviewComment} ${reviewerComment}`;

  // 6. Formulate precise, logical key observations list
  const key_observations: string[] = [];
  if (keyObservationWorkload) key_observations.push(keyObservationWorkload);
  if (keyObservationMergeSpeed) key_observations.push(keyObservationMergeSpeed);
  if (keyObservationReviewLoad) key_observations.push(keyObservationReviewLoad);
  if (total_issues_closed > 0) {
    key_observations.push(`Issue backlog is actively trimmed, resolving ${total_issues_closed} defects during this cycle.`);
  }

  // 7. Deduce diagnostic Hypothesis
  let hypothesis = "";
  if (topSharePct > 60 && avg_pull_time_to_merge_hours > 36) {
    hypothesis = `Defect queues and pull request merges are bottlenecked by senior reviewer burnout. Because @${topContrib?.author} coordinates over two-thirds of the deliveries, peer code changes cascade into review queues awaiting sign-off from the primary maintainer.`;
  } else if (topSharePct > 50 && avg_pull_time_to_merge_hours <= 12) {
    hypothesis = `The repository operates at high individual velocity, minimizing synchronization overhead, but at the cost of team bus-factor safety. AUTONOMY is prioritized over structural training or code ownership diversification.`;
  } else if (activeReviewersCount >= 3 && avg_pull_time_to_merge_hours <= 24) {
    hypothesis = `Collaboration flows display excellent team cohesion. The reviews are well-distributed across ${activeReviewersCount} reviewer profiles, fostering healthy team autonomy and rapid integration speeds.`;
  } else if (totalMergedPRs === 0) {
    hypothesis = "The repository is experiencing a stabilization or freeze cycle. Activity shifts are likely occurring outside PR scopes or focused on direct branch hotfixes.";
  } else {
    hypothesis = `Delivery patterns reveal stable, decoupled file ownerships. The average code pull merges inside ${avg_pull_time_to_merge_hours} hours without relying on a centralized sole committer bottleneck.`;
  }

  // 8. Calculate confidence (0-100) based on signal density
  let confidence = 70;
  if (totalMergedPRs > 15) confidence += 15;
  else if (totalMergedPRs > 5) confidence += 8;

  if (activeReviewersCount >= 3) confidence += 10;
  else if (activeReviewersCount >= 1) confidence += 5;

  if (total_commits > 30) confidence += 5;
  confidence = Math.min(confidence, 98); // Max limit of 98% because there is always minor external contextual noise

  // 9. Exact evidence chains referencing metrics only
  const evidence: string[] = [
    `Merged PR Density: ${totalMergedPRs} merged pull requests with ${total_commits} analyzed commits.`,
    `Active Deliverers: ${total_contributors} distinct developers identified with active repository footprints.`
  ];
  if (topContrib) {
    evidence.push(`Contribution Ratio: @${topContrib.author} authored ${topSharePct}% of all merged PR elements.`);
  }
  if (avg_pull_time_to_merge_hours > 0) {
    evidence.push(`Merge Latency: Pull request reviews average ${avg_pull_time_to_merge_hours} hours to complete lifecycle merge.`);
  }
  if (topReviewer && topReviewer.reviews_count > 0) {
    evidence.push(`Auditor Activity: @${topReviewer.reviewer} verified ${topReviewer.reviews_count} code changes.`);
  }

  const metricsContext = `This synthesis measures the logical relationship between Team Dynamic Load (merged PRs volume & author shares) and Collaboration Velocity (PR and Reviewer resolution timelines). Engineering teams leverage these benchmarks to identify single points of dependency, clear reviewer bottlenecks, and promote healthy code ownership patterns.`;

  return {
    summary,
    key_observations,
    hypothesis,
    confidence,
    evidence,
    
    // UI backward compatibility mappings:
    narrative: summary,
    confidenceScore: confidence,
    evidenceChain: evidence,
    metricsContext
  };
}
