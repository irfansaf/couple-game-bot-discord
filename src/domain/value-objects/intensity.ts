import { DomainValidationError } from "../errors/domain-error";
import { brand, type Brand } from "../../shared/brand";

export type IntensityValue = 1 | 2 | 3;
export type Intensity = Brand<IntensityValue, "Intensity">;
export type IntensityDirection = "softer" | "spicier";

export function createIntensity(value: number): Intensity {
  if (!Number.isInteger(value) || value < 1 || value > 3) {
    throw new DomainValidationError("Intensity must be an integer from 1 to 3.");
  }

  return brand<IntensityValue, "Intensity">(value as IntensityValue);
}

export function intensityValue(intensity: Intensity): IntensityValue {
  return intensity;
}

export function shiftIntensity(
  current: Intensity,
  direction: IntensityDirection,
): Intensity {
  const next =
    direction === "softer"
      ? Math.max(1, current - 1)
      : Math.min(3, current + 1);

  return createIntensity(next);
}
