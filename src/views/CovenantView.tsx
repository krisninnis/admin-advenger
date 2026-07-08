const freePromises = [
  "Any individual can check a letter for free, forever.",
  "Safety information is never paywalled.",
  "Deadlines and warnings are never paywalled.",
  "Export and delete stay available.",
  "The core individual loop stays free: check a letter, understand what it appears to be, see key dates, prepare a draft, save, export, or delete.",
];

const neverMonetisePromises = [
  "No advertising.",
  "No selling, renting, or sharing user data.",
  "No success fees.",
  "No claims-company referral payments.",
  "No urgency upsells.",
  "No premium confidence.",
  "No paywalling safety or deadlines.",
  "No outcome-based pricing on disputes or appeals.",
];

const organisationExamples = [
  "support-worker workflows",
  "adviser pack workflows",
  "training and support for organisations",
  "self-hosting for trusted organisations",
  "grants",
  "local authority and housing association pilots",
];

function PromiseList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 grid gap-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-200"
        >
          <span
            aria-hidden="true"
            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-300"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function CovenantView() {
  return (
    <article aria-labelledby="covenant-title" className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-5 sm:p-7">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          Public trust promise
        </p>
        <h2
          id="covenant-title"
          className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl"
        >
          The AdminAvenger Free-Forever Covenant
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">
          AdminAvenger helps people understand confusing letters and prepare safe next
          steps. It is built for people who feel overwhelmed by admin. It is not a
          lawyer, financial adviser, benefits adviser, or claims company. It does not
          send, submit, claim, make payments, or contact anyone for you.
        </p>
      </header>

      <section className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
          The principle
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">
          AdminAvenger helps prepare. You stay in control.
        </h3>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
          The app helps you understand what a letter appears to be, gather key
          details, and prepare an editable draft or checklist. It does not decide for
          you, send anything for you, or submit anything for you.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            "Nothing is sent without you choosing to send it.",
            "Nothing is submitted without you choosing to submit it.",
            "You decide what to save, send, set aside, delete, or act on.",
          ].map((item) => (
            <p
              key={item}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-200"
            >
              {item}
            </p>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
            Free forever
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">The individual core stays free</h3>
          <PromiseList items={freePromises} />
        </section>

        <section className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-rose-200">
            Never monetise
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            What AdminAvenger will not turn into
          </h3>
          <PromiseList items={neverMonetisePromises} />
        </section>
      </div>

      <section className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-amber-200">
          Funding path
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">How this could be funded</h3>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
          The individual core stays free. Future organisation features may be paid,
          but they must not remove anything promised to individuals.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {organisationExamples.map((item) => (
            <li
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-200"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Legal status
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">A mission direction, not a status claim</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            AdminAvenger is working toward a mission-locked, social-impact structure.
            It is not claiming to be a registered charity or CIC yet. Formal legal
            structure decisions need professional advice. This page explains the
            product promise and mission direction.
          </p>
        </section>

        <section className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Changes
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">Changes should be public</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            If these promises change, the change should be public and explained. You
            should not have to guess what changed.
          </p>
        </section>
      </div>
    </article>
  );
}
