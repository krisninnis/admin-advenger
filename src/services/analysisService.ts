import { analyseAdminItem } from "../lib/mockAnalysis";
import type { AdminFinding, AdminItem } from "../types";

export type ServiceStatus = "idle" | "loading" | "success" | "error";

export type ServiceError = {
  message: string;
  code?: string;
};

export type AnalysisResult =
  | {
      status: "success";
      findings: AdminFinding[];
    }
  | {
      status: "error";
      findings: [];
      error: ServiceError;
    };

const wait = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

export const analyseAdminItemWithService = async (
  item: AdminItem,
): Promise<AnalysisResult> => {
  try {
    await wait(500);

    // Future real AI integration point:
    // Replace this mock adapter call with a safe structured AI analysis request.
    const findings = analyseAdminItem(item);

    return {
      status: "success",
      findings,
    };
  } catch {
    return {
      status: "error",
      findings: [],
      error: {
        message: "AdminAvenger could not analyse this item. Please try again.",
        code: "analysis_failed",
      },
    };
  }
};
