# Trusted Wales Signposting v1

## Status

`Approved for public release`

The human project owner approved all three exact records for public release on 6 August 2026, with no corrections.

## Scope

Trusted Wales Signposting v1 provides the same optional, static directory after each completed care-preparation summary. It contains one official Wales entry point, one independent information and advice service, and one local carers organisation finder.

The application shows source provenance, the date checked, material limitations, and an explicit choice to open a website or call a published number. It performs no runtime contact lookup.

## Explicit exclusions

This slice does not:

- assess need or eligibility;
- recommend, rank or personalise services;
- infer a council or collect a postcode;
- make a referral, contact an organisation, submit a form or start a call;
- create a case, save signposting state or share personal information;
- change Front Door classification, urgent support, benefits, bereavement, document, security, specialist or Estate behaviour;
- fetch contact details at runtime;
- claim that an organisation will help or that a person has a formal caring role.

## Research date

6 August 2026

Only the named organisations' official public pages were used as evidence. No personal data was collected or recorded.

## Approved source table

| Order | Record ID | Organisation and service | Type and jurisdiction | Intended audience | What the source can help with | Published contact details | Gives individual advice | Local-support finder | Source and date | Review due |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `welsh-government-local-authority-finder` | Welsh Government, Find your local authority | Official, Wales | People in Wales who need to identify their local authority | Finds a council website from a postcode or the official local-authority list | Website only: https://www.gov.wales/find-your-local-authority | No | Identifies a local authority, not a local carers organisation | [Find your local authority \| GOV.WALES](https://www.gov.wales/find-your-local-authority), checked 6 August 2026 | 6 November 2026 |
| 2 | `carers-uk-helpline` | Carers UK, including Carers Wales, Carers UK Helpline | Charity, UK with Wales service | People with a question about caring or who need to talk to someone | Information and support about caring, practical help, benefits and support at work | Website: https://www.carersuk.org/wales/about-us/what-we-do/we-help/; helpline: 0808 808 7777, `tel:+448088087777`; Monday to Friday, 9am to 6pm | Yes, within the service's stated scope | No | [We help \| Carers Wales](https://www.carersuk.org/wales/about-us/what-we-do/we-help/), checked 6 August 2026 | 6 November 2026 |
| 3 | `carers-trust-local-service-finder` | Carers Trust, Find carer services near you | Charity, UK with Wales service | Unpaid carers looking for a local carers organisation | Searches for a Carers Trust Network Partner by town, city or postcode | Website: https://carers.org/help-for-carers/find-carer-services-near-you; central contact: 0300 772 9600, `tel:+443007729600`; Monday to Friday, 9am to 5pm; purpose limited to help finding the nearest Network Partner | No | Yes, subject to local coverage | [Help & Info - Find Local Carer Services \| Carers Trust](https://carers.org/help-for-carers/find-carer-services-near-you) and [Get in Contact \| Carers Trust](https://carers.org/home/contact-us-1), checked 6 August 2026 | 6 November 2026 |

## What was verified

### Welsh Government

- The official page title is `Find your local authority | GOV.WALES`.
- The page provides a postcode lookup and a local-authority list.
- The finder page is available in English and Welsh.
- No phone number or opening hours were published for this finder, so none are recorded.

### Carers UK, including Carers Wales

- The official page title is `We help | Carers Wales`.
- The page describes information and support about caring, benefits, practical help and support at work.
- The published helpline is 0808 808 7777.
- The published hours are Monday to Friday, 9am to 6pm.
- The stated purpose includes asking a question about caring or having someone to talk to.
- The Carers Wales website offers English and Welsh pages. The source page does not explicitly state helpline language availability.

### Carers Trust

- The official finder page title is `Help & Info - Find Local Carer Services | Carers Trust`.
- The finder searches by town, city or postcode for a local Network Partner.
- The official contact page title is `Get in Contact | Carers Trust`.
- The contact page publishes 0300 772 9600 and Monday to Friday, 9am to 5pm for help finding a nearest Network Partner.
- The central contact is not an advice helpline and is not described as one in the directory.

## Limitations

### Welsh Government finder

The finder only identifies a local authority. It does not confirm which council service to use, what support is available, whether an assessment will be offered, or whether a person is eligible.

### Carers UK Helpline

Carers UK says more complex queries may be handled more effectively by email. The service cannot promise a particular outcome. The source does not explicitly confirm which spoken languages are available through the helpline.

### Carers Trust finder

Carers Trust states that it cannot provide an individual help and information service. Network Partner coverage is not available in every part of the UK. For Wales, the finder points people to Dewis and Carers Wales when local Network Partner coverage is unavailable. The central number is included only for help finding a nearest Network Partner.

## Time-sensitive fields

The following fields require review:

- all service descriptions and official URLs;
- the Carers UK Helpline phone number and opening hours;
- the Carers Trust central contact number, opening hours and stated purpose;
- Carers Trust Network Partner coverage and fallback wording.

## Review schedule

The first review is due on 6 November 2026, three months after verification. Before a release on or after that date, the project owner should re-open every recorded official source and confirm each time-sensitive field. A review should also be triggered sooner if a user or organisation reports a changed link, number, purpose, hours or coverage statement.

## Stale-data procedure

The production view compares an ISO date with each record's `reviewDueOn` value. When the date is later than the review date, the panel:

- says that the details need rechecking;
- marks every affected card as needing rechecking;
- hides opening hours so they are not presented as current;
- keeps preparation summaries available;
- makes no runtime network request.

The component defaults to the user's device date. A wrong device clock can therefore delay or advance the visible warning. This is not used for an urgent or safety-critical decision. Release governance must still check review dates independently of the UI before publication.

## Replacement procedure

To replace a record:

1. Verify the replacement directly on authoritative official pages.
2. Record the same provenance, contact-purpose, limitation and review fields in this document.
3. Add or update test-first coverage for ordering, identifiers, URLs, phones, limitations and stale behavior.
4. Obtain explicit approval from the human project owner for the exact replacement record.
5. Change the static production record only after that approval.

No record may be selected from user prose or constructed from unverified local details.

## Rollback procedure

If a source becomes unreliable, ambiguous or unverifiable before a replacement is approved, remove its public card through a reviewed code change or disable the whole optional signposting panel. Do not substitute an unverified number or URL. Preparation summaries must remain available, and urgent or safety guidance elsewhere must remain unchanged.

## Human approval requirement

An AI assistant may collect and compare evidence, but only the human project owner may approve a contact record for public release.

The human project owner approved each of the three exact records for public release on 6 August 2026. No corrections were requested.

| Record | Approved | Corrections | Approval date | Approver |
| --- | --- | --- | --- | --- |
| Welsh Government, Find your local authority | Yes | None | 6 August 2026 | Human project owner |
| Carers UK Helpline | Yes | None | 6 August 2026 | Human project owner |
| Carers Trust, Find carer services near you | Yes | None | 6 August 2026 | Human project owner |
