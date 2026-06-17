import { describe, expect, it } from "vitest";

import {
  createIntensity,
  intensityValue,
  shiftIntensity,
} from "../../src/domain/value-objects/intensity";

describe("Intensity", () => {
  it("accepts the supported intimacy scale", () => {
    expect(intensityValue(createIntensity(1))).toBe(1);
    expect(intensityValue(createIntensity(2))).toBe(2);
    expect(intensityValue(createIntensity(3))).toBe(3);
  });

  it("rejects values outside the supported scale", () => {
    expect(() => createIntensity(0)).toThrow("Intensity must be an integer");
    expect(() => createIntensity(4)).toThrow("Intensity must be an integer");
  });

  it("keeps soften and spicier controls within bounds", () => {
    expect(intensityValue(shiftIntensity(createIntensity(1), "softer"))).toBe(1);
    expect(intensityValue(shiftIntensity(createIntensity(3), "spicier"))).toBe(3);
    expect(intensityValue(shiftIntensity(createIntensity(2), "softer"))).toBe(1);
    expect(intensityValue(shiftIntensity(createIntensity(2), "spicier"))).toBe(3);
  });
});
