# Community Helper Home Gated v1

Status: implemented as an explicit HomeView beta/demo entry point.

## What was added

HomeView now includes a small, visibly secondary section near the bottom of
the page, after the main check flow and result:

Community support prep (Beta / demo)

It reads:

"For carers, support workers, family helpers, or trusted people preparing
notes. Preparation only. AdminAvenger helps prepare. You stay in control."

with a single "Open the demo" button.

Unlike Workplace Support Home Gated v1 (which builds a preparation pack
inline from whatever the user has typed or uploaded once the beta checkbox is
selected), this entry does not process any pasted text at all. Clicking
"Open the demo" only navigates to the Demo/tour page, which already contains
the shipped Community Helper demo/support section (Community Helper Demo UI
v1) with its 4 hardcoded synthetic scenarios. HomeView itself never imports or
calls `buildCommunityHelperPack`, never builds a `CommunityHelperPack` from
what a user pastes, and never passes pasted text into the community helper
pipeline.

## Why navigation-only is safer than inline processing here

Community helper situations can touch care, housing, communication
difficulty, and possible safeguarding or financial-abuse concerns - a
noticeably wider and more sensitive range than workplace preparation. Rather
than mirror the workplace beta's "build a live pack from whatever you pasted"
pattern, this branch keeps real pasted text completely out of the community
helper pipeline. The only way to see community helper output is via the
existing 4 hardcoded, synthetic, reviewed demo scenarios on the Demo/tour
page - never from a real message a user has typed or uploaded.

This is a deliberately more conservative gate than the workplace pattern, and
is expected to stay that way until a dedicated safety review authorises a
live-text path (see Future branches below).

## What was deliberately not added

This branch does not add:

- automatic community helper detection from pasted text
- community helper routing in the main decision-engine classifier
- a way to build a `CommunityHelperPack` from real user text via HomeView
- a separate community helper checker page
- OCR, photo, camera, or file-intake changes
- diagnosis, safeguarding, capacity, or care/benefits eligibility decisions
- equipment or adaptation recommendations
- council obligation claims
- financial-abuse conclusions
- automatic contact with a support worker, OT, housing officer, adviser, GP,
  social worker, or safeguarding service
- automatic messages, submissions, or forms
- money owed/saved/recovered claims

## Preparation-only safety wording

The gated entry keeps these lines visible on HomeView itself:

- Beta / demo
- Community support prep
- For carers, support workers, family helpers, or trusted people preparing
  notes.
- Preparation only. AdminAvenger helps prepare. You stay in control.

The demo/support section it opens (Community Helper Demo UI v1) carries its
own full preparation-only boundaries, including "AdminAvenger cannot decide
care needs, safeguarding, diagnosis, capacity, eligibility, equipment, or
adaptations" and the urgent-safeguarding-like signposting line - unchanged by
this branch.

## Not the default primary intake

The gated entry is positioned after the main input-method picker, the primary
"What does this mean?" check button, and the result/adviser-export area - not
inside the primary paste/photo/file flow. The default "Check a message" path
(`onCheck("Pasted admin text", "email", textToCheck)`) is completely
unchanged and remains the only way normal pasted text is analysed.

## No decision-engine classifier change

The existing decision-engine classifier is unchanged. HomeView never calls
`analyseDecisionProblem` (or any community helper equivalent) from the new
entry - the button only calls a plain navigation handler
(`onOpenCommunityHelperDemo`, wired in `App.tsx` to switch to the existing
Demo/tour view).

## No OCR or intake change

This branch does not touch OCR, photo capture, camera intake, document
attachments, or file parsing in any way. The new entry is a static card with
a single button; it does not read, extract, or process any file or image.

## Future branches

Possible follow-up branches, each requiring its own safety review before
community helper output can be built from real user text:

- `community-helper-public-beta-v1`
- `community-helper-intake-v1`

Any future branch that lets community helper process real pasted text (even
behind an explicit opt-in, as the workplace beta does today) must be reviewed
carefully against the same safeguarding, capacity, diagnosis, eligibility,
and financial-abuse boundaries documented in
`docs/product/community-helper-pack-core-v1.md` before it ships.
