import { AI_PROVIDER_SETTINGS_STORAGE_KEY } from "./aiProviderSettings";
import { INBOX_SCAN_SETTINGS_STORAGE_KEY } from "./inboxScanStorage";
import { ADMIN_AVENGER_STORAGE_KEY, LEGACY_STORAGE_KEYS } from "./storage";
import { TERMS_ACCEPTANCE_STORAGE_KEY } from "./termsAcceptance";
import { FEEDBACK_STORAGE_KEY, VALIDATION_STORAGE_KEY } from "./validationStorage";

export type LocalDataStorageType = "localStorage" | "sessionStorage";

export type LocalDataItem = {
  id: string;
  label: string;
  description: string;
  storageType: LocalDataStorageType;
  key: string;
  sensitivity: "low" | "medium" | "high";
  userFacingExplanation: string;
};

export type LocalDataSummaryItem = LocalDataItem & {
  isPresent: boolean;
  approximateSizeBytes?: number;
  readable: boolean;
};

export type LocalDataSummary = {
  items: LocalDataSummaryItem[];
  hasAnyData: boolean;
};

export type ClearLocalDataResult = {
  clearedKeys: string[];
  missingKeys: string[];
  failedKeys: Array<{ key: string; storageType: LocalDataStorageType }>;
};

export const KNOWN_LOCAL_DATA_ITEMS: readonly LocalDataItem[] = [
  {
    id: "saved-workspace",
    label: "Saved workspace",
    description: "Saved admin items, cases, findings, drafts, money tracker entries, and selection state.",
    storageType: "localStorage",
    key: ADMIN_AVENGER_STORAGE_KEY,
    sensitivity: "high",
    userFacingExplanation:
      "Your saved checks, cases, draft records, and manually recorded progress.",
  },
  ...LEGACY_STORAGE_KEYS.map(
    (key): LocalDataItem => ({
      id: `legacy-workspace-${key}`,
      label: "Older saved workspace",
      description: "Older AdminAvenger saved workspace key kept so old prototype data can be found or cleared.",
      storageType: "localStorage",
      key,
      sensitivity: "high",
      userFacingExplanation:
        "Older saved checks or cases from a previous prototype version.",
    }),
  ),
  {
    id: "ai-provider-settings",
    label: "AI testing settings",
    description: "Local rules or local Ollama developer settings, including local URL and model name.",
    storageType: "localStorage",
    key: AI_PROVIDER_SETTINGS_STORAGE_KEY,
    sensitivity: "medium",
    userFacingExplanation:
      "Local testing settings such as whether the app uses local rules or local Ollama on this device.",
  },
  {
    id: "inbox-scan-settings",
    label: "Inbox scan preview settings",
    description: "Sample inbox preview preferences, ignored sample ids, and local beta alert feedback.",
    storageType: "localStorage",
    key: INBOX_SCAN_SETTINGS_STORAGE_KEY,
    sensitivity: "medium",
    userFacingExplanation:
      "Inbox preview preferences and any short beta feedback note saved in this browser.",
  },
  {
    id: "validation-notes",
    label: "Validation notes",
    description: "Local validation notes from prototype testing.",
    storageType: "localStorage",
    key: VALIDATION_STORAGE_KEY,
    sensitivity: "medium",
    userFacingExplanation:
      "Prototype validation notes saved only in this browser.",
  },
  {
    id: "feedback-notes",
    label: "Feedback notes",
    description: "Local feedback entries from prototype testing.",
    storageType: "localStorage",
    key: FEEDBACK_STORAGE_KEY,
    sensitivity: "medium",
    userFacingExplanation:
      "Prototype feedback notes saved only in this browser.",
  },
  {
    id: "terms-acceptance",
    label: "Terms and safety acceptance",
    description: "The version of the Terms, Privacy Notice, and Safety Notice accepted in this browser.",
    storageType: "localStorage",
    key: TERMS_ACCEPTANCE_STORAGE_KEY,
    sensitivity: "low",
    userFacingExplanation:
      "A version marker showing that this browser accepted the current Terms and Safety Notice.",
  },
];

const getBrowserStorage = (storageType: LocalDataStorageType): Storage | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window[storageType];
  } catch {
    return undefined;
  }
};

const getApproximateSizeBytes = (value: string) => value.length * 2;

export const getLocalDataSummary = (): LocalDataSummary => {
  const items = KNOWN_LOCAL_DATA_ITEMS.map((item): LocalDataSummaryItem => {
    const storage = getBrowserStorage(item.storageType);

    if (!storage) {
      return {
        ...item,
        isPresent: false,
        readable: false,
      };
    }

    try {
      const value = storage.getItem(item.key);

      return {
        ...item,
        isPresent: value !== null,
        approximateSizeBytes: value === null ? undefined : getApproximateSizeBytes(value),
        readable: true,
      };
    } catch {
      return {
        ...item,
        isPresent: false,
        readable: false,
      };
    }
  });

  return {
    items,
    hasAnyData: items.some((item) => item.isPresent),
  };
};

export const clearAdminAvengerLocalData = (): ClearLocalDataResult => {
  const result: ClearLocalDataResult = {
    clearedKeys: [],
    missingKeys: [],
    failedKeys: [],
  };

  for (const item of KNOWN_LOCAL_DATA_ITEMS) {
    const storage = getBrowserStorage(item.storageType);

    if (!storage) {
      result.missingKeys.push(item.key);
      continue;
    }

    try {
      const hadValue = storage.getItem(item.key) !== null;
      storage.removeItem(item.key);

      if (hadValue) {
        result.clearedKeys.push(item.key);
      } else {
        result.missingKeys.push(item.key);
      }
    } catch {
      result.failedKeys.push({ key: item.key, storageType: item.storageType });
    }
  }

  return result;
};

export const hasAnyAdminAvengerLocalData = () => getLocalDataSummary().hasAnyData;
