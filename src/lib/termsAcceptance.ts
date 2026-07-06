// Terms & Safety acceptance gate - storage and pure logic only.
//
// This is a pre-use legal/safety gate, not a cookie banner: the user must not
// be able to reach any part of AdminAvenger until they have explicitly
// accepted the Terms, Privacy Notice, and Safety Notice for the current
// version. See src/components/TermsSafetyGate.tsx for the blocking UI and
// src/data/legalNotices.ts for the document content it displays.
//
// Versioned so that if the terms change later, everyone is shown the gate
// again rather than being silently carried forward on an old acceptance.

export const TERMS_ACCEPTANCE_STORAGE_KEY = "adminAvengerTermsAcceptedVersion";

// Bump this string whenever the Terms, Privacy Notice, or Safety Notice
// content changes in a way that needs re-acceptance.
export const CURRENT_TERMS_VERSION = "2026-07-terms-v1";

export type TermsCheckboxState = {
  understandsCanBeWrong: boolean;
  understandsNoAutoAction: boolean;
  understandsUserResponsible: boolean;
  agreesToTerms: boolean;
};

export const emptyTermsCheckboxState: TermsCheckboxState = {
  understandsCanBeWrong: false,
  understandsNoAutoAction: false,
  understandsUserResponsible: false,
  agreesToTerms: false,
};

// The "Accept and continue" button must stay disabled until every required
// checkbox is ticked - no partial acceptance, no auto-ticking.
export const canAcceptTerms = (checkboxState: TermsCheckboxState): boolean =>
  checkboxState.understandsCanBeWrong &&
  checkboxState.understandsNoAutoAction &&
  checkboxState.understandsUserResponsible &&
  checkboxState.agreesToTerms;

const readLocalStorage = (key: string): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    // If storage is unavailable, fail closed: treat as not accepted rather
    // than silently letting the user in.
    return null;
  }
};

const writeLocalStorage = (key: string, value: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the gate usable even if storage is unavailable; the user will
    // simply be asked again next time (fail closed, not fail open).
  }
};

const removeLocalStorage = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore - nothing else to do if storage is unavailable.
  }
};

// Returns the version string the user last accepted, or undefined if they
// have never accepted (or storage is unavailable).
export const getAcceptedTermsVersion = (): string | undefined =>
  readLocalStorage(TERMS_ACCEPTANCE_STORAGE_KEY) ?? undefined;

// The single source of truth for "is the app allowed to be used right now".
// Fails closed: any missing/unreadable/mismatched value means not accepted.
export const hasAcceptedCurrentTerms = (): boolean =>
  getAcceptedTermsVersion() === CURRENT_TERMS_VERSION;

// Records acceptance of the CURRENT terms version only. Never stores any
// personal data - just the version string that was accepted.
export const recordTermsAcceptance = () => {
  writeLocalStorage(TERMS_ACCEPTANCE_STORAGE_KEY, CURRENT_TERMS_VERSION);
};

// Settings > "Reset acceptance" (for testing) and any other flow that needs
// to force the gate to show again.
export const resetTermsAcceptance = () => {
  removeLocalStorage(TERMS_ACCEPTANCE_STORAGE_KEY);
};
