// Local-only storage for the Inbox Scan prototype.
//
// IMPORTANT: this stores UI preferences and dismissed/ignored ids only.
// It NEVER stores email content, OAuth tokens, passwords, or any real
// account credentials. No email account is connected in this prototype.

export type InboxScanNotificationMethod = "in_app" | "email_later" | "text_later";

// Only in-app alerts actually work in this private beta. Email and text are
// future-only: they can be shown as "coming later" but must never be stored as
// the active notification method, and the app never emails or texts anyone.
export const SELECTABLE_NOTIFICATION_METHODS: InboxScanNotificationMethod[] = ["in_app"];

export const isSelectableNotificationMethod = (
  value: unknown,
): value is InboxScanNotificationMethod =>
  SELECTABLE_NOTIFICATION_METHODS.includes(value as InboxScanNotificationMethod);

// Keep the local beta note short. It is a plain preference/feedback note only —
// it is never sent anywhere and must not be treated as a contact channel.
const BETA_ALERTS_NOTE_MAX_LENGTH = 500;

export type InboxScanSettings = {
  startupPromptDismissed: boolean;
  showStartupPrompt: boolean;
  previewEnabled: boolean;
  showEmailSafetyCheckButton: boolean;
  notifySavings: boolean;
  notifySuspicious: boolean;
  notificationMethod: InboxScanNotificationMethod;
  ignoredItemIds: string[];
  // Local-only beta feedback. Saved in this browser and included in the local
  // backup. It never stores phone numbers, email addresses, or tokens and is
  // never transmitted.
  betaInterestFutureAlerts: boolean;
  betaAlertsNote: string;
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
  betaInterestFutureAlerts: false,
  betaAlertsNote: "",
};

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const asBetaNote = (value: unknown, fallback: string) =>
  typeof value === "string" ? value.slice(0, BETA_ALERTS_NOTE_MAX_LENGTH) : fallback;

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
      // Email/text can never be the active method: anything that is not
      // selectable falls back to the working in-app option.
      notificationMethod: isSelectableNotificationMethod(parsed.notificationMethod)
        ? parsed.notificationMethod
        : defaultInboxScanSettings.notificationMethod,
      ignoredItemIds: Array.isArray(parsed.ignoredItemIds)
        ? parsed.ignoredItemIds.filter((id): id is string => typeof id === "string")
        : [],
      betaInterestFutureAlerts: asBoolean(
        parsed.betaInterestFutureAlerts,
        defaultInboxScanSettings.betaInterestFutureAlerts,
      ),
      betaAlertsNote: asBetaNote(parsed.betaAlertsNote, defaultInboxScanSettings.betaAlertsNote),
    };
  } catch {
    return defaultInboxScanSettings;
  }
};

// Guarantees the active notification method is always a working one. Email and
// text are future-only and quietly resolve back to in-app.
export const resolveActiveNotificationMethod = (
  method: InboxScanNotificationMethod,
): InboxScanNotificationMethod =>
  isSelectableNotificationMethod(method) ? method : "in_app";

export const saveInboxScanSettings = (settings: InboxScanSettings) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const safeSettings: InboxScanSettings = {
      ...settings,
      notificationMethod: resolveActiveNotificationMethod(settings.notificationMethod),
    };
    window.localStorage.setItem(INBOX_SCAN_SETTINGS_STORAGE_KEY, JSON.stringify(safeSettings));
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
