export type CameraCalibrationLabEnv = {
  DEV?: boolean;
  VITE_ENABLE_CAMERA_LAB?: string;
};

export const CAMERA_CALIBRATION_LAB_PREVIEW_FLAG = "VITE_ENABLE_CAMERA_LAB";

export const isCameraCalibrationLabEnabled = (
  env: CameraCalibrationLabEnv,
): boolean => env.DEV === true || env.VITE_ENABLE_CAMERA_LAB === "true";
