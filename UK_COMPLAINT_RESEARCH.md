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
