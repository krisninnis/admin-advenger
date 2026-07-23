import { useMemo, useState, type ReactNode } from "react";
import type { AdviserExportPack } from "../lib/adviserExportPack";
import type { BenefitsActionPack } from "../lib/benefitsActionPack";
import { buildCaseProgress } from "../lib/caseProgress";
import type { CommunityHelperPack } from "../lib/communityHelperPack";
import type { DecisionResult } from "../lib/decisionEngine/types";
import type {
  ResultDateView,
  ResultEvidenceView,
  ResultMoneyView,
  ResultViewModel,
} from "../lib/resultViewModel";
import type { StrategicNextStepPlan } from "../lib/strategicNextStep";
import type { WorkplaceSupportPack } from "../lib/workplaceSupportPack";
import { CaseProgressCard } from "./CaseProgressCard";
import { CopyButton } from "./CopyButton";

export type ResultCaseSheetAction = {
  label: string;
  onClick: () => void;
  emphasis?: "primary" | "secondary" | "quiet";
};

type ResultCaseSheetProps = {
  model: ResultViewModel;
  // Optional extra context used only to build the preparation-progress
  // checklist (src/lib/caseProgress.ts). None of this changes decision-engine
  // behaviour, OCR/photo behaviour, or routing/classification - it only lets
  // the checklist wording match the document family already computed
  // upstream.
  decisionResult?: DecisionResult;
  benefitsActionPack?: BenefitsActionPack | null;
  strategicNextStepPlan?: StrategicNextStepPlan;
  adviserExportPack?: AdviserExportPack;
  workplaceSupportPack?: WorkplaceSupportPack;
  communityHelperPack?: CommunityHelperPack;
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

const getSectionItems = (model: ResultViewModel, id: string) =>
  model.sections.find((section) => section.id === id)?.items ?? [];

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

const isCancellationSwitchingRightsTopic = (item: string) =>
  /\b(?:cancel(?:lation)?|switch(?:ing)?)\b/i.test(item) &&
  /\brights?\b/i.test(item);

const topicDedupedItems = (items: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase().replace(/\s+/g, " ");

    if (seen.has(key)) {
      continue;
    }

    if (isCancellationSwitchingRightsTopic(trimmed)) {
      const topicKey = "__cancellation_switching_rights";
      if (seen.has(topicKey)) {
        continue;
      }
      seen.add(topicKey);
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
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

const MAX_COMPACT_TOPICS = 3;

function CompactHaveReadyList({ items }: { items: string[] }) {
  const topics = topicDedupedItems(items);
  const visible = topics.slice(0, MAX_COMPACT_TOPICS);

  if (topics.length === 0) {
    return (
      <p>Nothing extra needs gathering right now. Keep the original safe.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {visible.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function RequirementEvidenceMap({
  items,
}: {
  items: NonNullable<ResultViewModel["careerRequirementEvidenceMap"]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = visibleItems(items, 3, expanded);

  if (items.length === 0) {
    return (
      <p>
        No requirement-by-requirement map was prepared. Review the advert
        requirements and CV evidence manually.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {visible.map((item) => (
          <li key={item.requirement} className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
            <p className="text-sm font-bold text-white">Requirement</p>
            <p className="mt-1">{item.requirement}</p>
            <p className="mt-3 text-sm font-bold text-white">
              Possible CV evidence to consider
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {item.possibleEvidence.map((evidence) => (
                <li key={evidence}>{evidence}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-bold text-white">What to prepare</p>
            <p className="mt-1">{item.exampleToPrepare}</p>
            <p className="mt-3 text-xs leading-5 text-amber-100">
              {item.verificationNote}
            </p>
          </li>
        ))}
      </ul>
      <ShowMoreButton
        expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        hiddenCount={items.length - 3}
      />
    </>
  );
}

export function ResultCaseSheet({
  model,
  decisionResult,
  benefitsActionPack,
  strategicNextStepPlan,
  adviserExportPack,
  workplaceSupportPack,
  communityHelperPack,
  primaryAction,
  secondaryActions = [],
  guidedNextStepButton,
  onDownloadAdviserPack,
  supportingDetailsOpen,
  onToggleSupportingDetails,
}: ResultCaseSheetProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const references = useMemo(
    () => model.evidenceFound.filter(hasReferenceSignal).slice(0, 3),
    [model.evidenceFound],
  );
  const isCareerSupportResult = model.resultKind === "career_support";
  const isCareerMatchResult = model.sections.some((section) => section.id === "career-requirements-found");
  const caseProgress = useMemo(
    () =>
      buildCaseProgress({
        resultViewModel: model,
        decisionResult,
        benefitsActionPack,
        strategicNextStepPlan,
        adviserExportPack,
        workplaceSupportPack,
        communityHelperPack,
      }),
    [
      model,
      decisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
      adviserExportPack,
      workplaceSupportPack,
      communityHelperPack,
    ],
  );
  const checkFirstItems = uniqueTextItems(
    isCareerSupportResult
      ? [
          ...getSectionItems(model, "career-next-steps").slice(0, 3),
          "Review every claim before using or sharing it.",
        ]
      : [
          ...model.keyDates.slice(0, 2).map((date) => `${date.label}: ${date.value}`),
          ...references.map((item) => `${item.label}: ${item.value}`),
          ...model.moneyMentioned.slice(0, 2).map((line) => `${line.label}: ${line.amountText}`),
          "Check these details against the original letter before acting.",
        ],
  );
  const allActions = [primaryAction, ...secondaryActions].filter(
    (action): action is ResultCaseSheetAction => Boolean(action),
  );

  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/90 p-4 shadow-2xl shadow-slate-950/30 sm:p-6">
      <header className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          Your result at a glance
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            {!isCareerSupportResult ? (
              <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
                What is this?
              </p>
            ) : null}
            <h2
              className={`${isCareerSupportResult ? "" : "mt-1 "}text-2xl font-black tracking-tight text-white sm:text-3xl`}
            >
              {model.title}
            </h2>
            {model.directAnswer ? (
              <p className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50">
                {model.directAnswer}
              </p>
            ) : null}
            {!isCareerSupportResult ? (
              <p className="mt-3 text-sm font-bold uppercase tracking-widest text-cyan-300">
                What changed or matters?
              </p>
            ) : null}
            <p
              className={`${isCareerSupportResult ? "mt-3" : "mt-1"} text-base leading-7 text-slate-200`}
            >
              {model.summary}
            </p>
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

      {isCareerSupportResult ? (
        <>
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
                <p>Review the target role, evidence, gaps, and wording before using or sharing anything.</p>
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
            {isCareerMatchResult ? (
              <Section title="Requirement-by-requirement evidence map" tone="cyan">
                <RequirementEvidenceMap items={model.careerRequirementEvidenceMap ?? []} />
              </Section>
            ) : null}

            {(isCareerMatchResult
              ? [
                  "career-role-clues",
                  "career-requirements-found",
                  "career-cv-evidence-may-match",
                  "career-strong-evidence-to-consider",
                  "career-gaps",
                  "career-advert-wording-to-review",
                  "career-examples-to-prepare",
                  "career-claims-to-verify",
                  "career-next-steps",
                ]
              : [
                  "career-target-roles",
                  "career-strengths",
                  "career-evidence",
                  "career-projects",
                  "career-experience",
                  "career-education",
                  "career-gaps",
                  "career-safer-rewrites",
                ]
            ).map((sectionId) => {
              const section = model.sections.find((item) => item.id === sectionId);

              return section ? (
                <Section key={section.id} title={section.title} tone={section.id === "career-gaps" ? "amber" : "slate"}>
                  <TextList
                    items={section.items}
                    emptyText="No item was found for this section. Review the CV text manually."
                    limit={limits.evidence}
                  />
                </Section>
              ) : null;
            })}

            <Section title="What AdminAvenger cannot know" tone="amber">
              <TextList
                items={model.cannotKnow}
                emptyText="AdminAvenger cannot verify experience, qualifications, dates, or employer preferences."
                limit={limits.cannotKnow}
                minimumVisible={2}
              />
            </Section>

            <Section title="Uncertainty / double-check" tone="amber">
              <TextList
                items={[...model.uncertainty, ...model.risks]}
                emptyText="Review the CV or career material before using it."
                limit={limits.uncertainty}
              />
            </Section>
          </div>
        </>
      ) : (
        <>
          {/* "Your result at a glance" answers: urgency, what to do next
              (with Best next move folded in), and what to have ready. */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Section title="Is anything urgent?">
              <p className="text-base font-semibold text-white">{model.urgency.headline}</p>
              {model.urgency.detail ? <p className="mt-2">{model.urgency.detail}</p> : null}
            </Section>

            <Section title="What should I do next?" tone="cyan">
              {model.bestNextMove ? (
                <div className="space-y-3">
                  <p className="text-base font-bold text-white">{model.bestNextMove.label}</p>
                  <p>{model.bestNextMove.description}</p>
                  {model.bestNextMove.whyThisHelps ? (
                    <div>
                      <button
                        type="button"
                        aria-expanded={whyOpen}
                        aria-controls="result-why-this-helps"
                        onClick={() => setWhyOpen((current) => !current)}
                        className="min-h-10 rounded-lg border border-cyan-300/20 bg-slate-950/45 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                      >
                        {whyOpen ? "Hide why this helps" : "Why this helps"}
                      </button>
                      <p
                        id="result-why-this-helps"
                        hidden={!whyOpen}
                        className="mt-2 rounded-lg border border-cyan-300/20 bg-slate-950/45 p-3 text-cyan-50/90"
                      >
                        {model.bestNextMove.whyThisHelps}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p>Check the sender, date, reference, and requested action before deciding what to do.</p>
              )}
              {allActions.length > 0 || guidedNextStepButton ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {allActions.map((action) => (
                    <ActionButton key={action.label} action={action} />
                  ))}
                  {guidedNextStepButton ? <ActionButton action={guidedNextStepButton} /> : null}
                </div>
              ) : null}
            </Section>

            <Section title="What should I have ready?">
              <CompactHaveReadyList
                items={[...model.evidenceToGather.map((item) => item.value), ...model.questionsToAnswer]}
              />
            </Section>
          </div>

          {/* Safety-facing information stays visible, never behind disclosure. */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
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

          {/* Routine detail behind one collapsed, keyboard-accessible disclosure. */}
          <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/55 p-4">
            <button
              type="button"
              aria-expanded={detailOpen}
              aria-controls="result-routine-detail"
              onClick={() => setDetailOpen((current) => !current)}
              className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              {detailOpen ? "Hide dates, money, evidence and questions" : "See dates, money, evidence and questions"}
            </button>
            <div id="result-routine-detail" hidden={!detailOpen} className="mt-4 grid gap-4 lg:grid-cols-2">
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
            </div>
          </div>
        </>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Section title="Draft/checklist" tone="emerald">
          {model.draftOrChecklist ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-semibold text-white">{model.draftOrChecklist.title}</p>
                <CopyButton
                  label="draft/checklist"
                  getText={() => model.draftOrChecklist?.body ?? ""}
                />
              </div>
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

        {onDownloadAdviserPack ? (
          <Section title="Adviser export action" tone="cyan">
            <p id="result-case-sheet-adviser-helper">
              Creates a Markdown file you can save, print, or share with someone you
              trust. AdminAvenger does not send it anywhere.
            </p>
            <button
              type="button"
              aria-describedby="result-case-sheet-adviser-helper"
              onClick={onDownloadAdviserPack}
              className="mt-4 min-h-11 w-full rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto"
            >
              Download adviser pack
            </button>
          </Section>
        ) : null}
      </div>

      {isCareerSupportResult ? null : (
        <div className="mt-5">
          <CaseProgressCard summary={caseProgress} />
        </div>
      )}

      <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/55 p-4">
        <button
          type="button"
          onClick={onToggleSupportingDetails}
          className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
        >
          {supportingDetailsOpen ? "Hide supporting detail" : "Show supporting detail"}
        </button>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {isCareerSupportResult
            ? "Supporting detail shows the underlying career preparation card for checking."
            : "Supporting detail shows the underlying action pack, next-step planner, and source-style panels for checking."}
        </p>
      </div>
    </article>
  );
}
