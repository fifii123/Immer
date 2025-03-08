/**
 * Formats a timestamp into a relative time string (e.g., "5 minutes ago", "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffInSeconds = Math.floor((now - timestamp) / 1000)

  // Less than a minute
  if (diffInSeconds < 60) {
    return "just now"
  }

  // Less than an hour
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
  }

  // Less than a day
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
  }

  // Less than a week
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} ${days === 1 ? "day" : "days"} ago`
  }

  // Less than a month
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800)
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`
  }

  // Format as date if older than a month
  const date = new Date(timestamp)
  return date.toLocaleDateString()
}

