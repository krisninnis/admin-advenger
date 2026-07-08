import type { ReactNode } from "react";
import type { StrategicNextStepPlan } from "../lib/strategicNextStep";

type StrategicNextStepPanelProps = {
  plan: StrategicNextStepPlan;
};

type TextListProps = {
  items: string[];
  emptyText: string;
};

const TextList = ({ items, emptyText }: TextListProps) =>
  items.length > 0 ? (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="text-slate-400">{emptyText}</p>
  );

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
      <h4 className="text-sm font-bold uppercase tracking-wider text-violet-100">{title}</h4>
      <div className="mt-3 text-sm leading-6 text-slate-200">{children}</div>
    </section>
  );
}

export function StrategicNextStepPanel({ plan }: StrategicNextStepPanelProps) {
  return (
    <section className="rounded-lg border border-violet-300/25 bg-violet-300/[0.07] p-5 shadow-xl shadow-slate-950/15 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-violet-300">
            Next step planner
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">{plan.title}</h3>
          <p className="mt-2 max-w-3xl text-base leading-7 text-violet-50/85">
            {plan.plainEnglishSummary}
          </p>
        </div>
        <span className="rounded-full border border-violet-300/25 bg-slate-950/70 px-3 py-1 text-xs font-bold text-violet-100">
          Review before acting
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Section title="What is going on">
          <p>{plan.userGoal}</p>
        </Section>

        <Section title="Who is involved">
          <ul className="space-y-3">
            {plan.actors.map((actor) => (
              <li key={actor.label}>
                <p className="font-semibold text-white">{actor.label}</p>
                <p>{actor.role}</p>
                <p className="text-slate-400">{actor.likelyGoal}</p>
                {actor.caution ? <p className="mt-1 text-amber-100">{actor.caution}</p> : null}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Your safest move">
          <p className="font-semibold text-white">{plan.safestMove.label}</p>
          <p className="mt-2">{plan.safestMove.description}</p>
        </Section>

        <Section title="Why this is safer">
          <p>{plan.safestMove.whyThisHelps}</p>
          <p className="mt-2 text-slate-400">
            AdminAvenger has not sent anything. You decide whether to use this step.
          </p>
        </Section>

        <Section title="Other safe options">
          <ul className="space-y-3">
            {plan.otherSafeMoves.map((move) => (
              <li key={move.label}>
                <p className="font-semibold text-white">{move.label}</p>
                <p>{move.description}</p>
                <p className="text-slate-400">{move.whyThisHelps}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="What not to rush">
          <TextList
            items={plan.movesToAvoid}
            emptyText="Do not rush anything that commits you before you have checked the document."
          />
        </Section>

        <Section title="What to check first">
          <TextList
            items={plan.missingInformation}
            emptyText="Check the sender, date, reference, requested action, and any deadline."
          />
        </Section>

        <Section title="When to get advice">
          <TextList
            items={plan.whenToGetAdvice}
            emptyText="Get advice if the stakes feel serious or the deadline is unclear."
          />
        </Section>

        <Section title="What AdminAvenger cannot know">
          <TextList
            items={plan.cannotKnow}
            emptyText="AdminAvenger cannot verify anything outside the message you provided."
          />
        </Section>

        <Section title="Uncertainty">
          <TextList
            items={plan.uncertainty}
            emptyText="Check the original document before you act."
          />
        </Section>
      </div>

      <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold leading-6 text-amber-50">
        {plan.safetyNotes[0]}
      </p>
    </section>
  );
}
