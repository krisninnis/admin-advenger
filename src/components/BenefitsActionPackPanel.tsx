import type { ReactNode } from "react";
import { useState } from "react";
import type { BenefitsActionPack } from "../lib/benefitsActionPack";

type BenefitsActionPackPanelProps = {
  pack: BenefitsActionPack;
};

type SectionProps = {
  title: string;
  children: ReactNode;
};

const Section = ({ title, children }: SectionProps) => (
  <section className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
    <h4 className="text-sm font-bold uppercase tracking-wider text-sky-100">{title}</h4>
    <div className="mt-3 text-sm leading-6 text-slate-200">{children}</div>
  </section>
);

const TextList = ({ items, emptyText }: { items: string[]; emptyText: string }) =>
  items.length > 0 ? (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="text-slate-400">{emptyText}</p>
  );

export function BenefitsActionPackPanel({ pack }: BenefitsActionPackPanelProps) {
  const [showFullPack, setShowFullPack] = useState(false);

  return (
    <section className="rounded-lg border border-sky-300/25 bg-sky-300/[0.07] p-5 shadow-xl shadow-slate-950/15 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-sky-300">
            Benefits Action Pack
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">{pack.title}</h3>
          <p className="mt-2 max-w-3xl text-base leading-7 text-sky-50/85">{pack.summary}</p>
        </div>
        <span className="rounded-full border border-sky-300/25 bg-slate-950/70 px-3 py-1 text-xs font-bold text-sky-100">
          Human checks before acting
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Section title="What this appears to be">
          <p>{pack.documentStage}</p>
          <p className="mt-2 text-slate-400">Check the letter to confirm the exact stage.</p>
        </Section>

        <Section title="Possible dates to check">
          {pack.possibleDatesToCheck.length > 0 ? (
            <ul className="space-y-3">
              {pack.possibleDatesToCheck.map((date) => (
                <li key={date.id}>
                  <span className="font-semibold text-white">{date.label}:</span> {date.value}
                  <p className="mt-1 text-xs leading-5 text-amber-100">{date.caution}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">
              No clear date was extracted. Check the letter for any deadline or appointment date.
            </p>
          )}
        </Section>

        <Section title="Money mentioned">
          {pack.moneyMentioned.length > 0 ? (
            <ul className="space-y-3">
              {pack.moneyMentioned.map((line) => (
                <li key={line.id}>
                  <span className="font-semibold text-white">{line.label}:</span> {line.amountText}
                  <p className="mt-1 text-xs leading-5 text-amber-100">{line.caution}</p>
                  <p className="text-xs leading-5 text-slate-400">
                    Not counted in savings, recovered money, or the money tracker.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">
              No money amount was extracted. AdminAvenger has not counted any savings or recovery.
            </p>
          )}
        </Section>

        <Section title="Evidence to gather">
          <TextList
            items={pack.evidenceMissing}
            emptyText="No missing evidence was listed, but check the letter and your records."
          />
        </Section>

        <Section title="Questions to answer">
          {pack.questionsToAnswer.length > 0 ? (
            <ul className="space-y-2">
              {pack.questionsToAnswer.map((question) => (
                <li key={question.id}>{question.question}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">
              No extra questions were generated. You still decide what to check next.
            </p>
          )}
        </Section>

        <Section title="What AdminAvenger cannot know">
          <TextList
            items={pack.cannotKnow}
            emptyText="AdminAvenger cannot verify anything outside the text you provided."
          />
        </Section>
      </div>

      <button
        type="button"
        onClick={() => setShowFullPack((current) => !current)}
        className="mt-4 min-h-11 rounded-lg border border-sky-300/30 bg-sky-300/10 px-4 py-3 text-sm font-bold text-sky-50 transition hover:border-sky-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300/40"
      >
        {showFullPack ? "Hide full action pack" : "Show full action pack"}
      </button>

      {showFullPack ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Section title="What matters">
            <TextList
              items={pack.whatMatters}
              emptyText="No specific points were extracted. Check the letter before acting."
            />
          </Section>

          <Section title="Evidence already seen">
            {pack.evidenceFound.length > 0 ? (
              <ul className="space-y-2">
                {pack.evidenceFound.map((item) => (
                  <li key={item.id}>
                    <span className="font-semibold text-white">{item.label}:</span> {item.value}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">
                The key dates and amounts are listed in their own sections above. Add anything else
                from the letter you think matters.
              </p>
            )}
          </Section>

          <Section title="Risks to be aware of">
            <TextList
              items={pack.risks}
              emptyText="No specific risks were listed, but check the letter and any deadlines carefully."
            />
          </Section>

          <Section title="Uncertainty">
            <TextList
              items={pack.uncertainty}
              emptyText="No extra uncertainty was listed. Check the original letter before acting."
            />
          </Section>

          <Section title="Next safe step">
            <p>{pack.nextSafeStep}</p>
          </Section>

          <Section title="Draft/checklist if available">
            {pack.draftOrChecklist ? (
              <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-100">
                {pack.draftOrChecklist}
              </pre>
            ) : (
              <p className="text-slate-400">
                No draft or checklist is available yet. Review the evidence and questions first.
              </p>
            )}
          </Section>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
        <p>
          AdminAvenger prepares and explains. It does not give benefits, legal, debt, or
          financial advice, and it does not contact anyone for you.
        </p>
      </div>
    </section>
  );
}
