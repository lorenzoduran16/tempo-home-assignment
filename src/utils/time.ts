/**
 * Utility functions for date and time calculations
 */

/**
 * Parses a "since" duration string (like "7d", "30d", "90d") or an ISO timestamp,
 * and returns the corresponding past Date object.
 */
export function parseSinceParam(sinceParam?: string, defaultDays = 30): Date {
  const now = new Date();
  if (!sinceParam) {
    const defaultDate = new Date(now);
    defaultDate.setDate(now.getDate() - defaultDays);
    return defaultDate;
  }

  // Check if it's a relative shorthand like "30d" or "7d"
  const match = sinceParam.match(/^(\d+)([dDhH])$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const resultDate = new Date(now);

    if (unit === "d") {
      resultDate.setDate(now.getDate() - value);
    } else if (unit === "h") {
      resultDate.setHours(now.getHours() - value);
    }
    return resultDate;
  }

  // Fallback to standard Date parsing (for ISO-8601 strings)
  const parsed = Date.parse(sinceParam);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  // Ultimate fallback
  const fallbackDate = new Date(now);
  fallbackDate.setDate(now.getDate() - defaultDays);
  return fallbackDate;
}

/**
 * Calculates duration between two dates in hours.
 */
export function getDurationInHours(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diffMs = end - start;
  if (isNaN(diffMs) || diffMs < 0) return 0;
  return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
}
