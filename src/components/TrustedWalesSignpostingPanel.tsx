import { useReducer } from "react";
import {
  TRUSTED_WALES_SIGNPOSTING_DIRECTORY,
  createTrustedSignpostingState,
  trustedSignpostingReducer,
  trustedSignpostingViewOn,
  type TrustedSignpostingViewRecord,
} from "../lib/trustedWalesSignposting/trustedWalesSignposting";

type TrustedWalesSignpostingPanelProps = {
  /** Injectable for deterministic stale-data tests. Defaults to the device date. */
  today?: string;
};

const OFFER = "Find trusted support in Wales";
const HEADING = "Trusted places to try next";
const LIMITS =
  "You decide whether to contact any organisation. AdminAvenger has not checked your eligibility, made a referral or shared your information.";
const CHANGE_WARNING =
  "Contact details and opening hours can change. Check the organisation's official website if a call does not connect or the service appears different.";

const buttonClass =
  "min-h-11 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50";
const linkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50";

const deviceDate = (): string => new Date().toISOString().slice(0, 10);

const displayDate = (isoDate: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));

const organisationTypeLabel = (record: TrustedSignpostingViewRecord): string =>
  record.organisationType === "official" ? "Official Wales service" : "Charity";

function SourceCard({ record }: { record: TrustedSignpostingViewRecord }) {
  return (
    <article className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <h5 className="text-base font-bold text-white">{record.organisationName}</h5>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-cyan-200">
        {organisationTypeLabel(record)}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-200">{record.serviceName}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{record.summary}</p>

      {record.freshness === "needs_recheck" ? (
        <p className="mt-3 text-sm font-semibold text-amber-100">
          Details need rechecking
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={record.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label={`Open official website for ${record.organisationName}, leaves AdminAvenger`}
        >
          Open official website (leaves AdminAvenger)
        </a>
        {record.phone ? (
          <a
            href={record.phone.href}
            className={linkClass}
            aria-label={`Call ${record.serviceName}`}
          >
            Call {record.serviceName}: {record.phone.display}
          </a>
        ) : null}
      </div>

      {record.phone ? (
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Phone purpose: {record.phone.purpose}
        </p>
      ) : null}
      {record.hoursToDisplay ? (
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Opening hours: {record.hoursToDisplay}
        </p>
      ) : null}

      <ul className="mt-3 space-y-1" aria-label={`Limits for ${record.organisationName}`}>
        {record.limitations.map((limitation) => (
          <li key={limitation} className="text-xs leading-5 text-slate-400">
            {limitation}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function TrustedWalesSignpostingPanel({
  today,
}: TrustedWalesSignpostingPanelProps) {
  const [state, dispatch] = useReducer(
    trustedSignpostingReducer,
    undefined,
    createTrustedSignpostingState,
  );

  if (state.visibility === "closed") {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => dispatch({ type: "open" })}
          className={buttonClass}
        >
          {OFFER}
        </button>
      </div>
    );
  }

  const view = trustedSignpostingViewOn(today ?? deviceDate());
  const checkedOn = displayDate(TRUSTED_WALES_SIGNPOSTING_DIRECTORY.researchDate);

  return (
    <section
      className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-4"
      aria-label={HEADING}
    >
      <h4 className="text-lg font-bold text-white">{HEADING}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        These details come from official organisation websites and were checked on {checkedOn}. AdminAvenger has not contacted them and cannot promise what help they will offer.
      </p>

      {view.needsRecheck ? (
        <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm leading-6 text-amber-100">
          These details need rechecking. Opening hours are hidden until the governed records are reviewed again.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3" aria-label="Trusted Wales sources">
        {view.records.map((record) => (
          <li key={record.id}>
            <SourceCard record={record} />
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm leading-6 text-slate-300">{LIMITS}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{CHANGE_WARNING}</p>

      <button
        type="button"
        onClick={() => dispatch({ type: "close" })}
        className={`${buttonClass} mt-4`}
      >
        Close trusted support
      </button>
    </section>
  );
}
