import { afterEach, beforeEach } from "vitest";

import { setContainerForTesting } from "@/lib/composition";

beforeEach(() => {
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  process.env.NEXTAUTH_SECRET = "test-secret-for-fdf-auth";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
});

afterEach(() => {
  setContainerForTesting(null);
});
