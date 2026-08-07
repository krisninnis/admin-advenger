// Shared evidence-kind resolution.
//
// Purpose: decide what a single row in a case's evidence list actually is, so
// that only facts genuinely read from the source can be counted as "evidence
// found". The audit found one array carrying four different meanings at once,
// and a progress widget reporting its raw length as "19 pieces of evidence
// found so far" for a message containing three facts.
//
// The classification lives here rather than in the renderer on purpose. Meaning
// is known where the row is built; guessing it back from English labels in the
// UI is how scenario-specific exceptions creep in.
//
// `EvidenceItem.source` is provenance, not meaning, so it can only carry part of
// the signal:
//
//   "detected"  - read from the submitted text        -> source_fact
//   "user_text" - provenance about the submission     -> informational
//   "manual"    - anything not machine-detected       -> informational
//
// "manual" deliberately does NOT default to "missing". A blast-radius review of
// all 173 producers found it covers two unrelated groups: genuine gaps
// ("Missing: Exact refund arrival date"), but also safety boundaries, provider
// statements, disclaimers, decision boundaries and suggested next actions. A
// "missing" default turned those into things the person was told to go and
// gather, which is worse than the inflation this workstream set out to fix.
//
// So the default is the fail-safe one: an untagged row stays visible as context,
// is never counted as a fact read from the source, and is never turned into a
// task. Rows that genuinely represent a gap say so with `kind: "missing"`.
//
// A row whose meaning disagrees with its `source` marker sets `kind` explicitly.
// Derived arithmetic is the clearest case: it is "detected" in the sense that it
// came from the document, but it was calculated, not found.

import type { EvidenceItem, EvidenceKind } from "../types";

export const resolveEvidenceKind = (item: EvidenceItem): EvidenceKind => {
  if (item.kind) {
    return item.kind;
  }

  if (item.source === "detected") {
    return "source_fact";
  }

  return "informational";
};

export const isSourceFactEvidence = (item: EvidenceItem): boolean =>
  resolveEvidenceKind(item) === "source_fact";
