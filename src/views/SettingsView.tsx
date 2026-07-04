import { DataControls } from "../components/DataControls";
import type { AppView } from "../components/Sidebar";
import type {
  InboxScanNotificationMethod,
  InboxScanSettings,
} from "../lib/inboxScanStorage";

type SettingsViewProps = {
  onResetDemoData: () => void;
  onClearLocalData: () => void;
  onDownloadBackup: () => void;
  dataControlMessage?: string;
  onNavigate: (view: AppView) => void;
  inboxScanSettings: InboxScanSettings;
  onUpdateInboxScanSettings: (updates: Partial<InboxScanSettings>) => void;
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

const notificationMethods: Array<{
  value: InboxScanNotificationMethod;
  label: string;
  helper: string;
  disabled: boolean;
}> = [
  { value: "in_app", label: "In app only", helper: "Works now", disabled: false },
  { value: "email_later", label: "Email", helper: "Coming later", disabled: true },
  { value: "text_later", label: "Text", helper: "Coming later", disabled: true },
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
      "AdminAvenger does not send messages, cancel subscriptions, submit claims, contact companies, confirm fraud, give legal advice, or guarantee money back.",
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
      "AdminAvenger flags warning signs. It cannot prove an email is definitely a scam or definitely safe.",
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
}: SettingsViewProps) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          Settings / Data
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Local data controls</h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-slate-400">
          Everything you paste or save stays in this browser on this device. Clearing browser data
          will delete it. Use Download local backup to keep a copy.
        </p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
          You can remove account numbers or passwords before pasting. AdminAvenger does not need
          them to help.
        </p>
      </header>

      <DataControls
        onResetDemoData={onResetDemoData}
        onClearLocalData={onClearLocalData}
        onDownloadBackup={onDownloadBackup}
        statusMessage={dataControlMessage}
      />

      <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-5 shadow-xl shadow-slate-950/10">
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
          Phone beta
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">Install on your phone</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          You can add AdminAvenger to your phone home screen during the beta.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
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
          Saved data stays in the browser/app on that device. Clearing browser data or deleting
          the app can delete saved admin unless you export a backup.
        </p>
      </section>

      <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] p-5 shadow-xl shadow-slate-950/10">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
            Help & safety
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            What AdminAvenger can and can&apos;t do
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Plain-English guardrails for private beta. AdminAvenger prepares; you decide.
          </p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
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
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
        <h3 className="text-xl font-semibold text-white">Advanced / founder tools</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Prototype-only screens for testing and overview. They are hidden from the main navigation
          so normal use starts with checking something.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
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
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-white">Inbox scan</h3>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
            Prototype preview only — no email account is connected yet
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          AdminAvenger should only scan with your permission. In a future connected version, you
          will be able to disconnect, delete scan data, and choose what types of alerts you receive.
        </p>

        <div className="mt-5 grid gap-3">
          <ToggleRow
            label="Inbox scan preview"
            description="Show the local inbox scan preview on the Home screen. This uses sample emails only."
            checked={inboxScanSettings.previewEnabled}
            onChange={(checked) => onUpdateInboxScanSettings({ previewEnabled: checked })}
          />
          <ToggleRow
            label="Startup prompt"
            description="Show the optional inbox scan prompt when you open Home."
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
            label="Notify me about possible savings"
            description="Highlight refunds, subscriptions, price rises, and possible recovery in the preview."
            checked={inboxScanSettings.notifySavings}
            onChange={(checked) => onUpdateInboxScanSettings({ notifySavings: checked })}
          />
          <ToggleRow
            label="Notify me about suspicious emails"
            description="Highlight emails that show warning signs so you can verify before acting."
            checked={inboxScanSettings.notifySuspicious}
            onChange={(checked) => onUpdateInboxScanSettings({ notifySuspicious: checked })}
          />
        </div>

        <div className="mt-5">
          <p className="text-sm font-bold text-white">Notification method</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Email and text notifications are not built yet. Nothing is sent in this prototype.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {notificationMethods.map((method) => {
              const isActive = inboxScanSettings.notificationMethod === method.value;

              return (
                <button
                  key={method.value}
                  type="button"
                  disabled={method.disabled}
                  onClick={() =>
                    method.disabled
                      ? undefined
                      : onUpdateInboxScanSettings({ notificationMethod: method.value })
                  }
                  className={`rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                    method.disabled
                      ? "cursor-not-allowed border-white/5 bg-slate-950/40 text-slate-500"
                      : isActive
                        ? "border-emerald-300/60 bg-emerald-300/12 text-white"
                        : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="block text-sm font-bold">{method.label}</span>
                  <span
                    className={`mt-1 block text-xs font-semibold ${
                      method.disabled ? "text-amber-300/80" : "text-slate-500"
                    }`}
                  >
                    {method.helper}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
        <h3 className="text-xl font-semibold text-white">Privacy note</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          No account, database, provider integration, autonomous agent, or action-sending workflow
          is connected. The inbox scan is a local prototype using sample emails: it does not connect
          to Gmail or Outlook, and no real email tokens are stored. Optional local Ollama testing
          only contacts an AI engine running on this device. Clearing local data removes the saved
          prototype workspace, validation notes, and feedback from this browser. Export anything
          useful before clearing data you want to keep. The local backup export is a JSON file for
          safekeeping; automatic import is not built in this prototype.
        </p>
      </section>
    </div>
  );
}
