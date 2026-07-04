// Local-only storage for the Inbox Scan prototype.
//
// IMPORTANT: this stores UI preferences and dismissed/ignored ids only.
// It NEVER stores email content, OAuth tokens, passwords, or any real
// account credentials. No email account is connected in this prototype.

export type InboxScanNotificationMethod = "in_app" | "email_later" | "text_later";

export type InboxScanSettings = {
  startupPromptDismissed: boolean;
  showStartupPrompt: boolean;
  previewEnabled: boolean;
  showEmailSafetyCheckButton: boolean;
  notifySavings: boolean;
  notifySuspicious: boolean;
  notificationMethod: InboxScanNotificationMethod;
  ignoredItemIds: string[];
};

export const INBOX_SCAN_SETTINGS_STORAGE_KEY = "adminAvenger.inboxScan";

export const defaultInboxScanSettings: InboxScanSettings = {
  startupPromptDismissed: false,
  showStartupPrompt: true,
  previewEnabled: true,
  showEmailSafetyCheckButton: true,
  notifySavings: true,
  notifySuspicious: true,
  notificationMethod: "in_app",
  ignoredItemIds: [],
};

const isNotificationMethod = (value: unknown): value is InboxScanNotificationMethod =>
  value === "in_app" || value === "email_later" || value === "text_later";

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export const loadInboxScanSettings = (): InboxScanSettings => {
  if (typeof window === "undefined") {
    return defaultInboxScanSettings;
  }

  try {
    const stored = window.localStorage.getItem(INBOX_SCAN_SETTINGS_STORAGE_KEY);

    if (!stored) {
      return defaultInboxScanSettings;
    }

    const parsed = JSON.parse(stored) as Partial<InboxScanSettings>;

    return {
      startupPromptDismissed: asBoolean(
        parsed.startupPromptDismissed,
        defaultInboxScanSettings.startupPromptDismissed,
      ),
      showStartupPrompt: asBoolean(
        parsed.showStartupPrompt,
        defaultInboxScanSettings.showStartupPrompt,
      ),
      previewEnabled: asBoolean(parsed.previewEnabled, defaultInboxScanSettings.previewEnabled),
      showEmailSafetyCheckButton: asBoolean(
        parsed.showEmailSafetyCheckButton,
        defaultInboxScanSettings.showEmailSafetyCheckButton,
      ),
      notifySavings: asBoolean(parsed.notifySavings, defaultInboxScanSettings.notifySavings),
      notifySuspicious: asBoolean(
        parsed.notifySuspicious,
        defaultInboxScanSettings.notifySuspicious,
      ),
      notificationMethod: isNotificationMethod(parsed.notificationMethod)
        ? parsed.notificationMethod
        : defaultInboxScanSettings.notificationMethod,
      ignoredItemIds: Array.isArray(parsed.ignoredItemIds)
        ? parsed.ignoredItemIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return defaultInboxScanSettings;
  }
};

export const saveInboxScanSettings = (settings: InboxScanSettings) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(INBOX_SCAN_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can fail in private browsing or when a quota is exceeded.
  }
};

export const clearInboxScanSettings = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(INBOX_SCAN_SETTINGS_STORAGE_KEY);
  } catch {
    // Ignore storage failures so the app stays usable.
  }
};
