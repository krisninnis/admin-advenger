type SafetySection = {
  eyebrow: string;
  title: string;
  body?: string;
  items?: string[];
};

type TrustSafetyViewProps = {
  onNavigateToSettings?: () => void;
};

const processSteps = [
  "You paste text, upload a file, or use a photo.",
  "AdminAvenger reads the text in your browser.",
  "It looks for useful details such as dates, money mentioned, references, evidence, and possible next steps.",
  "It prepares a result, checklist, or adviser pack.",
  "You decide what to do next.",
];

const limits = [
  "AdminAvenger does not contact anyone for you.",
  "It does not send emails or letters for you.",
  "It does not submit appeals, forms, journal messages, or other requests for you.",
  "It does not decide benefit eligibility.",
  "It does not decide whether a debt, parking charge, or legal-looking letter is correct.",
  "It does not predict outcomes.",
  "It does not replace a qualified adviser.",
  "It does not provide legal, benefits, debt, financial, medical, or immigration advice.",
];

const cannotKnow = [
  "whether an organisation has made the right decision",
  "whether benefit eligibility applies",
  "whether evidence is enough",
  "whether a qualified adviser would suggest a specific action",
  "whether a deadline has changed",
  "whether OCR or text extraction missed something",
];

const helpSignals = [
  "urgent deadlines",
  "court papers",
  "eviction or homelessness risk",
  "benefits stopped or reduced",
  "bailiff or enforcement letters",
  "immigration issues",
  "threats to safety",
  "anything you do not understand",
];

const controlChecklist = [
  "I can check the original letter.",
  "I can edit any draft before using it.",
  "I can decide who sees my adviser pack.",
  "I can choose not to act.",
  "I can ask someone for help.",
  "AdminAvenger does not send or submit anything for me.",
];

const safetySections: SafetySection[] = [
  {
    eyebrow: "Local-first",
    title: "Local-first and privacy",
    body:
      "AdminAvenger is designed to work locally first. In this version, you control what you enter, save, download, share, or delete. Adviser packs download to your device as Markdown. AdminAvenger does not upload adviser packs or send them anywhere.",
  },
  {
    eyebrow: "Dates",
    title: "Dates and deadlines",
    body:
      "Dates are extracted to help you notice them. They must be checked against the original letter before acting, because unclear text or OCR may be misread. You or someone helping you should verify dates first.",
  },
  {
    eyebrow: "Money",
    title: "Money mentioned",
    body:
      "Money is display-only. It is shown only because it appeared in the document or app output. AdminAvenger has not checked whether it is correct, owed, payable, a saving, or recoverable. It is not counted as savings or recovery.",
  },
  {
    eyebrow: "Preparation",
    title: "Drafts and adviser packs",
    body:
      "Drafts, checklists, and adviser packs are editable preparation. They are for reviewing yourself or taking to a trusted person, support worker, or adviser. Nothing has been sent or submitted by AdminAvenger. Review everything before using or sharing it.",
  },
];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 grid gap-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-200"
        >
          <span
            aria-hidden="true"
            className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoSection({ section }: { section: SafetySection }) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-6">
      <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
        {section.eyebrow}
      </p>
      <h3 className="mt-2 text-2xl font-bold text-white">{section.title}</h3>
      {section.body ? (
        <p className="mt-3 text-sm leading-6 text-slate-300">{section.body}</p>
      ) : null}
      {section.items ? <BulletList items={section.items} /> : null}
    </section>
  );
}

export function TrustSafetyView({ onNavigateToSettings }: TrustSafetyViewProps) {
  return (
    <article aria-labelledby="trust-safety-title" className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] p-5 sm:p-7">
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
          Practical trust guide
        </p>
        <h2
          id="trust-safety-title"
          className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl"
        >
          Trust &amp; safety
        </h2>
        <p className="mt-4 max-w-4xl text-xl font-bold leading-8 text-white">
          AdminAvenger helps prepare. You stay in control.
        </p>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-200">
          AdminAvenger helps you understand what a letter appears to be, gather key
          details, and prepare an editable checklist or adviser pack. It does not
          decide for you, send anything for you, or submit anything for you.
        </p>
      </header>

      <section className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          How it works
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">
          What happens when you use AdminAvenger
        </h3>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
          AdminAvenger uses cautious wording such as appears to and may. Check details
          against the original letter and ask someone you trust if you are unsure.
        </p>
        <ol className="mt-4 grid gap-3 md:grid-cols-5">
          {processSteps.map((step, index) => (
            <li
              key={step}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-200"
            >
              <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-xs font-black text-emerald-100">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-amber-200">
          Boundaries
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">
          What AdminAvenger does not do
        </h3>
        <BulletList items={limits} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {safetySections.map((section) => (
          <InfoSection key={section.title} section={section} />
        ))}
      </div>

      <section className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Limits of the read
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">
          What AdminAvenger cannot know
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          A letter or photo cannot show everything. AdminAvenger cannot know:
        </p>
        <BulletList items={cannotKnow} />
      </section>

      <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
          Local data
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">Want to clear local data?</h3>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
          You can clear AdminAvenger data saved in this browser from Settings. This
          does not delete files you already downloaded.
        </p>
        {onNavigateToSettings ? (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="mt-4 min-h-11 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:border-cyan-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
          >
            Open Settings
          </button>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-rose-300/20 bg-rose-300/[0.06] p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-rose-200">
            Extra help
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">When to get help</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Ask a qualified adviser, support worker, charity, local authority team, or
            someone you trust.
          </p>
          <BulletList items={helpSignals} />
        </section>

        <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
            Your control
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            User control checklist
          </h3>
          <BulletList items={controlChecklist} />
        </section>
      </div>
    </article>
  );
}
