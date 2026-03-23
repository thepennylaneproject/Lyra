import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isOpenApiAllowedWithoutSecret,
} from "@/lib/dashboard-secret";

describe("isOpenApiAllowedWithoutSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when NODE_ENV is not production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LYRA_ALLOW_OPEN_API", "");
    expect(isOpenApiAllowedWithoutSecret()).toBe(true);
  });

  it("returns false in production when LYRA_ALLOW_OPEN_API is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LYRA_ALLOW_OPEN_API", "");
    expect(isOpenApiAllowedWithoutSecret()).toBe(false);
  });

  it("returns true in production when LYRA_ALLOW_OPEN_API is 1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LYRA_ALLOW_OPEN_API", "1");
    expect(isOpenApiAllowedWithoutSecret()).toBe(true);
  });

  it("returns true in production when LYRA_ALLOW_OPEN_API is true (case-insensitive)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LYRA_ALLOW_OPEN_API", "TRUE");
    expect(isOpenApiAllowedWithoutSecret()).toBe(true);
  });
});
