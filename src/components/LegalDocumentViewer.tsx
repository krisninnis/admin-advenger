import {
  legalDocumentOrder,
  legalDocuments,
  type LegalDocumentId,
} from "../data/legalNotices";

type LegalDocumentViewerProps = {
  documentId: LegalDocumentId;
  onSelectDocument: (documentId: LegalDocumentId) => void;
  onClose: () => void;
};

// Reusable full-text viewer for the four legal documents (Terms of Use,
// Privacy Notice, Safety Notice, Local storage / cookies notice). Used both
// from inside the Terms & Safety gate and from Settings > "View Terms &
// Safety Notice again" - the wording lives once in src/data/legalNotices.ts
// and is only ever displayed here, never retyped per caller.
//
// This viewer is never itself gated behind acceptance - it must stay
// reachable even for a user who has not accepted yet (adminavenger standard:
// never block access to the legal pages themselves).
export function LegalDocumentViewer({
  documentId,
  onSelectDocument,
  onClose,
}: LegalDocumentViewerProps) {
  const document = legalDocuments[documentId];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/90 px-3 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-document-title"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-slate-950/60 sm:max-h-[calc(100dvh-3rem)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              Legal &amp; safety
            </p>
            <h2 id="legal-document-title" className="mt-2 text-2xl font-bold text-white">
              {document.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{document.summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {legalDocumentOrder.map((id) => {
            const isActive = id === documentId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectDocument(id)}
                aria-current={isActive ? "page" : undefined}
                className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                  isActive
                    ? "border-emerald-300/50 bg-emerald-300/15 text-white"
                    : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20 hover:text-white"
                }`}
              >
                {legalDocuments[id].title}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4">
          {document.sections.map((section) => (
            <div
              key={section.heading}
              className="rounded-lg border border-white/10 bg-slate-950/60 p-4"
            >
              <h3 className="text-sm font-bold text-white">{section.heading}</h3>
              <div className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
