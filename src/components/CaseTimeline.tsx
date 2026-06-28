import type { CaseTimelineEvent } from "../types";

type CaseTimelineProps = {
  events: CaseTimelineEvent[];
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export function CaseTimeline({ events }: CaseTimelineProps) {
  const sortedEvents = [...events].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-200">
          Battle Log
        </h3>
        <p className="mt-1 text-sm text-slate-500">Every meaningful case movement.</p>
      </div>

      <ol className="mt-4 space-y-4">
        {sortedEvents.map((event) => (
          <li key={event.id} className="relative border-l border-emerald-400/25 pl-4">
            <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-emerald-400" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-200">{event.title}</p>
              <time className="text-xs text-slate-500">{formatEventDate(event.createdAt)}</time>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-400">{event.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
