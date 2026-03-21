import { describe, it, expect } from "vitest";
import {
  LYRA_TO_LINEAR_STATUS,
  LINEAR_TO_LYRA_STATUS,
} from "@/lib/linear";
import type { FindingStatus } from "@/lib/types";

describe("Linear Status Mapping", () => {
  describe("LYRA_TO_LINEAR_STATUS", () => {
    it("should map all Lyra statuses to Linear statuses", () => {
      const lyraStatuses: FindingStatus[] = [
        "open",
        "accepted",
        "in_progress",
        "fixed_pending_verify",
        "fixed_verified",
        "wont_fix",
        "deferred",
        "duplicate",
        "converted_to_enhancement",
      ];

      for (const status of lyraStatuses) {
        expect(LYRA_TO_LINEAR_STATUS[status]).toBeDefined();
        expect(typeof LYRA_TO_LINEAR_STATUS[status]).toBe("string");
      }
    });

    it("should map open to Backlog", () => {
      expect(LYRA_TO_LINEAR_STATUS["open"]).toBe("Backlog");
    });

    it("should map accepted to Todo", () => {
      expect(LYRA_TO_LINEAR_STATUS["accepted"]).toBe("Todo");
    });

    it("should map in_progress to In Progress", () => {
      expect(LYRA_TO_LINEAR_STATUS["in_progress"]).toBe("In Progress");
    });

    it("should map fixed_verified to Done", () => {
      expect(LYRA_TO_LINEAR_STATUS["fixed_verified"]).toBe("Done");
    });

    it("should map wont_fix to Cancelled", () => {
      expect(LYRA_TO_LINEAR_STATUS["wont_fix"]).toBe("Cancelled");
    });

    it("should map duplicate to Cancelled", () => {
      expect(LYRA_TO_LINEAR_STATUS["duplicate"]).toBe("Cancelled");
    });

    it("should map deferred to Backlog", () => {
      expect(LYRA_TO_LINEAR_STATUS["deferred"]).toBe("Backlog");
    });

    it("should map fixed_pending_verify to In Progress", () => {
      expect(LYRA_TO_LINEAR_STATUS["fixed_pending_verify"]).toBe(
        "In Progress"
      );
    });

    it("should map converted_to_enhancement to Backlog", () => {
      expect(LYRA_TO_LINEAR_STATUS["converted_to_enhancement"]).toBe(
        "Backlog"
      );
    });
  });

  describe("LINEAR_TO_LYRA_STATUS", () => {
    it("should map all primary Linear statuses to Lyra statuses", () => {
      const linearStatuses = [
        "Backlog",
        "Triage",
        "Todo",
        "In Progress",
        "In Review",
        "Done",
        "Cancelled",
      ];

      for (const status of linearStatuses) {
        expect(LINEAR_TO_LYRA_STATUS[status]).toBeDefined();
        expect(typeof LINEAR_TO_LYRA_STATUS[status]).toBe("string");
      }
    });

    it("should map Backlog to open", () => {
      expect(LINEAR_TO_LYRA_STATUS["Backlog"]).toBe("open");
    });

    it("should map Triage to open", () => {
      expect(LINEAR_TO_LYRA_STATUS["Triage"]).toBe("open");
    });

    it("should map Todo to accepted", () => {
      expect(LINEAR_TO_LYRA_STATUS["Todo"]).toBe("accepted");
    });

    it("should map In Progress to in_progress", () => {
      expect(LINEAR_TO_LYRA_STATUS["In Progress"]).toBe("in_progress");
    });

    it("should map In Review to fixed_pending_verify", () => {
      expect(LINEAR_TO_LYRA_STATUS["In Review"]).toBe("fixed_pending_verify");
    });

    it("should map Done to fixed_verified", () => {
      expect(LINEAR_TO_LYRA_STATUS["Done"]).toBe("fixed_verified");
    });

    it("should map Cancelled to wont_fix", () => {
      expect(LINEAR_TO_LYRA_STATUS["Cancelled"]).toBe("wont_fix");
    });
  });

  describe("Round-trip consistency", () => {
    it("should handle round-trip conversions safely", () => {
      const testCases: Array<[FindingStatus, string]> = [
        ["open", "Backlog"],
        ["accepted", "Todo"],
        ["in_progress", "In Progress"],
        ["fixed_verified", "Done"],
        ["wont_fix", "Cancelled"],
      ];

      for (const [lyraStatus, expectedLinearStatus] of testCases) {
        // Lyra -> Linear
        const linearStatus = LYRA_TO_LINEAR_STATUS[lyraStatus];
        expect(linearStatus).toBe(expectedLinearStatus);

        // Linear -> Lyra
        const backToLyra = LINEAR_TO_LYRA_STATUS[linearStatus];
        expect(backToLyra).toBe(lyraStatus);
      }
    });

    it("should handle Triage -> open (extra Linear status)", () => {
      // Triage is a Linear status that should map to open
      expect(LINEAR_TO_LYRA_STATUS["Triage"]).toBe("open");

      // open should map to Backlog (the canonical Linear status)
      expect(LYRA_TO_LINEAR_STATUS["open"]).toBe("Backlog");

      // So Triage -> open -> Backlog (not back to Triage, but that's expected)
    });
  });

  describe("edge cases", () => {
    it("should handle case sensitivity", () => {
      // Linear statuses are case-sensitive
      expect(LINEAR_TO_LYRA_STATUS["backlog"]).toBeUndefined();
      expect(LINEAR_TO_LYRA_STATUS["Backlog"]).toBeDefined();
    });

    it("should not map invalid statuses", () => {
      expect(LINEAR_TO_LYRA_STATUS["InvalidStatus"]).toBeUndefined();
    });
  });
});
