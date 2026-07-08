# Copy Actions v1

## Why copy actions exist

AdminAvenger prepares drafts and checklists for the user to review, edit, and
use however they choose - it never sends, submits, or contacts anyone on
their behalf (see `AGENTS.md`, Core rules: "No automatic actions"). Before
this change, using a prepared draft or checklist outside AdminAvenger meant
manually selecting the text in the browser, which is fiddly on mobile, easy
to get wrong (missing a line, including surrounding UI text), and an
unnecessary source of friction for something the user has already decided to
use.

A "Copy" button removes that friction without changing what AdminAvenger
does. It copies exactly the text already on screen into the user's own
clipboard, so they can paste it into an email client, a letter, a case
management tool, or wherever they choose to send or file it themselves.
AdminAvenger still never sends, submits, or contacts anyone - the copy button
does not narrow that boundary, it just makes manual copy-paste less painful.

## Where copy buttons appear

- **Result Case Sheet - "Draft/checklist" section** (`src/components/ResultCaseSheet.tsx`).
  Appears beside the section whenever a result includes a prepared
  draft/checklist.
- **Benefits Action Pack - "Draft/checklist if available" section**
  (`src/components/BenefitsActionPackPanel.tsx`), inside the expanded "Show
  full action pack" detail.
- **Case draft panel - prepared message** (`src/components/DraftPanel.tsx`),
  once a message has been prepared for a case. This panel previously had its
  own bare copy button with no failure handling; it now uses the shared
  `CopyButton` component so a failed copy is explained instead of silently
  doing nothing.

Two other panels already had equivalent, independently-built copy behaviour
before this change: `GuidedNextStepPanel.tsx` (the editable draft-message
modal) and `PreparedMessagePanel.tsx` (the full prepared-message review
screen), plus a copy option in `EvidencePackExport.tsx`. These already meet
the same bar (Copy / Copied / manual-copy-on-failure, no forbidden wording)
and were left as-is for this v1 to keep the change focused - see "Future
improvements" below for consolidating them onto the shared component.

## What they copy

Each button copies only the visible draft/checklist text that belongs to the
section it sits in:

- The Result Case Sheet button copies `model.draftOrChecklist.body` only -
  not the section heading, not the "Editable preparation..." note beneath
  it, and not any other part of the page.
- The Benefits Action Pack button copies `pack.draftOrChecklist` only.
- The case draft panel button copies the subject and body of the prepared
  message (`Subject: ...` followed by the body), matching what the panel
  already showed as "the message" before this change.

The text is read at the moment the button is clicked (via a `getText()`
callback), so it always reflects whatever is currently on screen - never a
stale or hidden value.

## What they do not do

- They do not send an email, message, or form submission.
- They do not upload, sync, or transmit anything anywhere - the write only
  ever goes to the clipboard on the user's own device.
- They do not change the draft or checklist text itself, and they do not
  change any decision-engine output.
- They do not add any new decision-engine behaviour, OCR behaviour, or
  routing/classification logic.
- They do not add analytics, accounts, or cloud sync.

## No-send / no-submit boundary

Copy Actions v1 sits entirely on the "prepare" side of AdminAvenger's
prepare/act boundary (`AGENTS.md`: "Human always decides", "No automatic
actions"). Copying text to the clipboard is not an action taken on the
user's behalf - it is the same as the user selecting and copying the text
themselves, just without the fiddly manual selection. Nothing crosses the
boundary into sending, submitting, or contacting anyone; that decision, and
the act of doing it, stays entirely with the user.

## Accessibility notes

- Each button is a native `<button type="button">` with a descriptive
  `aria-label` (e.g. "Copy draft/checklist", "Copy message"), so screen
  reader users hear what the button copies, not just "Copy".
- The button is reachable and operable with the keyboard alone (native
  button semantics - no custom click-only handlers).
- Success and failure are both announced via a visible `role="status"`
  message next to the button ("Copied to your clipboard. Nothing has been
  sent." / "Could not copy. Select and copy the text manually."), so the
  outcome is available to screen reader users and sighted users alike, not
  conveyed by icon or colour change alone.
- The button's own label also changes from "Copy" to "Copied" on success, so
  the state is visible even without the status line.

## Failure handling

The underlying `copyTextToClipboard` helper (`src/lib/copyToClipboard.ts`)
never throws:

- If `navigator.clipboard` is unavailable (older browser, insecure context,
  or a non-browser environment), it resolves to `"error"` immediately.
- If the browser's clipboard write itself rejects (e.g. permission denied),
  the rejection is caught and it resolves to `"error"`.
- Either way, the button shows "Could not copy. Select and copy the text
  manually." rather than failing silently or crashing the page.

## Future improvements

- Consolidate `GuidedNextStepPanel.tsx`, `PreparedMessagePanel.tsx`, and
  `EvidencePackExport.tsx` onto the shared `CopyButton` component, now that
  it exists, so there is exactly one copy implementation in the codebase
  instead of several equivalent ones.
- Consider a small on-screen confirmation toast in addition to the inline
  status message, for very long pages where the button and the visible
  viewport may not stay together after a page layout change.
- If AdminAvenger ever adds a print-friendly or plain-text export view,
  reuse the same `getText()` pattern so the exported text and the copied
  text can never drift apart.
