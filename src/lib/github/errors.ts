export class RateLimitError extends Error {
  constructor() {
    super("GitHub rate limit reached")
    this.name = "RateLimitError"
  }
}
