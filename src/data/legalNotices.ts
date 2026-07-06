// Content for the Terms & Safety acceptance gate (src/components/TermsSafetyGate.tsx)
// and the standalone legal documents it links to (src/components/LegalDocumentViewer.tsx).
//
// Kept as plain data, not JSX, so the same wording is used everywhere it's
// shown (the gate, Settings > "View Terms & Safety Notice again", and each
// standalone document) rather than being retyped in multiple components.
//
// Writing rules for everything in this file (adminavenger writing standard):
// - Plain English, no legal jargon dressed up as authority.
// - Never say the app will act, send, submit, or contact anyone automatically.
// - Never guarantee an outcome or state entitlement/debt as a fact.
// - Never bury a disclaimer in filler text - say it plainly.

export type LegalDocumentId = "terms" | "privacy" | "safety" | "storage";

export type LegalDocumentSection = {
  heading: string;
  body: string[];
};

export type LegalDocument = {
  id: LegalDocumentId;
  title: string;
  summary: string;
  sections: LegalDocumentSection[];
};

export type GateSection = {
  id: string;
  heading: string;
  items: string[];
};

export const TERMS_GATE_TITLE = "Before you use AdminAvenger";

export const TERMS_GATE_CORE_MESSAGE =
  "AdminAvenger helps you understand admin messages, letters, bills, benefit decisions, parking notices, debt letters, consumer disputes, and similar documents. It can make mistakes. It is not a lawyer, financial adviser, benefits adviser, claims company, medical adviser, debt adviser, or government service. It does not send messages, submit claims, contact organisations, or take action for you. You decide what to save, copy, send, ignore, or act on.";

// The required sections shown in the gate itself, in order. This is the
// on-page summary; the four linked documents below go into more detail.
export const gateSections: GateSection[] = [
  {
    id: "what-it-does",
    heading: "1. What AdminAvenger does",
    items: [
      "Helps explain pasted text, uploaded files, screenshots, and photos in plain English.",
      "Suggests possible next steps, evidence, deadlines, and draft wording.",
      "Keeps the human in control.",
    ],
  },
  {
    id: "what-it-does-not-do",
    heading: "2. What AdminAvenger does not do",
    items: [
      "Does not provide legal, financial, medical, debt, benefits, immigration, or regulated advice.",
      "Does not guarantee outcomes.",
      "Does not decide whether the user qualifies for benefits.",
      "Does not decide whether the user owes money.",
      "Does not send emails or messages.",
      "Does not submit appeals, claims, complaints, or forms.",
      "Does not contact DWP, councils, parking firms, banks, companies, or courts.",
      "Does not replace official advice or professional advice.",
    ],
  },
  {
    id: "user-responsibility",
    heading: "3. User responsibility",
    items: [
      "The user must check important information before acting.",
      "The user should get free or professional advice if something is serious, urgent, high-value, or could affect benefits, housing, debt, court action, immigration, health, or legal rights.",
      "The user is responsible for anything they choose to send, save, ignore, or act on.",
    ],
  },
  {
    id: "privacy-local-first",
    heading: "4. Privacy / local-first",
    items: [
      "In this version, text pasted into the app stays in this browser unless the user chooses otherwise.",
      "AdminAvenger may use browser storage to save cases, settings, and acceptance status.",
      "Users should remove passwords, full bank details, national insurance numbers, account numbers, and other unnecessary sensitive details before pasting.",
      "If any cloud AI or external service is added later, it must be opt-in and clearly explained before use.",
    ],
  },
  {
    id: "money-safety",
    heading: "5. Money safety",
    items: [
      "Amounts shown in letters are not counted as saved or recovered.",
      "Demands, deductions, possible refunds, possible benefit entitlement, and disputed amounts are not counted as money saved.",
      "Money is only counted when the user manually records a confirmed outcome.",
    ],
  },
  {
    id: "drafts-and-templates",
    heading: "6. Drafts and templates",
    items: [
      "Drafts are preparation help only.",
      "The app does not send them.",
      "The user must review and edit any draft before using it.",
      "Drafts may be incomplete or wrong if the input is incomplete or unclear.",
    ],
  },
  {
    id: "emergency",
    heading: "7. Emergency / serious situations",
    items: [
      "If there is risk of eviction, bailiff action, court deadline, benefit sanction, no food/heating, domestic abuse, self-harm, fraud, or urgent legal/medical danger, the user should seek appropriate urgent help and not rely only on the app.",
    ],
  },
];

export const requiredCheckboxCopy = {
  understandsCanBeWrong:
    "I understand AdminAvenger can be wrong and does not provide legal, financial, benefits, medical, debt, or regulated advice.",
  understandsNoAutoAction:
    "I understand AdminAvenger does not send messages, submit claims, or take action for me.",
  understandsUserResponsible:
    "I understand I am responsible for checking information and deciding what to do.",
  agreesToTerms: "I agree to the Terms, Privacy Notice, and Safety Notice.",
} as const;

export const declineMessage =
  "You need to accept the Terms & Safety Notice to use AdminAvenger.";

export const legalDocuments: Record<LegalDocumentId, LegalDocument> = {
  terms: {
    id: "terms",
    title: "Terms of Use",
    summary:
      "The plain-English rules for using AdminAvenger: what it is, what it is not, and what you're agreeing to.",
    sections: [
      {
        heading: "What AdminAvenger is",
        body: [
          "AdminAvenger is a tool that helps you read and understand admin letters, emails, bills, benefit decisions, parking notices, debt letters, and similar documents, and prepare possible next steps.",
          "It is a local-first prototype. It reads what you paste, upload, or photograph, and gives you a plain-English explanation, possible next steps, and draft wording for you to review.",
        ],
      },
      {
        heading: "What AdminAvenger is not",
        body: [
          "AdminAvenger is not a lawyer, solicitor, financial adviser, benefits adviser, claims management company, medical adviser, debt adviser, or government service.",
          "It does not replace official advice, professional advice, or a decision made by an official body (such as DWP, a council, a court, or a bank).",
          "Nothing AdminAvenger shows you is a guarantee of any outcome, entitlement, debt, or legal position.",
        ],
      },
      {
        heading: "It does not act on your behalf",
        body: [
          "AdminAvenger does not send emails or messages, submit appeals, claims, complaints, or forms, or contact DWP, councils, parking firms, banks, companies, or courts.",
          "Any draft message, checklist, or template it prepares is for you to review, edit, and send yourself if you choose to.",
        ],
      },
      {
        heading: "Your responsibility",
        body: [
          "You are responsible for checking important information before acting on it, and for anything you choose to send, save, ignore, or act on.",
          "If a situation is serious, urgent, high-value, or could affect your benefits, housing, debt, court action, immigration status, health, or legal rights, get free or professional advice rather than relying only on this app.",
        ],
      },
      {
        heading: "No guarantee, no liability for your decisions",
        body: [
          "AdminAvenger is provided as a helper tool, without a guarantee that its explanations, suggestions, or drafts are complete, accurate, or up to date.",
          "You use the suggestions and drafts at your own discretion. Decisions about what to send, submit, dispute, pay, or ignore are yours alone.",
        ],
      },
      {
        heading: "Changes to these Terms",
        body: [
          "If these Terms, the Privacy Notice, or the Safety Notice change in a way that matters, you will be asked to accept the updated version again before continuing to use the app.",
        ],
      },
    ],
  },
  privacy: {
    id: "privacy",
    title: "Privacy Notice",
    summary: "What AdminAvenger stores, where it stays, and what you should avoid pasting in.",
    sections: [
      {
        heading: "Local-first, in this version",
        body: [
          "In this version of AdminAvenger, text you paste, files you upload, and photos you take are processed in this browser, on this device.",
          "Saved cases, settings, and your Terms & Safety acceptance status are stored using this browser's local storage, on this device. Nothing is uploaded to a server by default.",
        ],
      },
      {
        heading: "What AdminAvenger stores locally",
        body: [
          "Cases, findings, drafts, and money-tracking entries you save.",
          "App settings such as inbox-scan preferences.",
          "Your Terms & Safety acceptance status (just the version you accepted - see the Local storage / cookies notice for the exact key used).",
        ],
      },
      {
        heading: "What to avoid pasting in",
        body: [
          "Please remove passwords, full bank details, national insurance numbers, account numbers, one-time passcodes, and other sensitive details you do not need to include before pasting text in. AdminAvenger does not need them to help.",
        ],
      },
      {
        heading: "No cloud AI by default",
        body: [
          "AdminAvenger does not send your data to a cloud AI service by default. If a cloud AI or another external service is added in a future version, it will be opt-in, and clearly explained before it is used, not switched on for you automatically.",
        ],
      },
      {
        heading: "No tracking, no analytics",
        body: [
          "This app does not use tracking cookies or analytics services to monitor how you use it.",
        ],
      },
      {
        heading: "Clearing your data",
        body: [
          "You can download a local backup, clear all local AdminAvenger data, or reset your Terms & Safety acceptance from Settings at any time. Clearing browser data on this device can also delete everything AdminAvenger has stored.",
        ],
      },
    ],
  },
  safety: {
    id: "safety",
    title: "Safety Notice",
    summary: "How to use AdminAvenger safely, and when to get help beyond the app.",
    sections: [
      {
        heading: "AdminAvenger can be wrong",
        body: [
          "AdminAvenger reads what you give it and does its best to explain it in plain English, but it can misread a document, miss something important, or suggest a next step that does not fit your exact situation.",
          "Always check anything important before relying on it, especially dates, amounts, and deadlines.",
        ],
      },
      {
        heading: "Nothing here is legal, financial, medical, debt, or benefits advice",
        body: [
          "AdminAvenger describes what a document appears to say and what evidence or next steps may be worth considering. It does not tell you what you are legally entitled to, what you owe, or what a medical, financial, benefits, or debt decision should be.",
        ],
      },
      {
        heading: "It never acts for you",
        body: [
          "AdminAvenger does not send messages, submit appeals, claims, complaints, or forms, or contact any organisation on your behalf. You always review and send anything yourself.",
        ],
      },
      {
        heading: "Get urgent help if the situation is serious",
        body: [
          "If there is a risk of eviction, bailiff action, a court deadline, a benefit sanction, no food or heating, domestic abuse, self-harm, fraud, or any urgent legal or medical danger, please seek appropriate urgent help (for example a free advice service, your GP, the police, or emergency services) rather than relying only on this app.",
          "Citizens Advice and other free advice services can help with benefits, debt, housing, and consumer problems if a situation feels serious, urgent, or high-value.",
        ],
      },
      {
        heading: "Suspicious messages",
        body: [
          "If a message you paste looks suspicious (asks for bank details, passwords, or one-time codes, or pressures you to act immediately), do not click links or reply from within the original message. Use the organisation's official website or contact details instead.",
        ],
      },
    ],
  },
  storage: {
    id: "storage",
    title: "Local storage / cookies notice",
    summary: "What AdminAvenger keeps in this browser, and why.",
    sections: [
      {
        heading: "No tracking cookies",
        body: [
          "AdminAvenger does not use cookies for tracking or advertising, and does not use analytics services.",
        ],
      },
      {
        heading: "What is kept in browser local storage",
        body: [
          "Your saved cases, findings, drafts, and money-tracking entries, so they are still here next time you open the app.",
          "App settings, such as inbox-scan preview preferences.",
          "Your Terms & Safety acceptance status, stored as a version string under the key adminAvengerTermsAcceptedVersion - not any personal information, just which version of the Terms you accepted and when the app should ask again.",
        ],
      },
      {
        heading: "Why a version is stored, not just yes/no",
        body: [
          "Storing the exact terms version you accepted (rather than a plain \"accepted\" flag) means that if the Terms, Privacy Notice, or Safety Notice are updated later, the app can tell your previous acceptance no longer matches and ask you to review and accept again.",
        ],
      },
      {
        heading: "Clearing it yourself",
        body: [
          "You can clear all local AdminAvenger data, or just reset your Terms & Safety acceptance on its own, from Settings. Clearing your browser's site data for AdminAvenger has the same effect.",
        ],
      },
    ],
  },
};

export const legalDocumentOrder: LegalDocumentId[] = ["terms", "privacy", "safety", "storage"];
