import { useState } from "react";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { DataControls } from "../components/DataControls";
import { LegalDocumentViewer } from "../components/LegalDocumentViewer";
import type { AppView } from "../components/Sidebar";
import { legalDocumentOrder, legalDocuments, type LegalDocumentId } from "../data/legalNotices";
import {
  isSelectableNotificationMethod,
  type InboxScanNotificationMethod,
  type InboxScanSettings,
} from "../lib/inboxScanStorage";
import {
  getLocalDataSummary,
  type ClearLocalDataResult,
  type LocalDataSummary,
} from "../lib/localDataControl";
import { isControlledFeatureEnabled } from "../lib/publicScopePolicy";

type SettingsViewProps = {
  onResetDemoData: () => void;
  onClearLocalData: () => ClearLocalDataResult;
  onDownloadBackup: () => void;
  dataControlMessage?: string;
  onNavigate: (view: AppView) => void;
  inboxScanSettings: InboxScanSettings;
  onUpdateInboxScanSettings: (updates: Partial<InboxScanSettings>) => void;
  onViewTermsAgain: () => void;
  onResetTermsAcceptance: () => void;
};

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <span>
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-400">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-emerald-400"
      />
    </label>
  );
}

const formatApproximateSize = (size?: number) => {
  if (size === undefined) {
    return "No saved value found";
  }

  if (size < 1024) {
    return `${size} bytes`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
};

type LocalDataControlSectionProps = {
  onClearLocalData: () => ClearLocalDataResult;
};

export function LocalDataControlSection({ onClearLocalData }: LocalDataControlSectionProps) {
  const [summary, setSummary] = useState<LocalDataSummary>(() => getLocalDataSummary());
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleClear = () => {
    const result = onClearLocalData();

    setSummary(getLocalDataSummary());
    setConfirmingClear(false);
    setStatusMessage(
      result.failedKeys.length > 0
        ? "AdminAvenger tried to clear local data, but this browser blocked one or more saved items."
        : "AdminAvenger local data was cleared from this browser.",
    );
  };

  return (
    <CollapsibleSection
      eyebrow="Local data control"
      title="Local data control"
      description="See what this browser may hold and clear AdminAvenger data from this device."
      defaultOpen
    >
      <div className="space-y-4">
        <p className="max-w-4xl text-sm leading-6 text-slate-300">
          AdminAvenger is designed to keep your work under your control. This section
          shows the local data this browser may hold and lets you clear AdminAvenger
          data from this device.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            "This only clears AdminAvenger data saved in this browser on this device.",
            "It will not delete files you already downloaded, such as adviser packs.",
            "It will not contact anyone or cancel anything.",
          ].map((warning) => (
            <p
              key={warning}
              className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm leading-6 text-amber-50"
            >
              {warning}
            </p>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {summary.items.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white">{item.label}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {item.userFacingExplanation}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                    item.isPresent
                      ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                      : "border-white/10 bg-white/[0.04] text-slate-400"
                  }`}
                >
                  {item.isPresent ? "Saved here" : "Not found"}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 text-xs leading-5 text-slate-500 sm:grid-cols-3">
                <div>
                  <dt className="font-bold uppercase tracking-wider text-slate-600">Storage</dt>
                  <dd>{item.storageType}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wider text-slate-600">Sensitivity</dt>
                  <dd>{item.sensitivity}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wider text-slate-600">Approx size</dt>
                  <dd>{formatApproximateSize(item.approximateSizeBytes)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <div className="rounded-lg border border-rose-300/25 bg-rose-300/[0.07] p-4">
          <p className="text-sm font-bold text-white">Clear AdminAvenger data from this device</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            This clears only the known AdminAvenger keys listed above. It does not
            clear unrelated browser storage.
          </p>
          {!confirmingClear ? (
            <button
              type="button"
              onClick={() => {
                setConfirmingClear(true);
                setStatusMessage("");
              }}
              className="mt-3 min-h-11 rounded-lg border border-rose-300/40 bg-rose-300/10 px-4 py-2.5 text-sm font-bold text-rose-100 transition hover:border-rose-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-300/40"
            >
              Clear AdminAvenger data from this device
            </button>
          ) : (
            <div className="mt-3 rounded-lg border border-rose-200/30 bg-slate-950/50 p-3">
              <p className="text-sm leading-6 text-rose-50">
                Please confirm you want to clear AdminAvenger data saved in this
                browser on this device.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="min-h-11 rounded-lg border border-rose-200/40 bg-rose-200/15 px-4 py-2.5 text-sm font-bold text-rose-50 transition hover:border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200/40"
                >
                  Yes, clear local AdminAvenger data
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-400/40"
                >
                  Keep data
                </button>
              </div>
            </div>
          )}
          {statusMessage ? (
            <p
              role="status"
              className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-50"
            >
              {statusMessage}
            </p>
          ) : null}
        </div>
      </div>
    </CollapsibleSection>
  );
}

// Three honest buckets so nobody can mistake a future feature for a working one.
const availabilityGroups: Array<{
  tone: "emerald" | "cyan" | "slate";
  title: string;
  caption: string;
  items: string[];
}> = [
  {
    tone: "emerald",
    title: "Works now",
    caption: "Available in this private beta, on this device.",
    items: [
      "Paste text to check",
      "Upload a text file",
      "Take or upload a photo (reads text on device)",
      "Local rules check — no cloud AI",
      "Save admin items and cases",
      "Track money manually",
      "Download a local backup",
      "Install on your phone",
      "In-app alerts",
    ],
  },
  {
    tone: "cyan",
    title: "Beta preview",
    caption: "Preview features that use sample or on-device data only.",
    items: [
      "Inbox scan preview — sample emails only, no account connected",
      "Local Ollama developer testing (only if you enable it on this device)",
    ],
  },
  {
    tone: "slate",
    title: "Coming later — not connected",
    caption: "Not built in this beta. Nothing here is active and nothing is sent.",
    items: [
      "Real Gmail or Outlook connection",
      "Email notifications",
      "Text notifications",
      "Cloud backup and sync",
      "Automatic inbox monitoring",
    ],
  },
];

const availabilityToneClasses = {
  emerald: {
    border: "border-emerald-300/25",
    bg: "bg-emerald-300/[0.06]",
    dot: "text-emerald-300",
    heading: "text-emerald-200",
  },
  cyan: {
    border: "border-cyan-300/25",
    bg: "bg-cyan-300/[0.06]",
    dot: "text-cyan-300",
    heading: "text-cyan-200",
  },
  slate: {
    border: "border-white/10",
    bg: "bg-slate-950/40",
    dot: "text-slate-500",
    heading: "text-slate-400",
  },
} as const;

const notificationMethods: Array<{
  value: InboxScanNotificationMethod;
  label: string;
  helper: string;
  unavailableMessage?: string;
}> = [
  { value: "in_app", label: "In app only", helper: "Works now" },
  {
    value: "email_later",
    label: "Email",
    helper: "Coming later",
    unavailableMessage:
      "Email notifications are not connected in this beta. AdminAvenger will not email you. In this version, alerts only appear inside the app.",
  },
  {
    value: "text_later",
    label: "Text",
    helper: "Coming later",
    unavailableMessage:
      "Text notifications are not connected in this beta. AdminAvenger will not text you. In this version, alerts only appear inside the app.",
  },
];

const trustSections = [
  {
    title: "What AdminAvenger can do",
    body:
      "AdminAvenger can read text you paste, explain what it looks like, show what proof is useful, and prepare a message or checklist for you to review.",
  },
  {
    title: "What AdminAvenger cannot do",
    body:
      "AdminAvenger does not send messages, cancel subscriptions, submit claims, contact companies, connect to your email, email or text you, confirm fraud, give legal advice, or guarantee money back.",
  },
  {
    title: "How to use it safely",
    body:
      "Check the result before acting. You decide what to copy, send, save, or ignore. If a message feels urgent or asks for bank, card, login, or one-time-code details, do not click links in the message. Open the official website or app yourself.",
  },
  {
    title: "What happens to my data?",
    body:
      "Everything you paste or save stays in this browser on this device. Nothing is uploaded in this version. Clearing browser data can delete it. Use Download local backup to keep a copy. You can remove account numbers or passwords before pasting. AdminAvenger does not need them to help.",
  },
  {
    title: "What counts as saved money?",
    body:
      "Money is only counted as saved or recovered when you record the outcome yourself. A refund being approved, a subscription being spotted, or a possible saving being found is not counted as confirmed money.",
  },
  {
    title: "Risky emails",
    body:
      "AdminAvenger flags warning signs. It cannot determine whether a message is a scam or actually from the organisation.",
  },
  {
    title: "Photo proof",
    body:
      "Photo proof is not fully stored in this prototype. Keep the original file somewhere safe.",
  },
  {
    title: "Spotted a wrong number?",
    body:
      "Spotted a wrong number or confusing result? Tell Kris. Use the feedback link or send the example to the tester running this beta.",
  },
];

export function SettingsView({
  onResetDemoData,
  onClearLocalData,
  onDownloadBackup,
  dataControlMessage,
  onNavigate,
  inboxScanSettings,
  onUpdateInboxScanSettings,
  onViewTermsAgain,
  onResetTermsAcceptance,
}: SettingsViewProps) {
  const [notificationNotice, setNotificationNotice] = useState<string | undefined>(undefined);
  const [activeLegalDocument, setActiveLegalDocument] = useState<LegalDocumentId | undefined>(
    undefined,
  );
  const controlledFeaturesEnabled = isControlledFeatureEnabled(import.meta.env);
  const activeNotificationMethod = isSelectableNotificationMethod(
    inboxScanSettings.notificationMethod,
  )
    ? inboxScanSettings.notificationMethod
    : "in_app";

  const handleNotificationMethodClick = (method: (typeof notificationMethods)[number]) => {
    if (method.unavailableMessage) {
      // Never store email/text as active. Explain instead of pretending it worked.
      setNotificationNotice(method.unavailableMessage);
      return;
    }

    setNotificationNotice(undefined);
    onUpdateInboxScanSettings({ notificationMethod: method.value });
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">Settings</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Control what AdminAvenger keeps
        </h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-slate-400">
          Everything you paste or save stays in this browser on this device. Clearing browser data
          can delete it, so download a backup before clearing anything important.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sections are collapsed to keep this page easy to scan.
        </p>
      </header>

      <LocalDataControlSection onClearLocalData={onClearLocalData} />

      <CollapsibleSection
        eyebrow="Status"
        title="What works now"
        description="A quick map of what AdminAvenger can do in this private beta."
        defaultOpen
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {availabilityGroups.map((group) => {
            const tone = availabilityToneClasses[group.tone];
            const isComingLater = group.tone === "slate";

            return (
              <article
                key={group.title}
                className={`rounded-lg border ${tone.border} ${tone.bg} p-4`}
              >
                <h4 className={`text-sm font-bold uppercase tracking-widest ${tone.heading}`}>
                  {group.title}
                </h4>
                <p className="mt-1 text-xs leading-5 text-slate-500">{group.caption}</p>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className={`flex gap-2 text-sm leading-6 ${
                        isComingLater ? "text-slate-500" : "text-slate-200"
                      }`}
                    >
                      <span aria-hidden className={`mt-0.5 shrink-0 font-bold ${tone.dot}`}>
                        {isComingLater ? "○" : "✓"}
                      </span>
                      <span className={isComingLater ? "line-through decoration-slate-600" : ""}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                {isComingLater ? (
                  <p className="mt-3 rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-400">
                    Coming later items cannot be turned on in this beta.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        eyebrow="Local data"
        title="Back up or clear local data"
        description="Download a backup before clearing anything you want to keep."
        defaultOpen
      >
        <DataControls
          onResetDemoData={onResetDemoData}
          onClearLocalData={onClearLocalData}
          onDownloadBackup={onDownloadBackup}
          statusMessage={dataControlMessage}
        />
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          You can remove passwords or account numbers before pasting. AdminAvenger does not need
          them to help.
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        eyebrow="Inbox preview"
        title="Inbox scan preview"
        badge="Sample emails only — no account connected"
        badgeTone="cyan"
        description="Sample emails only. No Gmail, Outlook, or email account is connected."
      >
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          Real inbox connection is not part of this private beta yet. For now, you can paste emails
          manually or try the sample preview. In a future connected version, you would be able to
          disconnect, delete scan data, and choose which alerts you receive.
        </p>

        <div className="mt-5 grid gap-3">
          <ToggleRow
            label="Inbox scan preview"
            description="Show the sample inbox scan preview on the Home screen. This uses sample emails only — no email account is connected."
            checked={inboxScanSettings.previewEnabled}
            onChange={(checked) => onUpdateInboxScanSettings({ previewEnabled: checked })}
          />
          <ToggleRow
            label="Startup prompt"
            description="Show the optional inbox scan preview prompt when you open Home."
            checked={inboxScanSettings.showStartupPrompt}
            onChange={(checked) =>
              onUpdateInboxScanSettings({
                showStartupPrompt: checked,
                // Re-enabling the prompt clears a previous dismissal so it can appear again.
                startupPromptDismissed: checked ? false : inboxScanSettings.startupPromptDismissed,
              })
            }
          />
          <ToggleRow
            label="Show email safety check button"
            description="Show a small optional safety button when pasted content looks like an email."
            checked={inboxScanSettings.showEmailSafetyCheckButton}
            onChange={(checked) => onUpdateInboxScanSettings({ showEmailSafetyCheckButton: checked })}
          />
          <ToggleRow
            label="Highlight possible savings"
            description="Highlight refunds, subscriptions, price rises, and possible recovery in the preview."
            checked={inboxScanSettings.notifySavings}
            onChange={(checked) => onUpdateInboxScanSettings({ notifySavings: checked })}
          />
          <ToggleRow
            label="Highlight suspicious emails"
            description="Highlight emails that show warning signs so you can verify before acting."
            checked={inboxScanSettings.notifySuspicious}
            onChange={(checked) => onUpdateInboxScanSettings({ notifySuspicious: checked })}
          />
        </div>

        <div className="mt-6">
          <p className="text-sm font-bold text-white">Notification method</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            In this version, alerts only appear inside the app. Email and text are not connected and
            nothing is sent.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {notificationMethods.map((method) => {
              const unavailable = Boolean(method.unavailableMessage);
              const isActive = !unavailable && activeNotificationMethod === method.value;

              return (
                <button
                  key={method.value}
                  type="button"
                  aria-disabled={unavailable}
                  onClick={() => handleNotificationMethodClick(method)}
                  className={`rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                    unavailable
                      ? "cursor-not-allowed border-white/5 bg-slate-950/40 text-slate-500"
                      : isActive
                        ? "border-emerald-300/60 bg-emerald-300/12 text-white"
                        : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{method.label}</span>
                    {isActive ? (
                      <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                        Active
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`mt-1 block text-xs font-semibold ${
                      unavailable ? "text-amber-300/80" : "text-slate-500"
                    }`}
                  >
                    {method.helper}
                  </span>
                </button>
              );
            })}
          </div>
          {notificationNotice ? (
            <p
              role="status"
              className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50"
            >
              {notificationNotice}
            </p>
          ) : null}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        eyebrow="Beta feedback"
        title="Future alerts feedback"
        badge="Local only"
        badgeTone="amber"
        description="Tell us what alerts would be useful. Saved only in this browser."
      >
        <ToggleRow
          label="Mention this in beta feedback"
          description="Note that you'd like to hear when email or text alerts are ready. This is saved only in this browser. AdminAvenger will not email or text you, and no contact details are collected."
          checked={inboxScanSettings.betaInterestFutureAlerts}
          onChange={(checked) =>
            onUpdateInboxScanSettings({ betaInterestFutureAlerts: checked })
          }
        />
        <label className="mt-3 block">
          <span className="block text-sm font-bold text-white">What would you want alerts for?</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Free text, saved locally and included in your local backup. Please do not enter your
            phone number or email address — they are not needed and not collected.
          </span>
          <textarea
            value={inboxScanSettings.betaAlertsNote}
            onChange={(event) =>
              onUpdateInboxScanSettings({ betaAlertsNote: event.target.value.slice(0, 500) })
            }
            rows={3}
            maxLength={500}
            placeholder="e.g. refund deadlines, price rises, subscriptions renewing soon"
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm leading-6 text-slate-200 placeholder:text-slate-600 focus:border-emerald-300/40 focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
          />
        </label>
      </CollapsibleSection>

      <CollapsibleSection
        eyebrow="Phone install"
        title="Install on your phone"
        badge="Works now"
        badgeTone="emerald"
        description="Add AdminAvenger to your home screen during the beta."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <h4 className="text-sm font-bold text-white">iPhone</h4>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open in Safari, tap Share, then Add to Home Screen.
            </p>
          </article>
          <article className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <h4 className="text-sm font-bold text-white">Android</h4>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open in Chrome, tap the three-dot menu, then Add to Home screen or Install app.
            </p>
          </article>
        </div>
        <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
          Saved data stays in the browser/app on that device. Clearing browser data or deleting the
          app can delete saved admin unless you export a backup.
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        eyebrow="Help & safety"
        title="What AdminAvenger can and cannot do"
        description="AdminAvenger prepares; you decide."
      >
        {controlledFeaturesEnabled ? (
          <div className="mb-4 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.07] p-4">
            <h4 className="text-sm font-bold text-white">Demo / tour</h4>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Try safe synthetic examples from the Golden Letter Corpus without using
              a real letter.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("demo_tour")}
              className="mt-3 min-h-11 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:border-cyan-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            >
              Open Demo / tour
            </button>
          </div>
        ) : null}
        <div className="mb-4 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.07] p-4">
          <h4 className="text-sm font-bold text-white">Trust &amp; safety</h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Read the practical guide to privacy, local downloads, dates, money,
            drafts, adviser packs, and what AdminAvenger cannot know.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("trust_safety")}
            className="mt-3 min-h-11 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:border-cyan-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
          >
            Open Trust &amp; safety
          </button>
        </div>
        <div className="mb-4 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.07] p-4">
          <h4 className="text-sm font-bold text-white">Free-Forever Covenant</h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Read the public promise about the individual core staying free, no ads,
            no selling user data, and no success fees.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("covenant")}
            className="mt-3 min-h-11 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:border-emerald-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
          >
            Read the Free-Forever Covenant
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {trustSections.map((section) => (
            <article
              key={section.title}
              className="rounded-lg border border-white/10 bg-slate-950/60 p-4"
            >
              <h4 className="text-sm font-bold text-white">{section.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-400">{section.body}</p>
            </article>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        eyebrow="Legal & safety"
        title="Terms & Safety Notice"
        description="Review what you agreed to, read each document, or reset acceptance for testing."
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onViewTermsAgain}
            className="min-h-11 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:border-emerald-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
          >
            View Terms &amp; Safety Notice again
          </button>
          <button
            type="button"
            onClick={onResetTermsAcceptance}
            className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-400/40"
          >
            Reset acceptance (testing)
          </button>
        </div>

        <p className="mt-4 text-sm font-bold text-white">Read an individual document</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {legalDocumentOrder.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveLegalDocument(id)}
              className="min-h-9 rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-200 underline decoration-slate-500 decoration-dotted underline-offset-4 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              {legalDocuments[id].title}
            </button>
          ))}
        </div>

        <p className="mt-4 max-w-3xl text-xs leading-5 text-slate-500">
          "Reset acceptance" clears your saved Terms &amp; Safety acceptance from this browser and
          shows the acceptance gate again next time the app loads. It does not delete your cases,
          drafts, or money-tracking entries.
        </p>
      </CollapsibleSection>

      {activeLegalDocument ? (
        <LegalDocumentViewer
          documentId={activeLegalDocument}
          onSelectDocument={setActiveLegalDocument}
          onClose={() => setActiveLegalDocument(undefined)}
        />
      ) : null}

      <CollapsibleSection
        eyebrow="Privacy"
        title="What is connected?"
        description="A plain-English summary of what stays on this device."
      >
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          No account, database, provider integration, autonomous agent, or action-sending workflow
          is connected. The inbox scan is a local preview using sample emails: it does not connect to
          Gmail or Outlook, and no real email tokens are stored. AdminAvenger does not email or text
          you, and never stores phone numbers or email addresses. Optional local Ollama testing only
          contacts an AI engine running on this device. The beta feedback note is saved only in this
          browser and included in the local backup. Clearing local data removes the saved workspace,
          validation notes, inbox scan preferences, and feedback from this browser. The local backup
          export is a JSON file for safekeeping; automatic import is not built in this prototype.
        </p>
      </CollapsibleSection>

      {import.meta.env.DEV ? (
        <CollapsibleSection
          eyebrow="Advanced"
          title="Founder tools"
          description="Prototype-only screens for testing and overview."
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="rounded-lg border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              Open dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate("validation")}
              className="rounded-lg border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              Open validation notes
            </button>
          </div>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
