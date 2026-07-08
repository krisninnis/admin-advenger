import type { ReactNode } from "react";
import { useState } from "react";
import type { StrategicNextStepPlan } from "../lib/strategicNextStep";

type StrategicNextStepPanelProps = {
  plan: StrategicNextStepPlan;
};

type TextListProps = {
  items: string[];
  emptyText: string;
  limit?: number;
  expanded?: boolean;
};

const visibleItems = <Item,>(items: Item[], limit: number | undefined, expanded: boolean) =>
  expanded || limit === undefined ? items : items.slice(0, limit);

const TextList = ({ items, emptyText, limit, expanded = false }: TextListProps) => {
  const itemsToShow = visibleItems(items, limit, expanded);

  return itemsToShow.length > 0 ? (
    <ul className="space-y-2">
      {itemsToShow.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="text-slate-400">{emptyText}</p>
  );
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
      <h4 className="text-sm font-bold uppercase tracking-wider text-violet-100">{title}</h4>
      <div className="mt-3 text-sm leading-6 text-slate-200">{children}</div>
    </section>
  );
}

export function StrategicNextStepPanel({ plan }: StrategicNextStepPanelProps) {
  const [showMore, setShowMore] = useState(false);
  const otherSafeMoves = visibleItems(plan.otherSafeMoves, 2, showMore);
  const hasMore =
    plan.otherSafeMoves.length > otherSafeMoves.length ||
    plan.movesToAvoid.length > 5 ||
    plan.missingInformation.length > 5 ||
    plan.whenToGetAdvice.length > 4 ||
    plan.cannotKnow.length > 2 ||
    plan.uncertainty.length > 0;

  return (
    <section className="rounded-lg border border-violet-300/25 bg-violet-300/[0.07] p-5 shadow-xl shadow-slate-950/15 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">{plan.title}</h3>
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
            {otherSafeMoves.map((move) => (
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
            limit={5}
            expanded={showMore}
          />
        </Section>

        <Section title="What to check first">
          <TextList
            items={plan.missingInformation}
            emptyText="Check the sender, date, reference, requested action, and any deadline."
            limit={5}
            expanded={showMore}
          />
        </Section>

        <Section title="When to get advice">
          <TextList
            items={plan.whenToGetAdvice}
            emptyText="Get advice if the stakes feel serious or the deadline is unclear."
            limit={4}
            expanded={showMore}
          />
        </Section>

        <Section title="What AdminAvenger cannot know">
          <TextList
            items={plan.cannotKnow}
            emptyText="AdminAvenger cannot verify anything outside the message you provided."
            limit={2}
            expanded={showMore}
          />
        </Section>

        {showMore ? (
          <Section title="Uncertainty">
            <TextList
              items={plan.uncertainty}
              emptyText="Check the original document before you act."
            />
          </Section>
        ) : null}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setShowMore((current) => !current)}
          className="mt-4 min-h-11 rounded-lg border border-violet-300/30 bg-violet-300/10 px-4 py-3 text-sm font-bold text-violet-50 transition hover:border-violet-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-300/40"
        >
          {showMore ? "Show less" : "Show more"}
        </button>
      ) : null}

      <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold leading-6 text-amber-50">
        {plan.safetyNotes[0]}
      </p>
    </section>
  );
}
