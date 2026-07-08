import { useMemo, useState, type ReactNode } from "react";
import type {
  ResultDateView,
  ResultEvidenceView,
  ResultMoneyView,
  ResultViewModel,
} from "../lib/resultViewModel";

export type ResultCaseSheetAction = {
  label: string;
  onClick: () => void;
  emphasis?: "primary" | "secondary" | "quiet";
};

type ResultCaseSheetProps = {
  model: ResultViewModel;
  primaryAction?: ResultCaseSheetAction;
  secondaryActions?: ResultCaseSheetAction[];
  guidedNextStepButton?: ResultCaseSheetAction;
  onDownloadAdviserPack?: () => void;
  supportingDetailsOpen: boolean;
  onToggleSupportingDetails: () => void;
};

const limits = {
  dates: 3,
  money: 3,
  evidence: 5,
  questions: 5,
  risks: 4,
  uncertainty: 4,
  cannotKnow: 2,
};

const actionClasses = {
  primary:
    "border-emerald-300 bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/25 hover:bg-emerald-200",
  secondary:
    "border-white/10 bg-slate-950 text-slate-200 hover:border-white/25 hover:text-white",
  quiet:
    "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white",
};

const hasReferenceSignal = (item: ResultEvidenceView) =>
  /reference|ref|claim|case number|account|sender|provider|letter date/i.test(
    `${item.label} ${item.value}`,
  );

const visibleItems = <Item,>(items: Item[], limit: number, expanded: boolean) =>
  expanded ? items : items.slice(0, limit);

const uniqueTextItems = (items: string[]) => {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    const key = trimmed.toLowerCase().replace(/\s+/g, " ");

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    cleaned.push(trimmed);
  }

  return cleaned;
};

function ActionButton({ action }: { action: ResultCaseSheetAction }) {
  const emphasis = action.emphasis ?? "secondary";

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={`min-h-11 rounded-lg border px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${actionClasses[emphasis]}`}
    >
      {action.label}
    </button>
  );
}

function Section({
  title,
  children,
  tone = "slate",
}: {
  title: string;
  children: ReactNode;
  tone?: "slate" | "cyan" | "amber" | "emerald";
}) {
  const toneClasses = {
    slate: "border-white/10 bg-slate-950/55",
    cyan: "border-cyan-300/20 bg-cyan-300/[0.06]",
    amber: "border-amber-300/25 bg-amber-300/[0.07]",
    emerald: "border-emerald-300/20 bg-emerald-300/[0.06]",
  };

  return (
    <section className={`rounded-lg border p-4 sm:p-5 ${toneClasses[tone]}`}>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <div className="mt-3 text-sm leading-6 text-slate-300">{children}</div>
    </section>
  );
}

function ShowMoreButton({
  expanded,
  onClick,
  hiddenCount,
}: {
  expanded: boolean;
  onClick: () => void;
  hiddenCount: number;
}) {
  if (hiddenCount <= 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
    >
      {expanded ? "Show less" : `Show more (${hiddenCount})`}
    </button>
  );
}

function DateList({ dates }: { dates: ResultDateView[] }) {
  const [expanded, setExpanded] = useState(false);
  const items = visibleItems(dates, limits.dates, expanded);

  if (dates.length === 0) {
    return (
      <p>
        No clear date was found. Check the original letter for dates, periods,
        appointments, or reply dates.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((date) => (
          <li key={date.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
            <p className="font-semibold text-white">
              {date.label}: {date.value}
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-100">
              Check against the original letter. {date.caution}
            </p>
          </li>
        ))}
      </ul>
      <ShowMoreButton
        expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        hiddenCount={dates.length - limits.dates}
      />
    </>
  );
}

function MoneyList({ money }: { money: ResultMoneyView[] }) {
  const [expanded, setExpanded] = useState(false);
  const items = visibleItems(money, limits.money, expanded);

  if (money.length === 0) {
    return (
      <p>
        No money amount was listed in the composed result. If the letter mentions
        money, check the original letter before deciding what it means.
        Money is display-only if shown by AdminAvenger. AdminAvenger has not
        checked whether any amount is correct or owed. It is not counted as a
        saving or recovery.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((line) => (
          <li key={line.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
            <p className="font-semibold text-white">
              {line.label}: {line.amountText}
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-100">
              Display-only. AdminAvenger has not checked whether this is correct or
              owed. It is not counted as a saving or recovery.
            </p>
          </li>
        ))}
      </ul>
      <ShowMoreButton
        expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        hiddenCount={money.length - limits.money}
      />
    </>
  );
}

function EvidenceList({
  found,
  toGather,
}: {
  found: ResultEvidenceView[];
  toGather: ResultEvidenceView[];
}) {
  const [expanded, setExpanded] = useState(false);
  const evidenceItems = [
    ...found.map((item) => `${item.label}: ${item.value}`),
    ...toGather.map((item) => `To gather: ${item.value}`),
  ];
  const deduped = uniqueTextItems(evidenceItems);
  const items = visibleItems(deduped, limits.evidence, expanded);

  if (deduped.length === 0) {
    return <p>No evidence list was generated. Check the original letter and your records.</p>;
  }

  return (
    <>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <ShowMoreButton
        expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        hiddenCount={deduped.length - limits.evidence}
      />
    </>
  );
}

function TextList({
  items,
  emptyText,
  limit,
  minimumVisible = 0,
}: {
  items: string[];
  emptyText: string;
  limit: number;
  minimumVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const deduped = uniqueTextItems(items);
  const effectiveLimit = Math.max(limit, minimumVisible);
  const visible = visibleItems(deduped, effectiveLimit, expanded);

  if (deduped.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <>
      <ul className="space-y-2">
        {visible.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <ShowMoreButton
        expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        hiddenCount={deduped.length - effectiveLimit}
      />
    </>
  );
}

export function ResultCaseSheet({
  model,
  primaryAction,
  secondaryActions = [],
  guidedNextStepButton,
  onDownloadAdviserPack,
  supportingDetailsOpen,
  onToggleSupportingDetails,
}: ResultCaseSheetProps) {
  const references = useMemo(
    () => model.evidenceFound.filter(hasReferenceSignal).slice(0, 3),
    [model.evidenceFound],
  );
  const checkFirstItems = uniqueTextItems([
    ...model.keyDates.slice(0, 2).map((date) => `${date.label}: ${date.value}`),
    ...references.map((item) => `${item.label}: ${item.value}`),
    ...model.moneyMentioned.slice(0, 2).map((line) => `${line.label}: ${line.amountText}`),
    "Check these details against the original letter before acting.",
  ]);
  const allActions = [primaryAction, ...secondaryActions].filter(
    (action): action is ResultCaseSheetAction => Boolean(action),
  );

  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/90 p-4 shadow-2xl shadow-slate-950/30 sm:p-6">
      <header className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          What AdminAvenger found
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {model.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-200">{model.summary}</p>
          </div>
          {model.primaryStatusLabel ? (
            <span className="rounded-full border border-emerald-300/30 bg-slate-950/70 px-3 py-1 text-xs font-bold text-emerald-100">
              {model.primaryStatusLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50">
          Preparation only. Nothing has been sent. Nothing has been submitted.
          AdminAvenger does not contact anyone for you. AdminAvenger helps
          prepare. You stay in control.
        </p>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Section title="Best next move" tone="cyan">
          {model.bestNextMove ? (
            <div className="space-y-3">
              <p className="text-base font-bold text-white">{model.bestNextMove.label}</p>
              <p>{model.bestNextMove.description}</p>
              <p className="rounded-lg border border-cyan-300/20 bg-slate-950/45 p-3 text-cyan-50/90">
                {model.bestNextMove.whyThisHelps}
              </p>
            </div>
          ) : (
            <p>Check the sender, date, reference, and requested action before deciding what to do.</p>
          )}
        </Section>

        <Section title="What to check first" tone="amber">
          <ul className="space-y-2">
            {checkFirstItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      </div>

      {allActions.length > 0 || guidedNextStepButton ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/55 p-4">
          <p className="text-sm font-bold text-white">Next action</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allActions.map((action) => (
              <ActionButton key={action.label} action={action} />
            ))}
            {guidedNextStepButton ? <ActionButton action={guidedNextStepButton} /> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Section title="Dates to check">
          <DateList dates={model.keyDates} />
        </Section>

        <Section title="Money mentioned">
          <MoneyList money={model.moneyMentioned} />
        </Section>

        <Section title="Evidence / documents to bring">
          <EvidenceList found={model.evidenceFound} toGather={model.evidenceToGather} />
        </Section>

        <Section title="Questions to answer">
          <TextList
            items={model.questionsToAnswer}
            emptyText="No extra questions were listed. Check the original letter and ask someone you trust if unsure."
            limit={limits.questions}
          />
        </Section>

        <Section title="What AdminAvenger cannot know" tone="amber">
          <TextList
            items={model.cannotKnow}
            emptyText="AdminAvenger cannot verify anything outside the message, file, or photo you provided."
            limit={limits.cannotKnow}
            minimumVisible={2}
          />
        </Section>

        <Section title="Uncertainty / double-check" tone="amber">
          <TextList
            items={[...model.uncertainty, ...model.risks]}
            emptyText="Check the original document before deciding what to do."
            limit={limits.uncertainty}
          />
        </Section>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Section title="Draft/checklist" tone="emerald">
          {model.draftOrChecklist ? (
            <div>
              <p className="font-semibold text-white">{model.draftOrChecklist.title}</p>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-100">
                {model.draftOrChecklist.body}
              </pre>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Editable preparation. Review before using or sharing.
              </p>
            </div>
          ) : (
            <p>
              No draft or checklist was included in this result. That can be normal if
              the safest next step is to check facts first.
            </p>
          )}
        </Section>

        <Section title="Adviser export action" tone="cyan">
          <p id="result-case-sheet-adviser-helper">
            Creates a Markdown file you can save, print, or share with someone you
            trust. AdminAvenger does not send it anywhere.
          </p>
          {onDownloadAdviserPack ? (
            <button
              type="button"
              aria-describedby="result-case-sheet-adviser-helper"
              onClick={onDownloadAdviserPack}
              className="mt-4 min-h-11 w-full rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto"
            >
              Download adviser pack
            </button>
          ) : null}
        </Section>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/55 p-4">
        <button
          type="button"
          onClick={onToggleSupportingDetails}
          className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
        >
          {supportingDetailsOpen ? "Hide supporting detail" : "Show supporting detail"}
        </button>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Supporting detail shows the underlying action pack, next-step planner, and
          source-style panels for checking.
        </p>
      </div>
    </article>
  );
}
