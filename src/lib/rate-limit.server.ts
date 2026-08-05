import { RateLimiter } from "@/packages/permissions/RateLimiter";

// Global instance for the server
export const nicoRateLimiter = new RateLimiter(
  15, // 15 requests
  60_000, // per minute
);
