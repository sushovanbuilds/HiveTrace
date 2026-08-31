import { describe, expect, it } from "vitest";

describe("test runner", () => {
  it("executes assertions", () => {
    expect(1 + 1).toBe(2);
  });
});

describe("HIVETRACE types", () => {
  it("batch stages are ordered correctly", async () => {
    const { STAGE_ORDER } = await import("@/lib/types");
    expect(STAGE_ORDER[0]).toBe("HARVEST");
    expect(STAGE_ORDER[STAGE_ORDER.length - 1]).toBe("RETAIL");
    expect(STAGE_ORDER.length).toBe(7);
  });

  it("honey types are defined", async () => {
    const { HONEY_TYPES } = await import("@/lib/types");
    expect(HONEY_TYPES).toContain("MULTIFLORAL");
    expect(HONEY_TYPES).toContain("MANUKA");
    expect(HONEY_TYPES).toContain("ACACIA");
  });
});
