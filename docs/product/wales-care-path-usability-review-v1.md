# Wales Care Path Usability Review v1

Status: `Review complete, awaiting human prioritisation`

## 1. Scope

This review evaluates the merged Wales care-support journey from Front Door classification through confirmation, orientation, supported-person preparation, supporter preparation, both-people preparation, preparation summaries, and Trusted Wales Signposting. It covers the eight required journeys, five required viewports, keyboard operation, screen-reader structure visible in the DOM, content clarity, incomplete states, button hierarchy, and page length.

The review is evidence gathering only. No proposed correction in this record is approved.

## 2. Exclusions

- No production or test behaviour was changed.
- Front Door classification, confirmation precedence, the 90-scenario corpus, and the 159 public-message corpus were not changed.
- External contact details were not reverified because the UI matched the governed records.
- No real council, charity, health service, emergency service, or other organisation was contacted.
- No real screen reader or physical touch device was used.
- Estate Administration, security, document, urgent, bereavement, reward, storage, and unrelated product behaviour were not inspected beyond the named controls and their existing tests.

## 3. Branch and HEAD

- Branch: `wales-care-path-usability-review-v1`
- Starting and reviewed HEAD: `fb985b8 Merge pull request #18 from krisninnis/wales-trusted-signposting-v1`
- Baseline tracked diff: empty
- Baseline untracked paths: `docs/research/` and `opencode.jsonc`

## 4. Review date

6 August 2026.

## 5. Environment

- Microsoft Windows 11 Pro
- Node.js `v20.19.5`
- npm `10.8.2`
- Headless Chromium `149.0.7827.55` through the repository's installed Playwright package
- Local Vite development server at `127.0.0.1`
- Reduced-motion preference enabled during browser evidence collection
- Browser console and uncaught page errors monitored during the reviewed journeys, with none observed

Screenshots were retained outside the repository. Evidence references below use their filenames and are not new repository files.

## 6. Viewports

| Viewport | Evidence covered | Horizontal overflow |
| --- | --- | --- |
| 1440 x 900 | Journeys A to D, supported, supporter, both orders, summary, signposting | None, document width equalled viewport width |
| 1024 x 768 | Journeys E to H, urgent, benefits, document, security | None, document width equalled viewport width |
| 390 x 844 | Long possessive label and focused confirmation control | None |
| 360 x 800 | Long sister-in-law label and confirmation controls | None |
| 320 x 568 | Generic-label fallback, complete supported summary, open signposting | None |

No clipped text or horizontal page overflow was observed at the five required sizes. Long text wrapped inside its container. The fixed mobile navigation did obscure focused care-flow controls in one keyboard sequence, recorded as WCP-001.

## 7. Journeys reviewed

### Journey A: supported person

`My sister needs help.` reached `My sister`, the care orientation, the optional supported-person intake, a complete preparation summary, and the shared Wales directory. The summary retained the source label `sister` and showed selected difficulties, change, and frequency.

Evidence: `A-supported-desktop-1440x900.png`, `A-supported-summary-mobile-320x568-viewport.png`, and `A-signposting-desktop-1440x900.png`.

### Journey B: supporter

`I look after my neighbour every day and I am struggling to cope.` reached `Me because I support them`, the supporter orientation, the optional supporter intake, and a complete supporter summary. The UI kept the supporter and neighbour distinct and did not relabel the user as a carer.

Evidence: `B-supporter-desktop-1440x900.png`.

### Journey C: both people, supported-person side first

The Dad wording reached `Both of us`, offered `Prepare both sides separately`, accepted the supported-person side first, then composed the supporter questions. The final DOM contained two separately named summary regions and separate answer sets.

Evidence: `C-both-supported-first-desktop-1440x900.png`.

### Journey D: both people, supporter side first

The reverse order presented supporter questions before supported-person questions. The final summary still used the stable order `Support needed by Dad` followed by `How supporting Dad affects you`. No answer crossed between sections.

Evidence: `D-both-supporter-first-desktop-1440x900.png`.

### Journey E: urgent control

`My mum has fallen and cannot get up.` interrupted ordinary care preparation with `If someone needs help right now`. The screen stated that AdminAvenger cannot assess urgency or contact a service and showed the four existing human-help options before any care intake.

Evidence: `E-urgent-desktop-1024x768.png`.

### Journey F: benefits control

`Mum gets PIP and I help every day.` remained benefits-shaped, asked `Whose benefits are you asking about?`, and offered `My Mum's`, `Mine`, `Both`, and `I'm not sure`. After `Both`, the orientation did not contain `Prepare both sides separately`.

Evidence: `F-benefits-control-1024x768.png`.

### Journey G: document control

The carer's-assessment acknowledgement bypassed the care confirmation and entered existing document analysis. The reference `CA-10482` remained available to that path.

Evidence: `G-document-control-1024x768.png`.

### Journey H: security control

The failed care-home payment wording bypassed care confirmation and produced the existing `Email needs safety check` result with payment-pressure and urgency cautions.

Evidence: `H-security-control-1024x768.png`.

## 8. Passes

- All eight required routing journeys reached the documented route.
- Urgent and security wording was not diverted into ordinary care preparation.
- The Mum/PIP control remained benefits-shaped and could not open the both-people care preparation flow.
- The Dad flow opened the both-people preparation only after the explicit `Both of us` choice and offer.
- Supported-person and supporter answers stayed separate in both completion orders.
- Back preserved existing answers in automated component and reducer coverage.
- The generic wording `The person I support at home needs more help now.` used the honest fallback `Someone else`.
- Checkbox controls accepted Space and radio controls accepted Arrow keys.
- A complete desktop keyboard-only supported-person journey reached the directory using Tab, Shift+Tab, Space, ArrowDown, and Enter.
- Website and phone links were reachable in logical order by Tab.
- Copy changed to `Copied` and announced `Copied to your clipboard. Nothing has been sent.` through a status region.
- The signposting disclosure was closed by default and its open state did not remove the preparation summary.
- A future-date browser check showed the stale-data warning, retained the summary, marked details for rechecking, and hid opening hours.
- Exactly three governed records appeared in the approved order.
- Organisation type, phone purpose, hours, limitations, and non-referral boundaries were visible as text.
- No external source was described as selected, recommended, or guaranteed for the individual.
- There was one `h1`, followed by a coherent `h2`, `h3`, and `h4` hierarchy on the completed supported-person page.
- Intake questions used fieldsets, legends, labelled checkboxes or radios, unique values, and distinct accessible summary regions.
- No icon-only care-flow control was found.
- Reduced motion remained usable and no animation was required to understand or complete the path.

## 9. Defects

### WCP-001: focused mobile care controls can sit entirely behind fixed navigation

- Priority: P1
- Journey: A and the shared Front Door and preparation steps
- Viewport: 390 x 844, with the same fixed-navigation risk at other mobile widths
- Step: keyboard transition from the pasted message to the first confirmation choice
- Exact control: `My sister`
- Observed behaviour: native Tab scrolling placed the focused choice at y 802 to 844 while the fixed mobile navigation occupied y 771 to 844. The 42 px focused control was fully obscured. Other newly reached actions can also land at the bottom edge before the user scrolls manually.
- Expected behaviour: the focused control remains fully visible above fixed navigation without requiring pointer use or guesswork.
- User impact: a keyboard user loses visual context at the first decision and can activate the wrong choice without seeing focus. The route is technically operable but not reliably perceivable.
- Evidence: `keyboard-choice-focus-obscured-mobile-390x844.png`, bounding-box measurement showing 42 px of overlap
- Likely owning file: `src/components/AppShell.tsx`, with care-flow focus or scroll treatment in `src/components/FrontDoorConfirmationPanel.tsx` and the preparation panels
- Proposed smallest correction: add a narrow, tested scroll clearance for focus targets above the fixed mobile navigation, or move focus to the new step heading with equivalent clearance. Do not alter global layout beyond the mobile shell boundary.
- Regression tests required: mobile fixed-navigation geometry test, focused choice visibility test, and keyboard progression test at 390 x 844 and 320 x 568

### WCP-002: Continue keeps focus after replacing the question group

- Priority: P2
- Journey: A to D
- Viewport: all
- Step: each intake `Continue`
- Exact control: `Continue`
- Observed behaviour: the same button position is reused after the next question renders, so focus remains on `Continue`. A forward Tab moves to `Back` and skips the newly displayed radio group. The keyboard-only review had to use Shift+Tab to reach the new question.
- Expected behaviour: after an explicit step change, focus should move to the new legend or first suitable control, or the forward focus order should encounter the new group before navigation actions.
- User impact: keyboard and screen-reader users can miss the new question and lose step context.
- Evidence: keyboard trace recorded `Continue`, then `Back`; the new radio was reachable only by reverse navigation
- Likely owning file: `src/components/CarerNeedsIntakePanel.tsx`, `src/components/SupporterNeedsIntakePanel.tsx`, and `src/components/BothPeoplePreparationPanel.tsx`
- Proposed smallest correction: focus the newly rendered legend or question container after reducer state advances, while preserving Back behaviour and answers.
- Regression tests required: focus target after every Continue, Back focus restoration, and both-person transition focus in both orders

### WCP-003: unanswered intake groups advance without local feedback

- Priority: P2
- Journey: A to D
- Viewport: all
- Step: supported-person and supporter questions
- Exact control: `Continue`
- Observed behaviour: pressing Continue with no choice selected immediately advances. No alert, status, description, or group-linked message appears. Only the final summary announces that some questions were left blank.
- Expected behaviour: because blank answers are allowed, the current screen should say that the question can be skipped before or when Continue is used, or offer a clear explicit skip action. Any feedback should be visible, plain, polite, and associated with the current group.
- User impact: users cannot tell whether they skipped intentionally, made an error, or lost an answer.
- Evidence: supported-person first question advanced to `What has changed?` with zero status or alert nodes; existing tests validate only final-summary incomplete messaging
- Likely owning file: the three preparation panel components and their copy constants; reducer rules can remain unchanged if the UI explains the permitted skip
- Proposed smallest correction: add concise skip guidance to each question or a deterministic inline status on blank Continue. Do not make answers mandatory without a separate product decision.
- Regression tests required: blank Continue message and accessible association for every question type, plus unchanged incomplete-summary behaviour

### WCP-004: possessive and compound relationship labels are simplified inaccurately

- Priority: P2
- Journey: long-label controls
- Viewport: 390 x 844 and 360 x 800, also data-level at every viewport
- Step: Front Door confirmation
- Exact wording: `My stepmother's neighbour needs help and I support her every day.` became `My neighbour`; `My older sister-in-law needs help and supporting her is becoming difficult for me.` became `My sister`.
- Observed behaviour: the UI changes the relationship rather than retaining the source wording or using an honest generic fallback.
- Expected behaviour: preserve the identifiable source label when safe, or use `Someone else` when the exact relationship cannot be represented reliably.
- User impact: the first decision can feel inaccurate and can undermine trust about whose answers are being prepared. The same individual remains in scope, so this review does not classify it as a wrong-person P0.
- Evidence: `long-stepmother-neighbour-mobile-390x844-viewport.png` and `long-sister-in-law-mobile-360x800-viewport.png`
- Likely owning file: `src/lib/frontDoorIntent/classifyFrontDoorIntent.ts`, with view copy in `src/lib/frontDoorIntent/frontDoorRouteView.ts`
- Proposed smallest correction: narrow label extraction so compound or possessive chains either remain source-grounded or fall back to `Someone else`. Do not alter orientation classification or precedence.
- Regression tests required: the three required long-label examples across classifier, route view, orientation view, and HomeView rendering

### WCP-005: mobile page length obscures the active care task

- Priority: P2
- Journey: A to D and shared signposting
- Viewport: most severe at 320 x 568
- Step: summary and open directory
- Exact surfaces: the complete original input form remains above the current care step; the directory then expands beneath the summary.
- Observed behaviour: at 320 x 568, the supported summary page measured 4,278 px, about 7.5 viewports. Opening the directory increased it to 6,720 px, about 11.8 viewports. The three 186 px wide cards measured about 416, 682, and 734 px high. At 1440 x 900, the supported summary measured 2,824 px and the open directory 3,972 px.
- Expected behaviour: the active preparation step and its next actions should remain easy to locate, with safety boundaries retained but repeated or secondary material progressively disclosed.
- User impact: users can lose the summary and current action inside a very long page, particularly on a small phone or after Back navigation.
- Evidence: `A-supported-summary-mobile-320x568-viewport.png`, `A-signposting-mobile-320x568-viewport.png`, and the recorded page metrics
- Likely owning file: `src/views/HomeView.tsx`, `src/components/AppShell.tsx`, and `src/components/TrustedWalesSignpostingPanel.tsx`
- Proposed smallest correction: one reviewable slice should reduce persistent upstream clutter while a care route is active and shorten only duplicated public signposting prose. Preserve every safety boundary and governed contact field.
- Regression tests required: mobile page-height budget or visibility assertions, summary remains available when directory opens, and no contact detail or limitation removed

### WCP-006: the Front Door choice set is not exposed as a semantic question group

- Priority: P2
- Journey: A to F
- Viewport: all
- Step: `Who needs help?` or `Whose benefits are you asking about?`
- Exact controls: the five care choices and four benefits choices
- Observed behaviour: the choices are pressed-state buttons inside a region named `One quick question`, but the visible question is not a fieldset legend and the controls have no shared group name.
- Expected behaviour: assistive technology should encounter a named single-choice group with the question attached, while retaining the current explicit confirmation behaviour.
- User impact: screen-reader users hear meaningful individual button names but may not receive the relationship between the question and the full option set.
- Evidence: DOM inspection of `FrontDoorConfirmationPanel` and the browser accessibility roles
- Likely owning file: `src/components/FrontDoorConfirmationPanel.tsx`
- Proposed smallest correction: add appropriate group semantics and a programmatic label without changing choice order, pressed state, classification, or confirmation precedence.
- Regression tests required: accessible group name for care, benefits, bereavement, and ambiguous confirmation shapes

### WCP-007: Return to the original message does more than its label suggests

- Priority: P2
- Journey: A to D
- Viewport: all
- Step: orientation and preparation summary escape action
- Exact control: `Return to original message` or `Return to the original message`
- Observed behaviour: activating the control does not merely return focus to the source text. It dismisses preparation and runs the source through ordinary document analysis, producing a result below the input.
- Expected behaviour: the label should state that it will check the text as an ordinary message, or a true return action should only restore the original input view. This needs a human product decision because merged behaviour is fixed for this review.
- User impact: a user may trigger analysis when expecting navigation only, and Back and Return are not clearly distinct from their labels alone.
- Evidence: browser activation removed the summary and produced ordinary analysis; the confirmation screen uses the clearer label `Just check this as a message`
- Likely owning file: preparation panel copy constants, `src/components/FrontDoorConfirmationPanel.tsx`, and the existing HomeView handoff in `src/views/HomeView.tsx`
- Proposed smallest correction: prefer copy alignment with `Just check this as a message` if the existing action remains. Do not alter submission routing in a copy-only slice.
- Regression tests required: visible label and accessible name, unchanged source metadata, unchanged ordinary-message handoff, and Back remains navigation only

### WCP-008: Front Door confirmation targets are below the local 44 px pattern

- Priority: P3
- Journey: A to F
- Viewport: 390 x 844, 360 x 800, and 320 x 568
- Step: Front Door confirmation
- Exact controls: choice buttons, `Go back`, and `Just check this as a message`
- Observed behaviour: choice buttons measured 42 px high. The two escape controls measured 34 px high. Preparation controls elsewhere use the repository's `min-h-11` 44 px pattern.
- Expected behaviour: frequently used mobile controls should meet the existing 44 px component pattern and retain visible spacing when labels wrap.
- User impact: smaller targets are less forgiving for users with limited dexterity, although they remained operable and text did not clip.
- Evidence: browser bounding-box measurements at all three mobile widths
- Likely owning file: `src/components/FrontDoorConfirmationPanel.tsx`
- Proposed smallest correction: apply the existing minimum-height pattern to confirmation and escape buttons without changing visual hierarchy.
- Regression tests required: minimum target dimensions and wrapping at 320, 360, and 390 px

## 10. Accessibility findings

The intake fieldsets, legends, labels, checkbox and radio types, live copied status, incomplete-summary status, semantic signposting list, organisation-type text, distinct both-person summary region names, descriptive website links, and named phone links all passed inspection.

The keyboard-only desktop path was complete. Space toggled a checkbox, ArrowDown changed the active radio, Enter advanced and opened disclosure, and every website and phone link was reached by Tab. Shift+Tab was required after Continue because of WCP-002.

The main accessibility risks are the fully obscured mobile focus in WCP-001, step focus progression in WCP-002, missing local incomplete-state communication in WCP-003, and missing confirmation-group semantics in WCP-006. A real screen-reader pass remains necessary after prioritised fixes.

## 11. Content findings

The care pages consistently explain their purpose, identify whose side is being prepared, state what to do next, provide Back and Return controls, explain preparation-only limits, and avoid entitlement, diagnosis, legal conclusions, formal-role conclusions, or claims that AdminAvenger contacted anyone.

Supported-person and supporter wording remained distinct. The product generally uses `supporter` in system concepts and plain `you support` wording in public copy rather than assigning the label `carer` to the user.

Content defects are the inaccurate long-label simplification in WCP-004 and the ambiguous Return label in WCP-007. The generic-label fallback was honest. The repeated safety and provenance copy contributes to WCP-005 but should not be shortened until each retained safety purpose is mapped.

## 12. Mobile findings

- No horizontal overflow was measured at 390, 360, or 320 px.
- Long labels and directory text wrapped without clipping.
- The fixed mobile navigation can fully cover a newly focused control, WCP-001.
- The 320 px summary and directory remain usable after scrolling to the bottom, where action buttons clear the fixed navigation.
- The complete open-directory page reaches about 11.8 viewports at 320 x 568, WCP-005.
- Confirmation targets are 42 px and 34 px rather than the 44 px pattern, WCP-008.
- At the narrowest size, directory cards become 186 px wide and carry substantial limitations and provenance copy. They remain readable but are dense.

## 13. Desktop findings

- No horizontal overflow or clipping appeared at 1440 x 900 or 1024 x 768.
- The two-column desktop shell gives preparation content sufficient width.
- Both-person sections are visually and semantically distinct.
- The complete supported page is still about 3.1 viewports at 1440 x 900, and about 4.4 viewports with signposting open.
- The original input area remains visually dominant above the active task, contributing to WCP-005.
- Button hierarchy is clear during question steps, with Continue visually primary and Back secondary. On summaries, all actions are quiet, which keeps Copy and signposting optional.

## 14. Signposting findings

The directory is closed by default. It contains exactly these records in this order:

1. Welsh Government, Find your local authority, marked `OFFICIAL WALES SERVICE`
2. Carers UK, including Carers Wales, Carers UK Helpline, marked `CHARITY`
3. Carers Trust, Find carer services near you, marked `CHARITY`

The approved website links, phone display values, phone purposes, opening hours, limitations, verification date, and public-release boundaries matched the governed data. The website accessible names include the organisation, so repeated visible `Open official website` text is not generic to assistive technology. No eligibility, referral, contact, personalisation, ranking, or recommendation was implied.

The stale-data state appears after the review date, says details need rechecking, hides hours, and leaves the preparation summary usable. The only signposting usability defect is its contribution to the mobile density in WCP-005.

## 15. Ranked recommendations

1. P1: ensure every mobile keyboard focus target clears the fixed navigation.
2. P2: move focus to each new question context after Continue.
3. P2: explain permitted blank answers at the current question.
4. P2: preserve compound relationship labels or use an honest generic fallback.
5. P2: add semantic grouping to Front Door confirmation choices.
6. P2: align Return copy with its ordinary-message analysis behaviour.
7. P2: reduce active-route page length without removing safety or governed contact content.
8. P3: bring confirmation targets up to the existing 44 px pattern.

No recommendation is approved by this review.

## 16. Proposed implementation slices

### Proposed next slice, one reviewable PR

`Wales Care Path Mobile Keyboard Context v1`

Limit it to WCP-001 and WCP-002:

- add mobile focus clearance above the fixed navigation;
- move focus to the new question legend or equivalent named container after Continue and Back;
- cover supported-person, supporter, and both-person order transitions;
- add focused desktop and 390 x 844 and 320 x 568 keyboard tests;
- do not alter reducers, answers, route classification, copy, or signposting data.

This is the recommended next slice because it addresses the only P1 and the closely related keyboard-context P2 without mixing content, classification, or page-density decisions.

### Later unapproved slices

1. `Wales Care Path Incomplete State and Confirmation Semantics v1` for WCP-003 and WCP-006.
2. `Front Door Source-Grounded Relationship Labels v1` for WCP-004 only.
3. `Care Path Escape Copy v1` for WCP-007 after a human copy decision.
4. `Wales Care Path Mobile Density v1` for WCP-005 and WCP-008 after content-retention decisions.

## 17. Regression-test plan

- Retain the exact 90-scenario Front Door corpus and 159 public-message non-regression corpus.
- Retain urgent, security, benefits, document, bereavement, and ordinary-message controls.
- Add mobile focus-obscuration geometry coverage with the fixed navigation visible.
- Add focus assertions for every Continue and Back transition in all three preparation panels.
- Add accessible blank-answer guidance tests for every question.
- Add Front Door group-name tests without changing choice order or confirmation shape.
- Add the three required long-label examples at classifier, view, and HomeView levels.
- Retain both-person answer separation, reverse-order completion, editing, reset, and copied-summary coverage.
- Retain signposting closed-default, exact-three-record order, accessible links, stale warning, hidden stale hours, and summary persistence coverage.
- Add responsive target-size and no-horizontal-overflow checks at 390, 360, and 320 px.
- Repeat a manual keyboard journey and screen-reader pass after implementation.

## 18. Manual review limitations

- Headless Chromium was used rather than physical Chrome, Edge, Android, or iOS hardware.
- Browser screenshots and DOM roles were inspected, but NVDA, JAWS, VoiceOver, and TalkBack were not run.
- Touch targets were measured, not tested by a person with motor impairments.
- Reduced motion was enabled, but other operating-system contrast modes were not simulated.
- Clipboard success was checked in the browser. Clipboard failure remains covered by the existing injected component-test pattern and was not forced in production runtime.
- External links and phone links were inspected for accessible names and governed href values but were not activated.
- Stale data was exercised with a future browser clock, not by changing governed records.
- Screenshots are external review artifacts and are not committed with this document.

## 19. Human decisions required

1. Approve or reject `Wales Care Path Mobile Keyboard Context v1` as the next implementation slice.
2. Decide whether blank questions should remain silently skippable with clearer guidance, or use an explicit `Skip for now` action. Making answers mandatory is not proposed.
3. Decide whether compound relationship wording should be preserved verbatim or fall back to `Someone else` when extraction confidence is low.
4. Decide whether `Return to the original message` should be renamed to state that ordinary analysis will run, or whether its behaviour should become navigation only.
5. Decide which repeated safety and provenance statements may be shortened or progressively disclosed without weakening user control.
6. Decide whether the 44 px component pattern is a release requirement for every Front Door control.

Until those decisions are recorded, all proposed corrections remain unapproved.
