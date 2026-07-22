import { describe, expect, it } from "vitest";
import { isCameraCalibrationLabEnabled } from "../cameraCalibrationLabAccess";

describe("camera calibration lab access gate", () => {
  it("enables the lab in local Vite development", () => {
    expect(isCameraCalibrationLabEnabled({ DEV: true })).toBe(true);
  });

  it("enables the lab for an explicit preview build flag", () => {
    expect(
      isCameraCalibrationLabEnabled({
        DEV: false,
        VITE_ENABLE_CAMERA_LAB: "true",
      }),
    ).toBe(true);
  });

  it("disables the lab when the production flag is missing", () => {
    expect(isCameraCalibrationLabEnabled({ DEV: false })).toBe(false);
  });

  it("does not enable the lab for a false flag", () => {
    expect(
      isCameraCalibrationLabEnabled({
        DEV: false,
        VITE_ENABLE_CAMERA_LAB: "false",
      }),
    ).toBe(false);
  });

  it("does not enable the lab for arbitrary flag values", () => {
    expect(
      isCameraCalibrationLabEnabled({
        DEV: false,
        VITE_ENABLE_CAMERA_LAB: "yes",
      }),
    ).toBe(false);
    expect(
      isCameraCalibrationLabEnabled({
        DEV: false,
        VITE_ENABLE_CAMERA_LAB: "TRUE",
      }),
    ).toBe(false);
  });
});
