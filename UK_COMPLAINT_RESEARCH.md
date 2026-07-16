# AdminAvenger UK Complaint Research Foundation - Phase 1A

Last checked: 2026-07-16

Principles:

- Official sources first.
- Wales and England must not be treated as interchangeable.
- Complaint volume alone does not determine build priority.
- Build priority combines frequency, user stress, document suitability, evidence structure, safety risk and existing product overlap.
- Rules and complaint routes may change and require review dates.
- AdminAvenger explains and prepares; humans decide.

Internal ratings are for product planning only. They must not become consumer-facing scores.

## Energy billing and meters

### Research position

| Rating | Position |
| --- | --- |
| User frequency | High |
| User stress | High |
| Input suitability | High |
| Evidence structure | Strong |
| Safety complexity | Medium |
| Jurisdiction complexity | Medium |
| Existing AdminAvenger overlap | Partial |
| Proposed phase | Wave 1 |

Energy bills, direct-debit changes, catch-up bills, smart-meter issues, final bills, and supplier complaint replies are well suited to a document-first assistant. Official sources support a clear preparation role: identify the supplier, account, dates, meter readings, amount mentioned, complaint stage, and visible route wording. The safe product position is preparation and evidence organisation, not advice on whether the bill is unlawful, whether debt is owed, or whether compensation/refund is due.

### Common user problems

- Supplier complaint about billing, customer service, switching, final bills, refunds, metering, or network-operator issues.
- A bill or direct debit appears to include past energy use or a catch-up/back-billing amount.
- The supplier sends a deadlock/final decision or says the issue cannot be fixed.
- The supplier has not resolved the complaint after the visible complaint date.
- Smart meter or meter reading concerns where the document asks for readings or shows estimated readings.
- Credit balance or refund wording on a live or closed account.

### Typical input material

- Energy bills and statements.
- Direct-debit increase notices.
- Final bills after switching.
- Meter-reading requests or smart-meter messages.
- Back-billing or catch-up bill letters.
- Supplier complaint acknowledgements.
- Deadlock/final decision letters.
- Energy Ombudsman correspondence.
- Bank statements only when the user chooses to provide them as evidence.

### Classification signals

- "energy supplier", "gas", "electricity", "dual fuel", "meter reading", "estimated reading", "smart meter", "direct debit", "standing charge", "unit rate".
- "back bill", "catch-up bill", "arrears", "final bill", "credit balance", "refund".
- "formal complaint", "complaints procedure", "deadlock", "final decision", "Energy Ombudsman".
- Supplier names and account/reference numbers.

Signals are clues only. They are not proof that a bill is wrong, a meter is faulty, or the supplier has breached a rule.

### Confusion risks

- Energy arrears versus debt collection.
- Energy debt versus bailiff enforcement.
- Energy price change versus telecom price rise.
- Supplier refund/credit balance versus approved consumer refund.
- Meter-reading problem versus housing utility access issue.
- Suspicious energy email versus genuine supplier complaint correspondence.

### Facts to extract

- Supplier or network operator.
- Account/reference number.
- Service address where visible.
- Fuel type: gas, electricity, dual fuel, heat network, or unclear.
- Bill period and issue date.
- Amount mentioned, with treatment as "amount mentioned only" or "amount being demanded".
- Meter readings, estimated/actual wording, meter serial number if visible.
- Direct-debit amount before/after if visible.
- Complaint date and previous-contact dates.
- Complaint stage: first complaint, acknowledgement, final decision, deadlock, ombudsman.
- Response deadline wording exactly as shown.
- Any mention of vulnerability, accessibility, Extra Help Unit, or urgent support.

Do not invent absent meter readings, dates, provider names, deadlines, or amounts.

### Evidence to prepare

- Copy of the bill or notice.
- Meter readings and photos, including dates taken.
- Earlier bills showing estimated or actual readings.
- Supplier emails, letters, webchat records, and call notes.
- Proof of postage or complaint submission where relevant.
- Bank statements only if the user decides they are relevant.
- Deadlock/final decision letter if escalation is being considered.
- Any supplier breakdown of charges or calculations.

### Safe AdminAvenger outputs

- Plain-English summary of what the document appears to be.
- Chronology of visible dates and contacts.
- Evidence checklist.
- Missing-information list.
- Questions to answer before the user acts.
- Editable complaint or chase draft for user review.
- Complaint-stage explanation.
- Adviser-ready record.
- OCR-quality warning where meter readings or amounts may be misread.

### Forbidden outputs

- Guaranteed outcomes.
- Invented dates.
- Invented deadlines.
- Invented amounts.
- Invented rights.
- Automatic submission.
- Provider contact.
- Claims that the user will win.
- Claim that a bill is unlawful.
- Guaranteed refund.
- Invented compensation.
- Assumption that a meter is faulty.
- Energy-debt advice presented as a binding decision.
- Instruction to pay, not pay, cancel a direct debit, or ignore the supplier.

### Jurisdiction notes

- Ofgem regulates Great Britain energy markets and says it does not resolve individual customer complaints.
- Ofgem points England and Wales users to Citizens Advice and Scotland users to energyadvice.scot.
- Energy Ombudsman routes apply where the supplier, network operator, broker, Green Deal, or heat network supplier is within scope.
- Northern Ireland energy complaints are outside this Phase 1A source set.
- Wales-specific Citizens Advice energy pages were identified through links but not manually extracted in this phase.

### Source IDs

ENERGY-OFGEM-001, ENERGY-OMB-001, ENERGY-OMB-002, ENERGY-CA-001, ENERGY-CA-002

### Research confidence

Well sourced

### Proposed AdminAvenger position

Build dedicated engine

### Proposed fixture ideas

- Positive fixture 1: Energy supplier final decision letter about disputed estimated readings and revised bill.
- Positive fixture 2: Direct-debit increase notice citing previous underpayment and estimated usage.
- Positive fixture 3: Supplier complaint acknowledgement with account number, issue summary, and complaint reference.
- Ambiguous fixture 1: Cropped bill showing "arrears" but no supplier name or bill period.
- Ambiguous fixture 2: Smart-meter message saying readings are missing, with no complaint wording.
- Negative fixture 1: Telecom broadband price-rise notice.
- Negative fixture 2: Generic debt collector letter with no energy supplier or bill details.
- Cross-domain fixture 1: Energy arrears letter passed to debt collection.
- Cross-domain fixture 2: Suspicious email pretending to be from an energy ombudsman.
- Missing-information fixture: Complaint draft request with supplier name but no bill date, amount, or previous contact.
- OCR-noise fixture: Meter reading and account number partly misread from a photo.
- Safety fixture: User asks whether to stop paying because the bill "must be illegal".

## Telecom billing, contracts and cancellation

### Research position

| Rating | Position |
| --- | --- |
| User frequency | High |
| User stress | Medium |
| Input suitability | High |
| Evidence structure | Strong |
| Safety complexity | Medium |
| Jurisdiction complexity | Low |
| Existing AdminAvenger overlap | Strong |
| Proposed phase | Existing hardening |

Ofcom provides current complaint statistics and the ADR route. AdminAvenger already has a narrow broadband/mobile price-rise assessment; Phase 1A supports hardening that work and widening cautiously to billing, cancellation, contract, service, and complaint-stage documents. Current Ofcom ADR guidance is important because the telecom escalation wait changed from 8 weeks to 6 weeks for complaints raised from 2026-04-08.

### Common user problems

- Broadband, landline, pay-monthly mobile, or pay-TV bill complaint.
- Contract or cancellation dispute.
- Mid-contract price-rise notice.
- Final bill or early termination charge after switching/cancelling.
- Provider complaint unresolved after the relevant ADR period or deadlock letter.
- Poor service, activation, installation, or customer-service complaint.
- ADR scheme uncertainty: Communications Ombudsman versus CISAS.

### Typical input material

- Bills and account statements.
- Contract summaries and order confirmations.
- Price-rise notices.
- Cancellation emails or final bills.
- Early termination charge notices.
- Complaint acknowledgements.
- Deadlock/final-response letters.
- Communications Ombudsman or CISAS correspondence.

### Classification signals

- "broadband", "landline", "mobile", "pay monthly", "pay-TV", "TV package", "SIM", "airtime", "early termination charge".
- "contract", "minimum term", "cooling off", "cancellation", "final bill", "port", "switch", "One Touch Switch".
- "price rise", "annual increase", "pounds and pence", "inflation-linked", "CPI", "RPI".
- "Ofcom", "ADR", "Communications Ombudsman", "CISAS", "deadlock".
- Provider names such as BT, EE, O2, Sky, TalkTalk, Three, Virgin Media, Vodafone, Plusnet, NOW, Utility Warehouse.

Signals are clues only. They do not prove cancellation rights, compensation, breach, or mis-selling.

### Confusion risks

- Telecom price rise versus marketing.
- Telecom cancellation versus final-bill debt.
- Broadband price-rise notice versus energy price change.
- Mobile handset insurance versus telecom service complaint.
- Suspicious provider email versus genuine provider complaint correspondence.
- Provider debt collection versus ordinary final bill.

### Facts to extract

- Provider.
- Service type: broadband, landline, pay-monthly mobile, pay-TV, bundle, or unclear.
- Account/reference number.
- Contract start date, minimum-term/end date if visible.
- Notice date and effective date.
- Old/new amount where shown, treated only as amount mentioned.
- Cancellation date or requested cancellation date.
- Final bill amount or early termination charge wording.
- Complaint date, complaint reference, deadlock/final-response wording.
- ADR scheme named by provider.
- Response deadline wording exactly as shown.
- Service address or mobile number only if visible and needed.

### Evidence to prepare

- Contract summary and terms provided by the provider.
- Bills before and after the disputed change.
- Price-rise notice.
- Cancellation confirmation, switch confirmation, or porting messages.
- Complaint correspondence and call notes.
- Deadlock/final-response letter.
- Screenshots from provider account pages where the user has them.

### Safe AdminAvenger outputs

- Plain-English summary.
- Contract/bill chronology.
- Evidence checklist.
- Missing-information list.
- Questions to answer.
- Editable complaint or chase draft.
- ADR-stage explanation.
- Adviser-ready record.
- Cross-domain warning where debt collection or scam signals are present.

### Forbidden outputs

- Guaranteed outcomes.
- Invented dates.
- Invented deadlines.
- Invented amounts.
- Invented rights.
- Automatic submission.
- Provider contact.
- Claims that the user will win.
- Automatic claim that a user can cancel without charge.
- Claim that every price rise creates compensation.
- Invented contract end date.
- Guaranteed bill reduction.
- Instruction to cancel direct debits, stop payment, or ignore a final bill.

### Jurisdiction notes

- Ofcom telecom complaint and ADR guidance is UK-wide for communications providers in scope.
- Ofcom currently approves Communications Ombudsman and CISAS.
- The 6-week ADR threshold applies to complaints raised from 2026-04-08 onward; older documents may still mention 8 weeks.
- CISAS material located in this phase still showed 8 weeks and must be manually reviewed before any engine logic relies on it.
- Provider scheme membership can change and should be checked from current Ofcom/provider material.

### Source IDs

TEL-OFCOM-001, TEL-OFCOM-002, TEL-OFCOM-003, TEL-OFCOM-004, TEL-COMMS-OMB-001, TEL-CISAS-001

### Research confidence

Well sourced

### Proposed AdminAvenger position

Harden existing engine

### Proposed fixture ideas

- Positive fixture 1: Broadband bill with final charge and formal complaint reference.
- Positive fixture 2: Mobile price-rise notice with pounds-and-pence annual increase wording.
- Positive fixture 3: Deadlock letter naming Communications Ombudsman or CISAS.
- Ambiguous fixture 1: Marketing renewal offer that includes price language but no complaint.
- Ambiguous fixture 2: Cancellation chat screenshot without provider name or account number.
- Negative fixture 1: Energy direct-debit increase notice.
- Negative fixture 2: Subscription receipt for an app store purchase.
- Cross-domain fixture 1: Telecom final bill now with a debt collector.
- Cross-domain fixture 2: Suspicious "your mobile account is locked" email asking for card details.
- Missing-information fixture: User says they cancelled but document lacks cancellation date and contract term.
- OCR-noise fixture: Phone bill screenshot where account and amount are partially corrupted.
- Safety fixture: User asks AdminAvenger to confirm they can leave without an exit fee today.

## Banking, cards, fraud complaints and account restrictions

### Research position

| Rating | Position |
| --- | --- |
| User frequency | High |
| User stress | High |
| Input suitability | High |
| Evidence structure | Strong |
| Safety complexity | High |
| Jurisdiction complexity | Medium |
| Existing AdminAvenger overlap | Partial |
| Proposed phase | Wave 1 |

Banking and payments complaints are common, stressful, and document-heavy. FOS and FCA sources support a preparation role around firm complaint stages, final responses, payment-service/fraud timelines, and evidence organisation. PSR material supports careful classification of APP fraud documents but also raises safety complexity: AdminAvenger must never decide whether fraud occurred, whether a bank must reimburse, whether the user was grossly negligent, or whether the ombudsman will uphold the complaint.

### Common user problems

- Bank final response about a current account, debit card, credit card, transfer, e-money, or payment complaint.
- Fraud/scam complaint rejection or reimbursement decision.
- APP fraud claim correspondence.
- Account restriction, block, closure, or review notice.
- Chargeback, Section 75, card dispute, or disputed transaction correspondence.
- Payment-service or e-money complaint where the user is unsure about the response deadline.
- FOS referral-stage confusion after a final response.

### Typical input material

- Final-response letters.
- Complaint acknowledgements.
- Fraud-team emails or letters.
- APP scam claim outcomes.
- Card transaction lists.
- Account restriction or closure notices.
- Chargeback or Section 75 correspondence.
- FOS forms or FOS evidence requests.
- Bank statements where the user chooses to include them.

### Classification signals

- "final response", "Financial Ombudsman Service", "FOS", "FCA", "payment services", "e-money".
- "fraud", "scam", "APP", "authorised push payment", "unauthorised transaction", "gross negligence".
- "current account", "debit card", "credit card", "chargeback", "Section 75", "direct debit", "bank transfer".
- "account restricted", "account closed", "review", "source of funds", "security check".
- "15 business days", "35 business days", "8 weeks", "6 months".

Signals are clues only. They do not prove fraud, reimbursement entitlement, account misuse, or bank error.

### Confusion risks

- Bank fraud complaint versus suspicious-email detection.
- Bank account restriction versus debt collection.
- Card dispute versus retailer consumer refund dispute.
- APP fraud versus civil dispute about goods or services.
- Unauthorised card transaction versus authorised transfer scam.
- FOS final response deadline versus provider-internal complaint deadline.
- FCA or PSR data/statistics versus individual complaint outcome.

### Facts to extract

- Financial business.
- Product type: current account, debit card, credit card, e-money, transfer, loan, or unclear.
- Account/reference/complaint number where visible.
- Transaction date(s) and amount(s), display-only as amount mentioned.
- Complaint date.
- Final-response date.
- Deadline wording, including any 6-month FOS wording.
- Fraud type described by the document, without deciding if it is true.
- Decision wording and reasons given by the firm.
- Evidence the firm asks for.
- Account restriction/closure date where visible.
- Any vulnerability, accessibility, or urgent-financial-difficulty wording.

### Evidence to prepare

- Complaint and final-response letters.
- Transaction list or statement extracts chosen by the user.
- Messages with the bank, merchant, or suspected scammer.
- Screenshots of payment warnings or confirmation screens if the user has them.
- Police/Action Fraud reference if already obtained.
- Timeline of when the user noticed the issue and contacted the bank.
- Bank requests for information and the user's replies.
- FOS correspondence if already started.

### Safe AdminAvenger outputs

- Plain-English summary of what the bank/FOS document appears to say.
- Chronology of transactions, complaint dates, and response dates.
- Evidence checklist.
- Missing-information list.
- Questions to answer in the user's own words.
- Editable complaint/chase draft that avoids legalistic invented claims.
- Complaint-stage explanation.
- Adviser-ready record.
- Security warning not to disclose credentials.

### Forbidden outputs

- Guaranteed outcomes.
- Invented dates.
- Invented deadlines.
- Invented amounts.
- Invented rights.
- Automatic submission.
- Provider contact.
- Claims that the user will win.
- Determination that fraud definitely occurred.
- Claim that the bank must reimburse.
- Prediction that the Financial Ombudsman will uphold a complaint.
- Financial or debt advice.
- Instruction to disclose security credentials.
- Instruction to move money, ignore bank warnings, or bypass account restrictions.

### Jurisdiction notes

- FCA and FOS sources are UK-wide for regulated financial services, but court routes differ by UK nation.
- FOS complaint time limits and final-response wording matter and should be copied from the user's document where present.
- Payment-service and e-money complaint handling may use shorter 15/35 business-day rules than ordinary complaints.
- PSR APP fraud protections apply only to in-scope payment types, dates, firms, and claim facts; AdminAvenger should mark these dependencies rather than decide them.

### Source IDs

BANK-FOS-001, BANK-FOS-002, BANK-FOS-003, BANK-FCA-001, BANK-FCA-002, BANK-PSR-001

### Research confidence

Well sourced

### Proposed AdminAvenger position

Build dedicated engine

### Proposed fixture ideas

- Positive fixture 1: Bank final response rejecting reimbursement for an APP scam claim.
- Positive fixture 2: Credit-card chargeback or Section 75 rejection letter.
- Positive fixture 3: Current-account restriction notice asking for information.
- Ambiguous fixture 1: Bank security email with limited context and no complaint reference.
- Ambiguous fixture 2: Merchant refund dispute paid by card, with no bank complaint yet.
- Negative fixture 1: Telecom final bill.
- Negative fixture 2: Generic suspicious email that only asks for login details and has no real bank complaint content.
- Cross-domain fixture 1: Bank account restriction followed by debt-collection letter for an overdraft.
- Cross-domain fixture 2: Retailer non-delivery dispute that may be a civil dispute, not APP fraud.
- Missing-information fixture: User has transaction amount but no bank response or date contacted.
- OCR-noise fixture: Statement screenshot with corrupted sort code/reference and transaction date.
- Safety fixture: User asks whether the bank "has to pay me back" and whether to give a caller security codes.

## Housing repairs, damp, mould and complaint handling

### Research position

| Rating | Position |
| --- | --- |
| User frequency | Medium |
| User stress | High |
| Input suitability | High |
| Evidence structure | Strong |
| Safety complexity | High |
| Jurisdiction complexity | High |
| Existing AdminAvenger overlap | Partial |
| Proposed phase | Controlled later |

Housing repair and damp/mould complaints are document- and evidence-heavy but legally and jurisdictionally sensitive. England and Wales routes are not interchangeable. England social-housing material points to the Housing Ombudsman and Awaab's Law guidance for social tenants; Wales social housing points to PSOW and Welsh Government guidance; Wales private-rental repair routes include Rent Smart Wales and local environmental health. AdminAvenger should prepare chronology, evidence and drafts, and should avoid liability findings, rent advice, eviction reassurance, emergency safety reassurance, or compensation estimates.

### Common user problems

- Social landlord repair complaint, damp/mould complaint, or missed repair appointment.
- Landlord complaint response at stage 1 or stage 2.
- England social-housing complaint handling under the Housing Ombudsman Code.
- England social-housing Awaab's Law damp/mould or emergency-hazard correspondence.
- Wales council/housing-association complaint needing landlord complaint route or PSOW route.
- Wales private-rented repair report needing written evidence, Rent Smart Wales, or environmental-health signposting.
- Confusion over whether the issue is a repair request, complaint, disrepair claim, private tenancy issue, or emergency hazard.

### Typical input material

- Repair reports.
- Damp/mould photos or image OCR.
- Landlord letters.
- Contractor appointment messages.
- Complaint acknowledgements.
- Stage 1 and stage 2 complaint responses.
- Housing Ombudsman, PSOW, Rent Smart Wales, or council environmental-health correspondence.
- Tenancy/occupation-contract extracts when the user chooses to include them.
- Medical or vulnerability information only when the user chooses to include it.

### Classification signals

- "repair", "disrepair", "damp", "mould", "leak", "heating", "boiler", "hot water", "hazard", "fit for human habitation".
- "landlord", "housing association", "council tenant", "social housing", "private landlord", "letting agent", "contract-holder".
- "stage 1", "stage 2", "final response", "complaint handling", "Housing Ombudsman", "Public Services Ombudsman for Wales", "Rent Smart Wales".
- "Awaab's Law", "emergency hazard", "significant damp and mould", "written summary".
- "missed appointment", "contractor", "inspection", "survey", "reasonable time".

Signals are clues only. They do not prove landlord liability, tenancy status, safety risk level, or compensation.

### Confusion risks

- Housing repair versus private tradesperson dispute.
- Social landlord complaint versus private tenancy correspondence.
- England Housing Ombudsman route versus Wales PSOW route.
- Repair request/service request versus formal complaint.
- Disrepair/health hazard versus medical advice or emergency-safety reassurance.
- Rent arrears/debt issue versus repairs complaint.
- Homelessness/temporary accommodation suitability versus ordinary repair complaint.
- Domestic abuse, safeguarding, or social care issues embedded in housing correspondence.

### Facts to extract

- Country/jurisdiction signals: England, Wales, unknown.
- Landlord type: council, housing association, private landlord, letting agent, supported housing, temporary accommodation, unknown.
- Tenancy/occupation-contract status only if visible; otherwise mark unknown.
- Property/service address if visible.
- Repair/hazard type and location in the home.
- Date first reported and how reported.
- Complaint stage and dates.
- Appointment, inspection, contractor, or survey dates.
- Reported impact and household vulnerability only as provided by the user/document.
- Requested action and landlord response wording.
- Ombudsman or regulator named.
- Response deadline wording exactly as shown.
- Photos/videos mentioned and whether the original image quality is reliable.

### Evidence to prepare

- Repair reports and complaint correspondence.
- Photos/videos with dates if available.
- Contractor appointment records and missed-appointment notes.
- Landlord replies and stage responses.
- Inspection/survey reports.
- Record of how and when the issue was reported.
- Details of who lives in the home and relevant vulnerability only if the user chooses to share.
- Tenancy/occupation-contract extracts where route or landlord type is unclear.
- Environmental-health, Housing Ombudsman, PSOW, or Rent Smart Wales correspondence.

### Safe AdminAvenger outputs

- Plain-English summary.
- Repair and complaint chronology.
- Evidence checklist.
- Missing-information list.
- Questions to answer before action.
- Editable complaint/chase draft.
- Complaint-stage explanation.
- Adviser-ready record.
- Jurisdiction and landlord-type uncertainty warning.
- Emergency signposting boundary where the document suggests immediate danger.

### Forbidden outputs

- Guaranteed outcomes.
- Invented dates.
- Invented deadlines.
- Invented amounts.
- Invented rights.
- Automatic submission.
- Provider contact.
- Claims that the user will win.
- Finding that a landlord broke the law.
- Legal liability conclusion.
- Compensation estimate.
- Assumption about tenancy status.
- Unsafe advice to withhold rent.
- Emergency safety reassurance.
- Medical advice about damp/mould health effects.
- Advice to take or threaten court action.

### Jurisdiction notes

- England social-housing landlord complaints generally route through the landlord complaint process and then the Housing Ombudsman where in scope.
- England Housing Ombudsman material explicitly says Wales social-housing complaints should go to Public Services Ombudsman for Wales.
- Wales council house and housing association complaints: Welsh Government describes speak to local authority/landlord, make formal complaint, then contact PSOW if still unhappy.
- Wales PSOW can consider councils and housing associations, not private landlords.
- Wales private-rented repair issues may involve the landlord/agent first, then Rent Smart Wales or local environmental health depending on facts.
- England Awaab's Law guidance applies to social housing in England, not Wales, and supported/temporary accommodation can depend on agreement type.
- Unresolved jurisdiction questions: mixed temporary accommodation, leasehold/shared ownership, homelessness suitability, private-rented England routes, and cross-border provider documents need separate source work.

### Source IDs

HOUSING-HOS-001, HOUSING-HOS-002, HOUSING-GOVUK-001, HOUSING-GOVWALES-001, HOUSING-PSOW-001, HOUSING-RSW-001, HOUSING-SHELTERCYMRU-001, HOUSING-SHELTERCYMRU-002, HOUSING-PSOW-002

### Research confidence

Partially sourced

### Proposed AdminAvenger position

Controlled beta only

### Proposed fixture ideas

- Positive fixture 1: England social-housing stage 1 damp/mould complaint response.
- Positive fixture 2: Wales housing association repair complaint response naming PSOW.
- Positive fixture 3: Wales private-rented repair report with landlord/agent and 14-day follow-up context.
- Ambiguous fixture 1: Photo OCR showing mould and "landlord" but no country or landlord type.
- Ambiguous fixture 2: Contractor appointment text with no complaint wording.
- Negative fixture 1: Private builder/tradesperson invoice dispute.
- Negative fixture 2: Energy supplier boiler-service plan correspondence.
- Cross-domain fixture 1: Rent arrears/debt collection letter that mentions repairs as background.
- Cross-domain fixture 2: Homelessness temporary-accommodation suitability letter.
- Missing-information fixture: User reports damp but no date first reported, landlord type, or country.
- OCR-noise fixture: Blurry mould photo with corrupted stage response and unreadable date.
- Safety fixture: User asks whether it is safe to stay in the property or whether to withhold rent.

## Required Current-Source Checks

### Telecom

The latest official Ofcom telecom complaint report found in this phase is `TEL-OFCOM-001`, covering Q4 2025, October to December 2025. The report page was published on 2024-01-25 and last updated on 2026-05-11. Ofcom states that overall complaints increased compared with Q3 2025 for the first time since Q3 2023. Fixed broadband and landline complaints decreased, pay-TV stayed the same, and pay-monthly mobile increased, following mid-contract price-rise announcements by some mobile providers. The page identifies major complaint drivers only at a high level in visible text; mobile complaints for O2 were primarily driven by contracts. This data must not be used to infer cancellation rights or compensation.

### Banking

The latest official FOS annual and quarterly data found in this phase were both published on 2026-05-21. The annual 2025/26 source records 214,600 new complaints overall, almost 30% fewer than 305,700 in 2024/25; current accounts had 32,900 complaints, with fraud and scams accounting for 18,900 of those cases; credit cards had around 22,800 complaints. The Q4 2025/26 source records 53,015 total new complaints between January and March 2026, with current accounts at 8,635 and credit cards at 6,238 in the visible data table. These figures are planning context only and must not be used to predict an individual case.

### Energy

The current official complaint route identified is: complain first to the supplier or network operator; preserve the complaint date and evidence; escalate to Energy Ombudsman if the issue is not fixed within 8 weeks, if a deadlock/final decision is received, or if the user remains unhappy with the response. Energy Ombudsman material says a deadlock letter states the supplier can do nothing further and must be escalated within 12 months of the letter. AdminAvenger must copy user-document dates and source wording rather than inventing waiting periods.

### Housing

England and Wales must be mapped separately. England social-housing complaints generally use the landlord process and then the Housing Ombudsman where in scope. The Housing Ombudsman Code became statutory on 2024-04-01 and sets a two-stage complaint process for member landlords. England Awaab's Law tenant guidance applies to social housing in England and was updated 2025-12-04. Wales council/housing-association complaints route through the landlord/local authority process and then PSOW if still unhappy. PSOW can look at councils and housing associations but not private landlords. Wales private-rented repair issues can involve Rent Smart Wales or local environmental health after the landlord/agent route, depending on facts. Landlord type, council involvement, agreement type, and country must remain explicit dependencies.

## Initial priority findings

- Telecom should be hardened first because there is strong existing overlap with the broadband/mobile price-rise engine and current Ofcom data/routing is clear.
- Energy is a strong Wave 1 dedicated-engine candidate because documents are structured and official sources support a preparation workflow.
- Banking is a strong Wave 1 candidate but needs stricter safety wording because fraud, account restrictions and reimbursement are high-stakes.
- Housing should stay controlled-later until jurisdiction handling, landlord-type extraction, emergency wording, and Wales-specific routing are fixture-tested.

## Facts omitted because they could not be verified

- No provider-specific telecom contract rights were recorded.
- No universal telecom cancellation-without-charge rule was recorded.
- No compensation bands were recorded for energy, telecom, banking, or housing.
- No conclusion was recorded that any specific bank must reimburse a fraud/scam claim.
- No housing liability conclusion or rent-withholding rule was recorded.
- Wales-specific Citizens Advice energy page content was not manually extracted.
- CISAS current post-2026-04-08 waiting-period text needs manual review because the accessible page still showed 8 weeks.
- PSOW Living in Disrepair PDF was registered but not manually extracted.

## Consumer refunds, faulty goods and missing deliveries

### Research position

| Rating | Position |
| --- | --- |
| User frequency | High |
| User stress | Medium |
| Input suitability | High |
| Evidence structure | Strong |
| Safety complexity | Medium |
| Jurisdiction complexity | Medium |
| Existing AdminAvenger overlap | Partial |
| Proposed phase | Wave 1 |

Consumer refund, faulty-goods and delivery disputes are well suited to a document-first assistant because the useful facts are usually visible in receipts, order confirmations, delivery messages, seller replies, marketplace records and card-provider correspondence. Authoritative sources support a preparation role: identify the seller, platform, item, order date, delivery status, amount mentioned, payment method, complaint stage and visible route wording. The safe product position is evidence organisation and editable drafting, not deciding whether consumer law has been breached, whether a refund is definitely due, or whether a chargeback, Section 75 claim, ADR route or court claim will succeed.

### Common user problems

- Item appears faulty, broken, damaged, unusable, not fit for purpose, or not as described.
- Seller rejects or delays a refund, repair, replacement or return request.
- Online order has not arrived, was left somewhere disputed, or missed an agreed or important delivery date.
- User is unsure whether to complain to the seller, courier, marketplace platform, card provider, PayPal or BNPL provider.
- Returned-goods dispute where seller says the goods were not received, were used, or were damaged after delivery.
- Marketplace purchase where the user is unsure whether the platform or underlying seller is responsible.
- Private-seller purchase where the issue is misdescription rather than ordinary business-seller consumer rights.
- Product dispute confused with a service dispute, subscription cancellation, warranty claim, suspected scam, or bank dispute.

### Typical input material

- Receipts, order confirmations and invoices.
- Product listings, seller descriptions and screenshots.
- Delivery tracking, courier messages and safe-place instructions.
- Photos or video of alleged fault, damage, missing parts or wrong item.
- Return labels, proof of postage and return-tracking records.
- Seller, marketplace, PayPal, BNPL or card-provider correspondence.
- Warranty or guarantee correspondence.
- Complaint acknowledgements, final responses, ADR messages or payment-dispute replies.

### Classification signals

- "refund", "return", "repair", "replacement", "faulty", "damaged", "broken", "not as described", "not fit for purpose", "warranty", "guarantee".
- "not delivered", "missing parcel", "left with neighbour", "safe place", "delivery date", "redelivery", "tracking", "courier", "Royal Mail".
- "order", "basket", "checkout", "seller", "retailer", "marketplace", "private seller", "business seller", "trader".
- "chargeback", "Section 75", "PayPal dispute", "Buy Now Pay Later", "ADR", "final response", "deadlock".
- Seller, marketplace, courier, card-provider or payment-provider names.

Signals are clues only. They are not proof that goods breach consumer law, that a delivery failed, that the seller received a return, that a refund is due, or that a payment dispute will succeed.

### Confusion risks

- Consumer refund versus bank chargeback or Section 75 claim.
- Missing delivery versus suspected scam or fake seller.
- Faulty goods versus warranty or guarantee correspondence.
- Marketplace platform versus underlying seller.
- Subscription cancellation versus one-off purchase.
- Private seller versus business seller.
- Product dispute versus service dispute.
- Courier complaint versus seller complaint.
- Returned goods in transit versus seller refusal after receipt.
- Consumer issue versus telecom, energy, water, banking, debt or housing correspondence.

### Facts to extract

- Seller, trader, marketplace platform, courier and payment provider where visible.
- Whether the seller appears to be a business seller, private seller, marketplace seller, or unclear.
- Order/reference number, tracking number, dispute reference and complaint reference.
- Purchase date, order date, delivery date, agreed delivery date, return date and response dates.
- Amount mentioned, amount being requested, refund amount mentioned, delivery charge mentioned, and amount shown on the document.
- Item or service, product description, model, condition and listing wording where visible.
- Payment method: debit card, credit card, PayPal, BNPL, cash, finance, mixed payment, or unclear.
- Delivery status, safe-place wording, missed delivery wording, courier evidence and whether the user agreed to an alternative delivery location.
- Return status, proof of postage, tracking status and whether receipt by seller is shown or unknown.
- Complaint stage: first complaint, seller response, final response, marketplace dispute, payment dispute, ADR, or unclear.
- Previous contact and requested action.
- Deadline wording exactly as shown.

Absent facts remain unknown. Do not infer receipt of returned goods, seller type, delivery agreement, fault cause, payment protection eligibility, deadlines or amounts from incomplete material.

### Evidence to prepare

- Copy of receipt, order confirmation or invoice.
- Product listing, description, screenshots and seller promises visible at purchase.
- Photos or video of the issue, packaging, wrong item, missing parts or damage.
- Delivery tracking, courier message, proof of delivery and safe-place instruction records.
- Return label, proof of postage, return tracking and seller return instructions.
- Seller, platform, courier, PayPal, BNPL or card-provider correspondence.
- Warranty or guarantee documents where they may be relevant.
- Complaint letter, final response, ADR paperwork or payment-dispute reference.
- Bank or card statement only if the user decides it is relevant evidence of payment.

Evidence lists must not imply that the complaint will succeed.

### Safe AdminAvenger outputs

- Plain-English summary of what the document appears to be.
- Chronology of order, delivery, return and complaint dates visible in the material.
- Missing-information list.
- Evidence checklist.
- Neutral amount record using amount mentioned, amount being requested, refund amount mentioned, delivery charge mentioned or amount shown on the document.
- Editable seller, marketplace, courier, payment-provider or ADR draft for user review where appropriate.
- Questions for the user about seller type, delivery agreement, payment method, return proof and previous contact.
- Chase reminder based only on dates visible or user-entered dates.
- Adviser-ready export.
- Visible uncertainty, including OCR-quality warnings where amounts, dates, tracking numbers or references may be misread.

### Forbidden outputs

- Guaranteed outcomes.
- Invented dates.
- Invented deadlines.
- Invented amounts.
- Invented rights.
- Automatic submission.
- Provider, seller, platform, courier or bank contact.
- Claims that the user will win.
- Statement that a refund is definitely due.
- Decision that goods breach consumer law.
- Guarantee of chargeback, Section 75, PayPal, BNPL, ADR or court success.
- Assumption that returned goods were received.
- Estimation of compensation.
- Instruction to keep or dispose of goods without checking the seller's process.
- Advice to ignore genuine correspondence or withhold payment.
- Scam or fraud conclusions from consumer-dispute documents alone.

### Jurisdiction notes

- Citizens Advice consumer pages extracted in this phase apply to England and link to separate Wales, Scotland and Northern Ireland variants.
- GOV.UK returns/refunds guidance is UK business-facing, but notes a Scotland difference for claim period; it must not be flattened into a single consumer rule.
- CMA online-shopping guidance is UK-wide context, but scam reporting routes differ: England, Wales and Northern Ireland use Report Fraud, while Scotland routes to Police Scotland.
- Private seller, business seller, marketplace and payment-provider routes depend on the exact transaction facts.
- Northern Ireland routes were identified but not extracted in this Phase 1B1 source set.

### Source IDs

CONSUMER-CA-001, CONSUMER-CA-002, CONSUMER-CA-003, CONSUMER-CA-004, CONSUMER-CA-005, CONSUMER-GOVUK-001, CONSUMER-CMA-001

### Research confidence

Well sourced

### Proposed AdminAvenger position

Build dedicated engine

### Proposed fixture ideas

- Positive fixture 1: Retailer email refusing refund for a faulty appliance, with receipt, date and product description visible.
- Positive fixture 2: Missing-delivery complaint where order confirmation, tracking number and seller response are visible.
- Ambiguous fixture: Marketplace message showing platform name and seller username but unclear seller type and payment route.
- Negative fixture: Broadband contract cancellation notice with no product-purchase or delivery dispute.
- Cross-domain fixture: Missing parcel email containing suspicious link and request for card details.
- Missing-information fixture: User asks for a refund draft but provides no order date, seller name, item description or payment method.
- OCR-noise fixture: Blurry delivery screenshot where tracking number, date and delivery location are partly misread.
- Safety fixture: User asks AdminAvenger to tell the seller they are definitely breaking the law and to submit the complaint automatically.

## Universal Credit payments, deductions and overpayments

### Research position

| Rating | Position |
| --- | --- |
| User frequency | High |
| User stress | High |
| Input suitability | High |
| Evidence structure | Strong |
| Safety complexity | High |
| Jurisdiction complexity | Medium |
| Existing AdminAvenger overlap | Partial |
| Proposed phase | Controlled later |

Universal Credit statements, journal messages, overpayment letters, advance repayment notices, deduction notices and mandatory reconsideration references are document-heavy and highly suitable for extraction, chronology and evidence preparation. The safety complexity is high because deductions, sanctions, fraud penalties, overpayments, rent arrears, hardship, mandatory reconsideration and appeal routes are easily confused and can affect essential income. The safe product position is to explain what the document appears to be, preserve exact wording, organise evidence and prepare editable drafts. AdminAvenger must not calculate entitlement, decide whether a deduction or overpayment is valid, decide fraud, or predict reconsideration or appeal success.

### Common user problems

- Universal Credit statement shows a deduction and the user is unsure what it is for.
- Advance repayment appears on a statement or journal message.
- Overpayment letter or journal message says Universal Credit or another benefit was overpaid.
- Payment is missing, reduced, stopped or lower than expected.
- User cannot distinguish assessment-period calculations from payment-date wording.
- Journal message or letter refers to a mandatory reconsideration, reconsideration notice or decision challenge.
- Benefit debt recovery correspondence is confused with commercial debt collection or bailiff enforcement.
- Sanction wording appears in a document and needs classification without deciding whether the sanction is valid.
- Third-party deduction wording involves rent, utilities, Council Tax, child maintenance, service charges or court fines.

### Typical input material

- Universal Credit statements.
- Online journal messages and screenshots.
- DWP letters and decision letters.
- Overpayment notices and benefit debt recovery letters.
- Advance-payment and advance-repayment messages.
- Third-party deduction notices.
- Mandatory reconsideration requests, forms, replies and notices.
- Sanction notifications or reduced-payment messages.
- Payslips, tenancy agreements, childcare bills or bank statements only when the user chooses to provide them as evidence.

### Classification signals

- "Universal Credit", "DWP", "Department for Work and Pensions", "Jobcentre", "Work Coach", "online journal", "statement", "Payments", "assessment period".
- "What we take off", "deductions", "advance", "advance repayment", "overpayment", "benefit debt", "third party deduction", "rent arrears", "standard allowance".
- "mandatory reconsideration", "decision letter", "mandatory reconsideration notice", "appeal", "tribunal", "CRMR1".
- "sanction", "fraud penalty", "hardship payment", "claimant commitment".
- National Insurance number, UC account references, DWP office addresses and visible response-deadline wording.

Signals are clues only. They do not prove entitlement, overpayment correctness, deduction validity, fraud, sanction validity, hardship eligibility, or appeal prospects.

### Confusion risks

- Benefit deduction versus commercial debt.
- Advance repayment versus sanction.
- Overpayment versus fraud investigation.
- Universal Credit journal message versus ordinary email.
- DWP-administered benefit versus council support such as Housing Benefit or Council Tax Reduction.
- Benefit debt recovery versus bailiff enforcement.
- Third-party deduction for rent, utilities or Council Tax versus separate housing, energy, water or local-authority disputes.
- Payment-date confusion versus assessment-period calculation.
- Mandatory reconsideration request versus mandatory reconsideration notice.
- Sanction notification versus general claimant-commitment or appointment message.

### Facts to extract

- Organisation, DWP office, Jobcentre or named benefit office where visible.
- Benefit type: Universal Credit, tax credits, Housing Benefit, other DWP benefit, council support, or unclear.
- Reference number, National Insurance number presence, UC account reference and journal-message date where visible.
- Notice type: statement, journal message, overpayment notice, deduction notice, advance repayment, third-party deduction, mandatory reconsideration request, mandatory reconsideration notice, sanction notification, debt recovery letter, or unclear.
- Statement date, payment date, assessment period, decision date, letter date and response dates.
- Amount mentioned, amount deducted, amount being requested, and amount shown on the document.
- Deduction description and whether it appears to be advance repayment, overpayment, third-party deduction, hardship repayment, sanction/fraud penalty effect, or unclear.
- Payment method and payment status where visible.
- Complaint or challenge stage: explanation request, mandatory reconsideration, mandatory reconsideration notice, appeal reference, debt-management contact, or unclear.
- Previous contact, requested action and evidence already sent.
- Deadline wording exactly as shown.

Absent facts remain unknown. Do not infer benefit entitlement, correct award, valid deduction, fraud, repayment liability, sanction period, appeal route or deadlines from incomplete material.

### Evidence to prepare

- Copy of the Universal Credit statement or journal message.
- DWP decision letter, overpayment letter, deduction notice or mandatory reconsideration notice.
- Earlier and later statements showing the same deduction or payment change.
- Journal messages, letters and call notes showing previous contact.
- Evidence named by the document, such as payslips, tenancy agreement, childcare bills or bank statements, only where the user decides they are relevant.
- Proof of submitted evidence or journal entry where available.
- Debt-management or benefit-debt correspondence where it is part of the same issue.
- Adviser-ready chronology of visible dates, notices and responses.

Evidence lists must not imply that a challenge will succeed.

### Safe AdminAvenger outputs

- Plain-English summary of what the document appears to be.
- Chronology of statement dates, assessment periods, notice dates, payment dates and contacts.
- Missing-information list.
- Evidence checklist.
- Neutral amount record using amount mentioned, amount deducted, amount being requested or amount shown on the document.
- Editable draft asking for an explanation, clarification, hardship consideration, or mandatory reconsideration wording for user review where appropriate.
- Questions for the user about notice type, online account access, previous contact, evidence, changed circumstances and whether advice is needed.
- Chase reminder based only on visible or user-entered dates.
- Adviser-ready export.
- Visible uncertainty, including OCR-quality warnings where amounts, dates, references or assessment periods may be misread.

### Forbidden outputs

- Guaranteed outcomes.
- Invented dates.
- Invented deadlines.
- Invented amounts.
- Invented rights.
- Automatic submission.
- Contacting DWP, Jobcentre, Debt Management, council, landlord or adviser automatically.
- Deciding entitlement.
- Calculating what the claimant should receive.
- Deciding whether a sanction, deduction or overpayment is valid.
- Predicting mandatory reconsideration or appeal success.
- Instructing users to hide income, savings, work, household changes or circumstances.
- Deciding that fraud occurred or did not occur.
- Labelling amounts as savings, recoveries or entitlements.
- Advising the user to ignore a DWP, council, court or debt-recovery letter.
- Combining different notices into one generic rule.

### Jurisdiction notes

- GOV.UK Universal Credit deductions guidance applies to England, Scotland and Wales and links Northern Ireland to nidirect.
- Citizens Advice pages extracted in this phase apply to England and link to separate Wales, Scotland and Northern Ireland variants.
- DWP mandatory reconsideration form publication provides English and Cymraeg versions; the full form content was not manually extracted in Phase 1B1.
- Benefit overpayment routes differ for tax credits, Child Benefit, Social Security Scotland and Northern Ireland Department for Communities cases.
- Council-administered support such as Housing Benefit and Council Tax Reduction may follow different local-authority processes and must not be merged into Universal Credit rules.
- Northern Ireland Universal Credit and benefit debt routes were identified but not extracted in this Phase 1B1 source set.

### Source IDs

BENEFITS-DWP-001, BENEFITS-GOVUK-001, BENEFITS-GOVUK-002, BENEFITS-DWP-002, BENEFITS-GOVUK-003, BENEFITS-DWP-003, BENEFITS-CA-001, BENEFITS-CA-002

### Research confidence

Well sourced

### Proposed AdminAvenger position

Controlled beta only

### Proposed fixture ideas

- Positive fixture 1: Universal Credit statement showing "What we take off - deductions" with an advance repayment description and assessment period visible.
- Positive fixture 2: DWP overpayment letter with amount requested, reason wording, date and mandatory reconsideration reference visible.
- Ambiguous fixture: Journal screenshot saying payment is lower than expected but not showing whether the reason is earnings, deduction, sanction or overpayment.
- Negative fixture: Commercial credit-card debt collection letter with no DWP, Universal Credit or benefit reference.
- Cross-domain fixture: Rent arrears third-party deduction message that could be confused with a housing repair or landlord complaint.
- Missing-information fixture: User says their UC is wrong but provides no statement, assessment period, deduction wording or decision letter.
- OCR-noise fixture: Blurry phone photo of a UC statement where deduction description and amount are partly misread.
- Safety fixture: User asks AdminAvenger to calculate what they should receive and tell DWP the overpayment is invalid.

## Workplace pay, absence, disciplinary and grievance correspondence

### Research position

| Rating | Position |
| --- | --- |
| User frequency | High |
| User stress | High |
| Input suitability | High |
| Evidence structure | Strong |
| Safety complexity | High |
| Jurisdiction complexity | Medium |
| Existing AdminAvenger overlap | Partial |
| Proposed phase | Controlled later |

Workplace pay, absence, disciplinary, grievance, capability, performance and reasonable-adjustment correspondence is highly document-led and often arrives as letters, emails, payslips, meeting invitations, outcomes, appeal wording and HR records. Authoritative sources support a preparation role: identify the employer, document type, meeting or pay dates, allegation or concern exactly as written, amount mentioned, deduction description, visible policy wording, response deadline wording, appeal wording and previous correspondence. The safe product position is explanation, chronology, evidence organisation and editable drafting, not advice on legality, discrimination, misconduct, employment liability, medical fitness, compensation or tribunal prospects.

### Common user problems

- Missing, late or incorrect pay shown through a payslip, wage statement or employer email.
- Payslip discrepancy involving gross pay, net pay, variable hours, tax, National Insurance, pension, student loan or other deductions.
- Deduction from wages, repayment of an overpayment, advance, loan, uniform, till shortfall or court/public-authority deduction.
- Absence-management letter, sickness review, fit-note reference, occupational-health referral or return-to-work invitation.
- Disciplinary investigation, invitation, hearing, outcome, warning, dismissal, appeal or companion wording.
- Grievance submission, grievance acknowledgement, meeting invitation, outcome or appeal wording.
- Capability or performance correspondence that may overlap with absence, disability, disciplinary or informal management processes.
- Reasonable-adjustment request or response, including adjustment meetings and accessible-format correspondence.
- Holiday-pay wording as document classification only, especially where it appears in a payslip or final pay query.

### Typical input material

- Payslip.
- Wage statement.
- Payroll email.
- Contract or staff-handbook extract where the user chooses to provide it.
- Absence letter.
- Fit note or occupational-health correspondence where the user chooses to provide it.
- Return-to-work invitation or meeting record.
- Investigation letter.
- Disciplinary invitation.
- Disciplinary outcome.
- Disciplinary appeal letter or outcome.
- Grievance.
- Grievance acknowledgment.
- Grievance meeting invitation.
- Grievance outcome.
- Capability or performance letter.
- Reasonable-adjustment request or response.
- HR subject-access correspondence.

### Classification signals

- "payslip", "gross pay", "net pay", "deduction", "overpayment", "advance", "holiday pay", "hours worked", "pay period", "PAYE", "National Insurance", "pension".
- "absence review", "sickness absence", "fit note", "return to work", "occupational health", "phased return", "capability", "performance improvement".
- "disciplinary", "investigation", "alleged misconduct", "allegation", "hearing", "right to be accompanied", "warning", "gross misconduct", "appeal".
- "grievance", "formal complaint", "grievance meeting", "grievance outcome", "appeal against the grievance outcome".
- "reasonable adjustment", "disability", "accessible format", "Access to Work", "adjustment passport", "workplace adjustment".
- Employer name, HR contact, manager name, employee number, payroll number, policy name or meeting date.

Signals are clues only. They are not proof of unlawful conduct, discrimination, misconduct, contractual entitlement, fitness for work, medical condition, procedural unfairness or tribunal prospects.

### Confusion risks

- Disciplinary letter versus routine meeting invitation.
- Grievance versus ordinary complaint email.
- Absence management versus capability process.
- Pay dispute versus tax, pension or benefit issue.
- Reasonable-adjustment request versus medical diagnosis.
- Recruitment email versus suspicious-email detection.
- Workplace safety concern versus emergency or medical advice.
- Employer correspondence versus tribunal or solicitor correspondence.
- Capability/performance correspondence versus disciplinary allegation.
- HR subject-access request versus grievance evidence request.
- Holiday-pay wording versus final-pay, pension, tax or benefits issue.

### Facts to extract

- Employer, department, HR contact, manager and named contact.
- Employee name, employee number, payroll number or reference where visible.
- Document type: payslip, wage statement, payroll query, absence letter, return-to-work invitation, investigation letter, disciplinary invitation, disciplinary outcome, grievance, grievance acknowledgement, grievance outcome, capability letter, reasonable-adjustment request, HR data request, or unclear.
- Date issued, meeting date, pay date, pay period, absence period and response dates.
- Alleged issue exactly as written.
- Pay period, hours, gross pay, net pay, amount mentioned and amount shown on the document.
- Deduction description and whether it appears to be tax, National Insurance, pension, student loan, overpayment, advance, loan, court/public-authority deduction, retail shortfall, employer-specific deduction, or unclear.
- Meeting purpose and whether it is described as informal, investigation, disciplinary, grievance, absence, capability, performance, return to work, appeal, or unclear.
- Evidence enclosed or requested by the employer.
- Companion, representation, appeal, policy and procedure wording.
- Response deadline wording exactly as shown.
- Previous correspondence, requested action and user-entered context.

Absent facts remain unknown. Do not infer employment status, contractual terms, alleged misconduct, discrimination, medical condition, fitness for work, statutory deadline, tribunal route, pay correctness or employer liability from incomplete material.

### Evidence to prepare

- Payslip, wage statement, timesheet, rota or payroll email.
- Contract, staff handbook or policy extract only where the user chooses to provide it.
- Bank statement only if the user decides it is relevant to showing pay received.
- Employer letters, meeting invitations, outcomes, appeal wording and HR emails.
- Notes from meetings and previous correspondence.
- Fit notes, occupational-health reports or adjustment evidence only where the user chooses to provide them.
- Reasonable-adjustment request, response and any agreed adjustments.
- Grievance, disciplinary, absence, capability or performance policy where available.
- Adviser-ready chronology of visible dates, meetings, decisions and responses.

Evidence lists must not imply that an employment claim, grievance, appeal, pay query or adjustment request will succeed.

### Safe AdminAvenger outputs

- Plain-English summary of what the document appears to be.
- Chronology of visible pay periods, meetings, correspondence, outcomes and response dates.
- Evidence checklist.
- Missing-information list.
- Neutral amount record using amount mentioned, amount deducted, amount shown on the document or pay amount shown.
- Questions for the user about document type, policy, previous contact, evidence, desired next step and whether specialist advice is needed.
- Editable response, clarification, pay-query, grievance, appeal, meeting-preparation or reasonable-adjustment draft for user review where appropriate.
- Chase reminder based only on visible or user-entered dates.
- Complaint-stage or workplace-process explanation.
- Adviser-ready export.
- Visible uncertainty and cannot-decide boundaries, including OCR-quality warnings where pay amounts, dates, names, references or allegation wording may be misread.

### Forbidden outputs

- Guaranteed outcomes.
- Invented dates.
- Invented deadlines.
- Invented amounts.
- Invented rights.
- Automatic submission.
- Contacting an employer, HR, payroll, union, adviser, tribunal or solicitor automatically.
- Finding that an employer acted unlawfully.
- Deciding that discrimination occurred.
- Deciding whether disciplinary action is fair.
- Deciding whether misconduct occurred.
- Predicting tribunal, grievance, disciplinary, appeal or settlement outcomes.
- Estimating compensation.
- Diagnosing illness, disability or fitness for work.
- Telling a user to ignore a meeting or employer letter.
- Inventing contractual rights.
- Submitting a grievance, appeal or response automatically.
- Giving emergency, medical, legal or employment advice as a binding decision.

### Jurisdiction notes

- Acas and HSE sources used in this phase are Great Britain-focused; Northern Ireland workplace routes were not extracted.
- EHRC workplace-adjustments guidance explicitly covers England, Scotland and Wales.
- ICO employment-record and subject-access guidance is UK data-protection guidance.
- GOV.UK payslip and deductions pages were treated as Great Britain employment guidance; Northern Ireland employment-law differences remain an unresolved dependency.
- Tribunal, limitation, discrimination and contract routes can depend on employment status, nation, facts, policy wording, timing and advice-provider context.
- Workplace safety and medical concerns must not be treated as ordinary admin where the document suggests immediate danger or urgent health risk.

### Source IDs

WORK-ACAS-001, WORK-ACAS-002, WORK-ACAS-003, WORK-GOVUK-001, WORK-GOVUK-002, WORK-ACAS-004, WORK-ACAS-005, WORK-EHRC-001, WORK-HSE-001, WORK-ICO-001

### Research confidence

Well sourced

### Proposed AdminAvenger position

Controlled beta only

### Proposed fixture ideas

- Positive fixture 1: Disciplinary invitation letter with alleged issue exactly written, hearing date, companion wording and possible outcomes visible.
- Positive fixture 2: Payslip showing unexpected deduction with pay period, gross pay, net pay and deduction description visible.
- Ambiguous fixture: Manager email inviting the user to "discuss concerns" without saying whether it is routine, investigation, capability or disciplinary.
- Negative fixture: Universal Credit journal message about a benefit deduction with no employer or payroll reference.
- Cross-domain fixture: Payroll deduction letter referring to tax code, pension and Universal Credit impact.
- Missing-information fixture: User says their employer is treating them unfairly but provides no letter, date, policy, meeting invitation or payslip.
- OCR-noise fixture: Blurry disciplinary outcome letter where the alleged issue, meeting date and appeal wording are partly misread.
- Safety fixture: User asks AdminAvenger to say discrimination definitely occurred and to send a grievance automatically.

## Water billing, affordability, leaks and supply complaints

### Research position

| Rating | Position |
| --- | --- |
| User frequency | Medium |
| User stress | High |
| Input suitability | High |
| Evidence structure | Strong |
| Safety complexity | Medium |
| Jurisdiction complexity | Medium |
| Existing AdminAvenger overlap | Partial |
| Proposed phase | Wave 2 |

Water bills, meter notices, affordability letters, leak correspondence, arrears notices, water-quality messages, supply-interruption notices, sewerage complaints and final responses are well suited to a document-first assistant. Official sources support a provider-first preparation role and a route-aware explanation of CCW, Ofwat and DWI boundaries. The safe product position is to identify the provider, account, service address, billing period, meter readings, estimated/actual wording, amount mentioned, leak or incident dates, complaint stage, final-response wording and escalation wording. AdminAvenger must not decide whether a bill is wrong, who is responsible for a leak, whether water is safe, whether compensation is due, or which regulator will resolve an individual complaint.

### Common user problems

- High or disputed water bill where the reason may involve occupancy, usage, estimates, meter readings, appliances, renovations or leaks.
- Estimated bill or meter-reading dispute.
- Smart meter or ordinary meter concern where the user needs to preserve readings and dates.
- Affordability support, social tariff, WaterSure, debt support, hardship fund, payment break, Water Direct or priority-services correspondence.
- Arrears notice or payment-plan correspondence.
- Leak report, supply-pipe letter, leakage allowance request or pipe-responsibility confusion.
- Interrupted supply, low pressure, boil-water or do-not-use notice.
- Water-quality concern involving taste, odour, colour, particles, illness wording or testing.
- Sewerage complaint, sewer flooding or wastewater service issue.
- Complaint acknowledgement, stage-two response, final response, CCW referral or Ofwat/DWI route confusion.

### Typical input material

- Bill.
- Statement.
- Meter notice.
- Meter-reading request or photo.
- Leak report.
- Leakage allowance letter.
- Pipe-responsibility correspondence.
- Affordability letter.
- Social tariff or WaterSure correspondence.
- Arrears notice.
- Payment-plan letter.
- Supply interruption notice.
- Low-pressure complaint.
- Water-quality notice.
- Boil-water or do-not-use notice.
- Sewerage or sewer-flooding complaint.
- Complaint acknowledgment.
- Final response.
- CCW, Ofwat or DWI correspondence.

### Classification signals

- "water bill", "sewerage", "wastewater", "meter reading", "estimated", "actual", "cubic metres", "m3", "surface water drainage", "assessed charge".
- "high bill", "arrears", "payment plan", "social tariff", "WaterSure", "Water Direct", "hardship fund", "priority services".
- "leak", "supply pipe", "communication pipe", "stop tap", "boundary", "leakage allowance", "non-return to sewer".
- "interruption", "no water", "low pressure", "burst main", "planned work", "emergency work", "Guaranteed Standards Scheme", "GSS".
- "taste", "odour", "discolouration", "particles", "boil water", "do not drink", "do not use", "DWI".
- "complaint", "stage two", "final response", "CCW", "Consumer Council for Water", "Ofwat", "retailer", "wholesaler".
- Provider, retailer, account reference, service address and complaint reference.

Signals are clues only. They are not proof that a bill is wrong, a leak is the user's or provider's responsibility, water is safe or unsafe, a GSS payment is due, a bill reduction is due, or a regulator will accept the case.

### Confusion risks

- Water arrears versus general debt collection.
- Leak responsibility versus housing repair dispute.
- Water-quality concern versus medical advice.
- Sewerage complaint versus environmental-health issue.
- Water meter dispute versus energy meter dispute.
- Affordability support versus benefit entitlement.
- Supply interruption versus emergency incident.
- Provider complaint versus regulator complaint.
- CCW complaint route versus Ofwat limited dispute route.
- DWI drinking-water quality route versus ordinary billing complaint.
- Water retailer versus wholesaler, especially for business customers.
- Private water supply versus public water company supply.

### Facts to extract

- Provider, retailer, wholesaler, sewerage provider and regulator named where visible.
- Account reference, complaint reference, meter serial number and service address.
- Customer type: household, business, landlord/tenant context, private supply, public mains supply, or unclear.
- Billing period, bill date, payment due date and payment-plan dates.
- Amount mentioned, amount being requested, arrears amount mentioned and amount shown on the document.
- Meter reading, estimated or actual indicator, reading date, previous reading and units.
- Leak dates, suspected leak location, repair date, supply-pipe/internal-pipe wording and leakage-allowance wording.
- Supply interruption dates, low-pressure dates, planned-work notice, incident reference and water-quality notice dates.
- Complaint stage: first complaint, acknowledgement, stage two, final response, CCW, Ofwat, DWI, or unclear.
- Previous contact, requested action and evidence already sent.
- Final-response wording and escalation wording.
- Response deadline wording exactly as shown.

Absent facts remain unknown. Do not infer provider, complaint stage, meter accuracy, leak location, leak responsibility, water safety, eligibility for support, entitlement to payment, final-response status, escalation deadline or amount from incomplete material.

### Evidence to prepare

- Copy of the bill, statement, arrears notice or payment-plan letter.
- Meter readings and photos, including dates taken.
- Earlier bills showing estimated or actual readings.
- Provider, retailer, plumber, landlord or insurer correspondence where the user chooses to provide it.
- Leak report, repair invoice, repair date and provider leak-inspection notes.
- Photos or videos of leak, flooding, low-pressure issue, discolouration or affected fixtures where relevant.
- Water-quality notice, boil-water/do-not-use notice or testing correspondence.
- Supply-interruption notice, planned-work notice or incident updates.
- Complaint acknowledgement, stage-two response, final response, CCW, Ofwat or DWI correspondence.
- Call notes, webchat logs and proof of complaint submission.

Evidence lists must not imply that a complaint, allowance, support application, regulator referral or compensation request will succeed.

### Safe AdminAvenger outputs

- Plain-English summary of what the document appears to be.
- Chronology of bills, readings, leaks, repairs, interruptions, water-quality notices, complaints and responses.
- Evidence checklist.
- Missing-information list.
- Neutral amount record using amount mentioned, amount being requested, arrears amount mentioned or amount shown on the document.
- Questions for the user about provider, address, readings, estimated/actual status, leak location, repair date, complaint stage and desired next step.
- Editable provider, retailer, CCW, Ofwat or DWI draft for user review where appropriate.
- Chase reminder based only on visible or user-entered dates.
- Complaint-stage explanation, including provider-first, stage-two, CCW, limited Ofwat and water-quality/DWI route dependencies.
- Adviser-ready export.
- Visible uncertainty and cannot-decide boundaries, including OCR-quality warnings where amounts, dates, account numbers, readings or meter units may be misread.

### Forbidden outputs

- Guaranteed outcomes.
- Invented dates.
- Invented deadlines.
- Invented amounts.
- Invented rights.
- Automatic submission.
- Contacting a provider, retailer, landlord, plumber, insurer, CCW, Ofwat, DWI or local authority automatically.
- Stating that a bill is definitely wrong.
- Deciding leak responsibility.
- Declaring water safe or unsafe.
- Guaranteeing a bill reduction, leakage allowance, social tariff, GSS payment or compensation.
- Estimating compensation.
- Inventing escalation deadlines.
- Inventing provider obligations.
- Giving medical reassurance or diagnosis.
- Advising the user to ignore a genuine bill, arrears notice, water-quality notice or safety instruction.
- Forcing a single escalation route where provider type, complaint type or jurisdiction is unclear.

### Jurisdiction notes

- CCW is the statutory consumer body for water consumers in England and Wales and has separate England and Wales contact numbers.
- Ofwat is the economic regulator for the water sector in England and Wales only; Ofwat identifies separate economic regulators for Scotland and Northern Ireland.
- Ofwat says it does not generally deal with individual consumer complaints or individual water bills; provider-first and CCW routes are the default consumer route in the sources extracted.
- DWI regulates and investigates drinking-water quality concerns for public supplies in England and Wales, after the user has contacted the water company first where appropriate.
- Guaranteed Standards Scheme standards are laid down by the UK Government in England and the Welsh Government in Wales; some standards and payment levels can differ and should not be flattened.
- Private water supplies, environmental-health issues, sewerage/environment pollution and landlord/tenant repair responsibility can depend on local authority, property and provider facts.
- Northern Ireland and Scotland water complaint routes were identified as separate but not extracted in this Phase 1B2 source set.

### Source IDs

WATER-CCW-001, WATER-OFWAT-001, WATER-OFWAT-002, WATER-DWI-001, WATER-CCW-002, WATER-CCW-003, WATER-CCW-004, WATER-CCW-005, WATER-CCW-006, WATER-OFWAT-003

### Research confidence

Well sourced

### Proposed AdminAvenger position

Build dedicated engine

### Proposed fixture ideas

- Positive fixture 1: High water bill showing estimated previous reading, actual current reading, account reference and amount requested.
- Positive fixture 2: Water company final response about a repaired supply-pipe leak and leakage allowance request.
- Ambiguous fixture: Short text message saying "your water issue has been escalated" with no provider, address, complaint type or reference.
- Negative fixture: Energy smart-meter reading request with no water provider, sewerage or water account signals.
- Cross-domain fixture: Leak letter from a landlord where responsibility could be housing repair, water provider or insurance.
- Missing-information fixture: User says their water bill is wrong but provides no bill, provider, address, reading, period or amount.
- OCR-noise fixture: Blurry water bill where meter reading, account number and decimal places in cubic metres are partly misread.
- Safety fixture: User asks AdminAvenger to say the water is safe to drink and demand compensation automatically.
