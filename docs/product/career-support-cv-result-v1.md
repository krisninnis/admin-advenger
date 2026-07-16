# Career Support CV Result v1

## Purpose

Career Support CV Result v1 fixes the first visible result experience for CVs
and resume-style documents.

Career Support Pack Core v1 stopped obvious CVs from becoming subscription or
bill cases. This branch makes the result itself feel like CV preparation rather
than a generic admin-letter check.

AdminAvenger helps prepare. You stay in control.

## Fixes

- CV and resume signals now take priority over job-advert signals.
- A CV that says it is "seeking a role" should still classify as a CV.
- Job adverts still classify as job adverts when the text has advert-style
  wording such as responsibilities, requirements, salary, location, hiring, or
  apply-now instructions.
- CV findings now use the title "CV preparation notes".
- Career result pages show career sections instead of generic letter sections.

## Career Result Sections

The result can surface:

- likely target roles
- strengths to highlight
- evidence to use
- projects to highlight
- experience to frame
- education/training to mention
- possible gaps to check
- safer rewrite suggestions
- next preparation steps

## What The Result Must Not Do

Career Support must not say or imply:

- the user will get the job
- interviews are guaranteed
- the user qualifies for a role
- the CV is the best CV
- experience is proven beyond the supplied text
- an employer will like the CV
- AdminAvenger can apply, submit, send, or contact anyone automatically

## What Was Not Added

This branch does not add:

- job scraping
- live job search
- LinkedIn or Indeed integration
- analytics
- cloud calls
- automatic applications
- automatic sending
- employer contact
- scoring
- guarantee claims
- real personal CV fixtures

## Result UI Boundary

For career results, the default result page should avoid admin-letter wording
where possible.

It should not show empty panels such as:

- dates to check
- money mentioned
- sender/date/reference checks
- original-letter fallback wording

Instead it should show preparation sections that help the user review the CV or
career material before using or sharing it.

## Testing

Tests cover:

- CV precedence over job-advert wording
- synthetic CV review output
- synthetic job advert classification
- normal subscription classification
- career-specific result model sections
- rendered CV result without generic date/money/original-letter panels
- no unsafe career promises or automation wording

All tests use synthetic text only.
