import { ROLES } from "../admin/lib/roles"

export { ROLES }

/**
 * Returns true when a notification module error indicates no feed provider is
 * configured. The caller should log a warning and swallow the error in this case
 * rather than crashing — a missing feed provider is an expected deployment state.
 */
export function isMissingFeedProviderError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes(
      "Could not find a notification provider for channel: feed"
    )
  )
}
