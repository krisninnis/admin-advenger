# AdminAvenger CEO Question Bank v1

Date: 2026-07-08. Companion to docs/product/adminavenger-department-workshop-v1.md.

Use: pull questions into 1:1s, planning sessions, pilot interviews, and external reviews. A question earns its place by being answerable with evidence and by changing a decision when answered. Kill any question that only produces reassurance.

---

## Part A — 100 powerful CEO questions, grouped by department

### CEO / Founder (1–6)

1. If we could ship only one change this quarter, is it Result Page v2 — and if anyone hesitates, what do they know that this document doesn't?
2. What did I personally watch a real user do last month, and what did it change in the backlog?
3. Which current feature exists because it was easy to add rather than because a user needed it?
4. What is the single sentence every department would independently give as our promise — and do the sentences match?
5. What would make us shut a feature down within 24 hours, and has that trigger list been written?
6. Who takes over the safety standard if I'm hit by a bus — a person, or a test suite?

### Product Strategy (7–13)

7. What fraction of real analyses are benefits documents, and does our homepage reflect that truth?
8. What does the user do in the five minutes AFTER closing the result — and which of those actions should the product prepare?
9. Which panel or section would users miss least if deleted tomorrow — have we asked?
10. What is the smallest result that still keeps a low-stakes user safe (the floor of severity tiering)?
11. What must be true before the engine freeze lifts, stated as two verifiable artefacts?
12. Where does the checker end and the case manager begin — and does the user ever need to understand that boundary?
13. If Citizens Advice built this themselves, what would they build differently — and why haven't we?

### User Research (14–20)

14. Can five consecutive users pass the playback test (restate verdict + next step correctly) on v2?
15. What exact words did the last frightened user use for their situation — and does our copy use theirs or ours?
16. Which section do 100% of test users skip, and which do they re-read three times?
17. What convinced a sceptical user that the letter stayed on their device — architecture claims or the airplane-mode test?
18. What happens in a session when confidence says "low" — do users notice, stop, or barrel through?
19. What did the carer/support worker need that the claimant didn't — pronouns, printing, or something we haven't imagined?
20. Which of our assumptions died in the last research round — and if none did, was it research?

### UX/UI Design (21–27)

21. What is visible at 360×640 with zero scroll after analysing a sanction letter — is it verdict, move, and date, or chrome?
22. How many seconds to find the deadline, measured, worst participant — not average?
23. Which disclosure sections were opened in testing, and does the open-rate justify what we chose to collapse?
24. Can a user get from result to a saved case in one decision, and can they explain what "saved" means?
25. Where does the eye go first on the result page in a five-second test — and is that where the verdict is?
26. What does the page look like printed in black and white — because that's the adviser pack.
27. If we removed all colour tomorrow, would hierarchy survive on typography and spacing alone?

### Accessibility & Content Design (28–33)

28. What is the measured reading age of the ucSanction result copy — number, not vibe?
29. Which WCAG 2.2 AA criterion do we fail worst today, and what's the one-day fix?
30. Did a screen-reader user hear the verdict and the deadline in the first 30 seconds?
31. Which warning made a user feel worse instead of safer — and what pattern replaces it?
32. Which official term appears in our copy unglossed, and who signed it off?
33. What breaks at 200% zoom, and is anything unreachable by keyboard alone?

### Frontend Engineering (34–39)

34. How many files must change to edit one safety sentence — and when does that number become one?
35. Which impossible states can HomeView currently represent, and which have users already reached?
36. What is the time-to-interactive on a low-end Android over 3G — measured on a real device, not Lighthouse desktop?
37. Which component gets duplicated next if we don't extract the shared Section family this month?
38. Can the result page render entirely from persisted data, with the analysis pipeline turned off?
39. What is our oldest ignored build warning, and what is it training the team to ignore?

### Backend / Platform Engineering (40–45)

40. What is the data-loss story for a user whose browser evicts storage tonight — and does the app even notice?
41. What is the maximum realistic case (photos, documents, drafts) and does it survive on a 3-year-old phone?
42. Is the export format documented well enough for a stranger to write an importer — that's the lock-in test?
43. Which schema change would be impossible without breaking saved cases, and does the versioning plan cover it?
44. What is the restore-on-new-phone story today, and what's the smallest honest version of one?
45. If we ever add sync, what can the server operator read — and is the answer provably "nothing"?

### AI / Decision Systems (46–52)

46. What is per-engine classification accuracy on the corpus — table, not anecdote?
47. Which engine produces the most confident wrong answers, and what humbles it?
48. Can any rendered date or amount lack a source snippet — and does a test prove the answer is no?
49. What does the pipeline output when a letter contains instruction-like text designed for a machine reader?
50. Which proposed LLM use survives the reads-never-decides rule, and which is an engineering itch wearing a user story?
51. If the local LLM cleanup adds a fact that isn't in the OCR text, what catches it — name the check?
52. What would an adviser flag in our best output — and when did an adviser last actually look?

### Security & Privacy (53–59)

53. Who else can read a user's case on a shared family laptop, and what did we do about it this quarter?
54. Can a user make everything vanish in under ten seconds, and does a test verify the wipe is total?
55. Which render path displays OCR-derived text, and is every one escaped — audited, not assumed?
56. What do our HTTP headers score on a public scanner right now?
57. What sensitive data would appear in our own error logs if we added error reporting naively?
58. Which dependency would hurt most if compromised, and when did we last audit the lockfile?
59. If a journalist ran devtools during an analysis, what network requests would they see — and is the answer "none containing letter content", verifiably?

### Legal / Compliance / Risk (60–66)

60. Which single live sentence is closest to regulated advice, and what review pattern let it through?
61. Does every draft pass the "any user with this document" test, engine by engine?
62. What happens today when someone photographs a Home Office letter — and is the hard-stop tested?
63. Where does our debt content sit relative to the FCA perimeter — per a professional, not a search result?
64. If a user misses a deadline the app displayed, what do our terms say, and is the in-app wording consistent with them?
65. Which of the four legal documents (Terms, Privacy, Safety, Accessibility) is weakest, and who owns its next revision?
66. What is our insurance position, and at what usage number does that answer change?

### QA / Testing (67–72)

67. What is the worst bug that could ship tonight without any test failing — and why is that test still unwritten?
68. Which engines have zero hostile fixtures (crops, garble, lookalikes)?
69. Does the safety-wording suite cover rendered output, or only string constants — the drift lives in rendering?
70. When did the smoke script last run before a deploy, and where's the artefact?
71. Which real low-end device is in the test matrix, and who owns charging it?
72. What percentage of the OCR edge-case library passes today — and is the number moving?

### Data / Measurement (73–78)

73. What baseline numbers exist from before v2 — if none, what did we compare v2 against?
74. Which metric would change a decision this month, and which is decoration?
75. Can a user see every count the app keeps about their usage — and export or erase it?
76. What is the smallest opt-in payload that answers "did this help?" — and does the user see it before sending?
77. What evidence pack does our first-choice grant demand, and what's missing from ours today?
78. Is any impactLedger wording countable as a savings claim under the money-safety rules — audited when?

### Partnerships / Charity & Adviser Network (79–84)

79. Which three advisers, by name, have marked up our output — and what did we change because of them?
80. What would make a charity partner walk away mid-pilot, and have we pre-empted it in the agreement?
81. What does the pilot agency get from the pilot — not us, them?
82. Whose logo appears on the first pilot report, and what did they require to say yes?
83. Which sector body should hear about us from us, before they hear about us from someone else?
84. If Turn2us or Citizens Advice launched a similar tool next quarter, what would still make ours worth recommending?

### Customer Support / Operations (85–90)

85. What is the verbatim first paragraph of our reply to a suicidal message — written, rehearsed, and findable at 11pm?
86. Which support macro is most likely to be misused into advice, and what guard is in its text?
87. How does a user report a wrong date without sending us their whole letter?
88. What support theme, at what frequency, triggers a product freeze?
89. What is our promised response time by severity, and did we hit it last week?
90. What does support know that the roadmap ignores?

### Growth / Trust / Brand (91–95)

91. Can every homepage claim be verified by a sceptic in five minutes — which one fails?
92. What did support workers say when we asked whether the name "AdminAvenger" helps or hurts?
93. Which single screenshot makes a frightened person try the app — tested against what alternative?
94. Where did the last ten users actually come from — and does the acquisition story match the trust story?
95. What would a hostile journalist's headline be after an hour with the app — and which finding funds it?

### Business Model / Funding (96–100)

96. What annual number keeps this alive, and how many months of runway does the current plan buy?
97. Which fund is the best-fit first application, what does it require, and what's our submission date?
98. Who inside a council or housing association owns the budget that would pay for this — job title and a named example?
99. What revenue have we pre-committed to refuse, in writing, where the public can read it?
100. If we're acquired or I burn out, what legally stops the safety posture being stripped for parts?

---

## Part B — Questions for user interviews

Moderated sessions, real or prop letters, user's own phone where possible. Never ask users to share real personal details; prop kits exist for this.

1. Tell me about the last official letter that worried you. What did you do in the first ten minutes?
2. What did you do the last time you didn't understand a letter — who, if anyone, did you ask?
3. (After analysis) In your own words, what did the app just tell you? *(the playback test — score it)*
4. What would you do next, and when? What makes that hard?
5. Point to the date that matters. How sure are you that it's right?
6. What here do you not believe, or want to double-check? How would you check it?
7. Where do you think your letter went when you photographed it? How do you feel about that answer?
8. What would you expect to happen if you tapped nothing and came back in a month?
9. Was there anything on this page you didn't need? Anything you needed that wasn't there?
10. If your friend got this letter, would you tell them to use this? What would you warn them about?
11. (Carers/support workers) Whose letter is this in the app's eyes — does the wording get in your way?
12. What would make you delete this app?

## Part C — Questions for charity / adviser partners

1. Walk me through the first ten minutes of a typical appointment — what does the client arrive holding?
2. What information, in what order, would genuinely shorten your fact-find?
3. Here is our output for a sanction letter — mark every word you'd change or remove.
4. What would make you refuse to recommend a tool like this to a client?
5. Where's the line, for you, between preparation and advice — and where does our output sit against it?
6. What do clients mis-record most when they self-report their situation — dates, amounts, or sequence?
7. What would a pilot need to measure for your management to take the result seriously?
8. What has burned your organisation before with tech partners — data, credit, or overclaim?
9. If this tool worked perfectly, what would your service stop doing, and does that worry you?
10. Who else in your network should see this, and what would you tell them it is?

## Part D — Questions for security / legal review

1. Enumerate every place letter-derived text renders — which paths lack escaping, and what proves the rest?
2. What does a malicious browser extension see during an analysis session?
3. Demonstrate the delete-everything flow — what survives it (caches, SW, blobs, exports on disk)?
4. What are the headers on the production origin, and what does a public scanner grade them?
5. If we added sync tomorrow as specced, what could the server operator, host, or subpoena reach?
6. Which processing would trigger a DPIA under ICO guidance, and is the trigger documented ahead of need?
7. Does any current copy assert entitlement, predict outcomes, or direct a specific action for a specific person's circumstances?
8. Is any content within the FCA debt-counselling perimeter or OISC immigration scope — professional opinion, not ours?
9. What is our exposure if an OCR-misread date contributes to a missed statutory deadline — and does the UI wording reduce or worsen it?
10. What would responsible disclosure look like if a researcher found stored cases readable cross-site tomorrow — who answers, in what timeframe?

## Part E — Questions for AI safety review

1. Show the per-engine scorecard — accuracy, extraction precision/recall, trend since last release.
2. Which inputs produce high-confidence language over low-quality evidence — and what caps confidence?
3. Prove no rendered fact lacks provenance: run the invariant suite live.
4. Feed the injection fixtures (instruction-like letter text) — does any output change in tone, claim, or routing?
5. For each proposed LLM step: what schema constrains it, what rejects it, and what happens downstream on rejection?
6. Can the rephrase step ever add, drop, or alter a fact — and which diff catches each case?
7. What is the graceful-degradation output for the worst photo in the edge library — is the honesty adequate?
8. Where could Possible / Likely / Confirmed blur under generation — and which test asserts the boundary?
9. What user-visible language would leak model/AI vocabulary if a future dev is careless — and what lint stops them?
10. If the classifier's confidence is wrong 1 time in 20, which document type carries the worst cost — and is routing weighted for it?

## Part F — Questions for UI/UX validation

1. Five-second test on the v2 result: what do users say the page is for?
2. Playback: verdict + next step + date, restated correctly by ≥4 of 5 users?
3. Time to find the deadline — worst participant under 10 seconds?
4. Which collapsed sections were opened, by how many, and did anyone need something we hid?
5. Did anyone scroll past the best-next-move card looking for "the real answer"?
6. On a 360px viewport: what's above the fold, screenshot by engine type?
7. Did the OCR-uncertainty underline change behaviour — did users check the letter?
8. Any moment of visible relief? Any moment of visible spike in anxiety? What copy was on screen at each?
9. Can users find and understand "what AdminAvenger cannot know" — and does it lower or raise trust? (Hypothesis: raises.)
10. After the session: what does the user say the app did with their letter?

## Part G — Questions for business model / funding

1. Which three funders best fit a privacy-first admin tool for vulnerable users, and what does each require that we lack?
2. What does pilot 1 cost end-to-end, and what evidence does it buy for applications?
3. CIC vs mission-locked Ltd: which gates more of our target funding, per an actual adviser?
4. What would a local authority pay per support-worker seat, and who signs at that price?
5. Which free-forever guarantee, if broken, kills the brand — and how is it made structurally unbreakable?
6. What is the total cost of running the free core at 10k users (honest answer: near-static) — and what does that let us promise?
7. Which revenue stream creates pressure to weaken safety copy, even subtly — and is it on the refuse list?
8. What's the smallest grant worth applying for versus the founder-time it consumes?
9. If grants fail for a year, what's the survival plan that doesn't touch the covenant?
10. What would we want written into any future investment/acquisition term sheet to protect the mission — drafted before it's needed?

---

*End of question bank. Workshop findings: docs/product/adminavenger-department-workshop-v1.md.*
