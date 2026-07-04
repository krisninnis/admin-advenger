import type { FeedbackEntry, ValidationTestRecord } from "../types";

export const VALIDATION_STORAGE_KEY = "admin-avenger-validation-v1";
export const FEEDBACK_STORAGE_KEY = "admin-avenger-feedback-v1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasStringId = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && typeof value.id === "string";

const readArray = <T>(key: string): T[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue.filter(hasStringId) as T[]) : [];
  } catch {
    return [];
  }
};

const saveArray = <T>(key: string, records: T[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(records));
  } catch {
    // Keep the app usable if localStorage is unavailable or full.
  }
};

const clearKey = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};

const yesNo = (value: boolean) => (value ? "Yes" : "No");

export const loadValidationRecords = () =>
  readArray<ValidationTestRecord>(VALIDATION_STORAGE_KEY);

export const saveValidationRecords = (records: ValidationTestRecord[]) =>
  saveArray(VALIDATION_STORAGE_KEY, records);

export const clearValidationRecords = () => clearKey(VALIDATION_STORAGE_KEY);

export const loadFeedbackEntries = () => readArray<FeedbackEntry>(FEEDBACK_STORAGE_KEY);

export const saveFeedbackEntries = (entries: FeedbackEntry[]) =>
  saveArray(FEEDBACK_STORAGE_KEY, entries);

export const clearFeedbackEntries = () => clearKey(FEEDBACK_STORAGE_KEY);

export const exportValidationRecordsToMarkdown = (records: ValidationTestRecord[]) => {
  const lines = [
    "# Refund Avenger Validation Notes",
    "",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    `Total tests recorded: ${records.length}`,
    "",
  ];

  records.forEach((record, index) => {
    lines.push(
      `## ${index + 1}. ${record.testerLabel || "Unnamed tester"}`,
      "",
      `- Scenario used: ${record.scenarioUsed || "Not recorded"}`,
      `- Completed flow: ${yesNo(record.completedFlow)}`,
      `- Understood assessment: ${yesNo(record.understoodAssessment)}`,
      `- Understood confidence: ${yesNo(record.understoodConfidence)}`,
      `- Trusted draft: ${yesNo(record.trustedDraft)}`,
      `- Knew what to do next: ${yesNo(record.knewNextStep)}`,
      `- Was this the problem they actually cared about: ${yesNo(Boolean(record.caredAboutProblem))}`,
      `- Would they use this on mobile: ${yesNo(Boolean(record.wouldUseOnMobile))}`,
      `- Where they hesitated: ${record.hesitation || "Not recorded"}`,
      `- What nearly stopped them: ${record.blocker || "Not recorded"}`,
      "",
      "Notes:",
      "",
      record.notes || "No notes recorded.",
      "",
    );
  });

  return lines.join("\n");
};

export const exportFeedbackEntriesToMarkdown = (entries: FeedbackEntry[]) => {
  const lines = [
    "# AdminAvenger Feedback",
    "",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    `Total entries: ${entries.length}`,
    "",
  ];

  entries.forEach((entry, index) => {
    lines.push(
      `## ${index + 1}. Feedback entry`,
      "",
      `- Trying to do: ${entry.tryingToDo || "Not recorded"}`,
      `- Confused by: ${entry.confusedBy || "Not recorded"}`,
      `- Would make useful: ${entry.usefulChange || "Not recorded"}`,
      `- Feature wanted next: ${entry.nextFeature.replaceAll("_", " ")}`,
      "",
      "Notes:",
      "",
      entry.notes || "No notes recorded.",
      "",
    );
  });

  return lines.join("\n");
};

export const downloadMarkdown = (filename: string, markdown: string) => {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
};
