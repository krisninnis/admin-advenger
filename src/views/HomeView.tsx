import { useEffect, useMemo, useReducer, useState, type DragEvent } from "react";
import { EmailSafetyModal } from "../components/EmailSafetyModal";
import { FrontDoorConfirmationPanel } from "../components/FrontDoorConfirmationPanel";
import { BenefitsActionPackPanel } from "../components/BenefitsActionPackPanel";
import { GuidedNextStepPanel } from "../components/GuidedNextStepPanel";
import { InboxScanPreview } from "../components/InboxScanPreview";
import { InboxScanPromptCard } from "../components/InboxScanPromptCard";
import { LowConfidenceOcrReviewPanel } from "../components/LowConfidenceOcrReviewPanel";
import { OpportunityCardPanel } from "../components/OpportunityCardPanel";
import { PhotoCapturePanel } from "../components/PhotoCapturePanel";
import {
  ResultCaseSheet,
  type ResultCaseSheetAction,
} from "../components/ResultCaseSheet";
import { StatusBadge } from "../components/StatusBadge";
import { StrategicNextStepPanel } from "../components/StrategicNextStepPanel";
import type { InboxScanSettings } from "../lib/inboxScanStorage";
import { getGuidedCaseMode, type GuidedCaseMode } from "../lib/guidedCaseMode";
import { deriveGuidedNextStep } from "../lib/guidedNextSteps";
import {
  loadAiProviderSettings,
  saveAiProviderSettings,
  type AiMode,
} from "../lib/aiProviderSettings";
import { buildAdminTextFromAiExtraction } from "../lib/aiExtractionAdapter";
import {
  buildAdviserExportPack,
  getAdviserExportFilename,
  renderAdviserExportMarkdown,
} from "../lib/adviserExportPack";
import { downloadAdviserExportMarkdown } from "../lib/adviserExportDownload";
import { buildBenefitsActionPack } from "../lib/benefitsActionPack";
import { selectMostImportantCase } from "../lib/caseFactory";
import { deriveOpportunityCard, describeConfidence } from "../lib/opportunityCards";
import { buildResultViewModel } from "../lib/resultViewModel";
import { buildStrategicNextStepPlan } from "../lib/strategicNextStep";
import {
  createPhotoIntakeMetadata,
  getImageDimensions,
  getImageQualityWarnings,
  isSupportedPhotoFile,
  type PhotoIntakeMetadata,
} from "../lib/photoIntake";
import {
  assessDocumentImageQuality,
  getVisibleDocumentQualityWarningMessagesAfterOcr,
} from "../lib/documentImageQuality";
import { assessEmailSafety } from "../lib/suspiciousEmail";
import {
  frontDoorRouteReducer,
  initialFrontDoorRouteState,
  type FrontDoorChoiceId,
} from "../lib/frontDoorIntent/frontDoorRouteView";
import {
  decideFrontDoorSubmission,
  ordinaryDocumentSubmission,
} from "../lib/frontDoorIntent/submissionDecision";
import {
  frontDoorInputSnapshotsMatch,
  type FrontDoorInputSnapshot,
  type FrontDoorSubmissionSource,
} from "../lib/frontDoorIntent/submissionSource";
import {
  isCoarsePointerEnvironment,
  shouldSubmitOnEnterKey,
} from "../lib/checkInputKeyboard";
import {
  classifyUploadedFile,
  isSupportedTextFile,
  photoCaptureAcceptAttribute,
  quickUploadAcceptAttribute,
  UNSUPPORTED_FILE_MESSAGE,
} from "../lib/fileIntakeAccept";
import { FILE_SIZE_LIMIT_HELPER, getFileTooLargeMessage, isFileWithinSizeLimit } from "../lib/fileSizeLimit";
import { DocumentAttachmentArea } from "../components/DocumentAttachmentArea";
import { CareFeeClaimConfirmationPanel } from "../components/CareFeeClaimConfirmationPanel";
import { CareFeeSafeComparisonResultPanel } from "../components/CareFeeSafeComparisonResultPanel";
import type { ConfirmedCareFeeComparisonRequestV1 } from "../lib/careFeeClaimConfirmation";
import {
  runCareFeeSafeComparison,
  type CareFeeSafeComparisonResultViewModel,
} from "../lib/careFeeSafeComparison";
import {
  ATTACHMENT_READ_FAILED_MESSAGE,
  buildAttachedFilesCombinedText,
  buildCheckSourceTitle,
  buildDocumentFileSegments,
  buildSourceDocuments,
  combineTypedTextWithAttachments,
  createAttachedFile,
  getFilesFromDroppedDataTransfer,
  hasReadableAttachedText,
  VISIBLE_INPUT_DROP_HELPER,
  VISIBLE_INPUT_DROP_LABEL,
  type AttachedFile,
} from "../lib/documentAttachmentIntake";
import { extractDocxText, extractPdfText } from "../lib/documentFileText";
import {
  PHOTO_ADD_CLOSE_UP_DESCRIPTION,
  PHOTO_ADD_CLOSE_UP_LABEL,
  PHOTO_RETAKE_PHOTO_LABEL,
  type CapturedPhotoForOcr,
} from "../lib/photoCapture";
import type { ServiceStatus } from "../services/analysisService";
import {
  OCR_FAILED_MESSAGE,
  OCR_ADD_CLOSE_UP_SUGGESTION,
  OCR_COMBINED_PHOTOS_ON_DEVICE_MESSAGE,
  OCR_MISTAKES_MESSAGE,
  OCR_ON_DEVICE_MESSAGE,
  OCR_READING_STATUS_MESSAGE,
  OCR_REVIEW_BEFORE_CHECKING_MESSAGE,
  OCR_RUNS_ON_DEVICE_MESSAGE,
  OCR_EXTRA_PHOTO_LABEL,
  OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE,
  OCR_KEY_DETAILS_REVIEW_OPTIONS_MESSAGE,
  OcrReadError,
  appendExtraPhotoText,
  formatOcrSectionWarning,
  isOcrKeyDetailsReliable,
  isOcrResultUnreliable,
  readTextFromImage,
} from "../lib/photoOcr";
import {
  OCR_KEY_DETAILS_CHECK_MESSAGE,
  OCR_KEY_DETAILS_HEADING,
  OCR_KEY_DETAILS_HIDDEN_UNRELIABLE_MESSAGE,
  OCR_KEY_DETAILS_LOW_QUALITY_CAUTION,
  extractOcrKeyDetails,
  getVisibleOcrKeyDetails,
  groupOcrKeyDetails,
} from "../lib/ocrKeyDetails";
import {
  extractAdminFactsWithOllama,
  OllamaExtractionError,
} from "../services/ollamaExtractionService";
import type {
  AdminCase,
  AdminFinding,
  AdminItem,
  AiExtractionResult,
  EmailSafetyAssessment,
  SourceType,
} from "../types";
import {
  createPhotoSourceDocument,
  createSourceDocumentId,
  createTextSourceDocument,
  type SourceDocument,
} from "../lib/sourceProvenance";
import type { GuidedDraftToSave } from "../lib/guidedDraftSave";
import { submitAcceptedText } from "../lib/submissionHandoff";
import { isControlledFeatureEnabled } from "../lib/publicScopePolicy";

export type HomeAnalysisResult = {
  item: AdminItem;
  findings: AdminFinding[];
  cases: AdminCase[];
};

type HomeViewProps = {
  result?: HomeAnalysisResult;
  analysisStatus: ServiceStatus;
  analysisError?: string;
  onCheck: (
    title: string,
    sourceType: SourceType,
    rawText: string,
    userQuestion?: string,
    sourceDocuments?: readonly SourceDocument[],
  ) => Promise<boolean>;
  onSaveCase: (caseId: string, draft?: GuidedDraftToSave) => void;
  onSaveRecord: (caseId: string) => void;
  onClearResult: () => void;
  inboxScanSettings: InboxScanSettings;
  onUpdateInboxScanSettings: (updates: Partial<InboxScanSettings>) => void;
  onIgnoreInboxScanItem: (sampleId: string) => void;
  onSaveScannedItem: (item: AdminItem, findings: AdminFinding[], cases: AdminCase[]) => void;
  onSaveEmailSafetyCase: (item: AdminItem, assessment: EmailSafetyAssessment) => void;
};

const categoryLabels: Record<AdminCase["category"], string> = {
  refund: "Refund or money back",
  complaint: "Complaint",
  subscription: "Subscription or renewal",
  deadline: "Deadline",
  job_application: "Job follow-up",
  bill_increase: "Bill or price increase",
  warranty: "Warranty",
  important_reply: "Important reply",
  admin_dispute: "Admin/rights check",
  unknown: "Needs review",
};

const getMissingEvidence = (adminCase: AdminCase) =>
  adminCase.broadbandPriceRiseAssessment
    ? (adminCase.broadbandPriceRiseAssessment.evidenceMissing ?? [])
    : adminCase.evidence
        .filter((evidence) => evidence.label.toLowerCase().startsWith("missing"))
        .map((evidence) => evidence.label.replace(/^Missing:\s*/i, ""));

const getCaveat = (adminCase: AdminCase) =>
  adminCase.broadbandPriceRiseAssessment?.caveat ??
  adminCase.delayRepayAssessment?.ruleCaveat ??
  undefined;

const confidenceLabels = {
  high: "High",
  medium: "Medium",
  low: "Low",
  needs_more_info: "Needs more info",
};

const getDocumentMatchConfidence = (adminCase: AdminCase) =>
  adminCase.broadbandPriceRiseAssessment?.documentMatchConfidence ?? "medium";

const getActionConfidence = (adminCase: AdminCase) =>
  adminCase.broadbandPriceRiseAssessment?.actionConfidence ?? "needs_more_info";

const getResultTitle = (adminCase: AdminCase) =>
  adminCase.broadbandPriceRiseAssessment
    ? "Your bill looks like it is going up."
    : adminCase.title;

const isLowActionDeliveryUpdate = (adminCase?: AdminCase) =>
  adminCase?.category === "unknown" && /^delivery update/i.test(adminCase.title);

const isNoActionResult = (adminCase?: AdminCase) =>
  adminCase?.category === "unknown" &&
  /^(?:No obvious saving or action found|Account closure confirmed|Account closed - balance needs checking|Charge removal confirmed)/i.test(
    adminCase.title,
  );

const isAppointmentTask = (adminCase?: AdminCase) =>
  Boolean(adminCase && /appointment to rebook|thing to do|rebook/i.test(adminCase.title));

const getEvidenceSummary = (adminCase: AdminCase) =>
  adminCase.broadbandPriceRiseAssessment
    ? (adminCase.broadbandPriceRiseAssessment.evidenceFound ?? []).slice(0, 4).join(", ")
    : adminCase.evidence
        .slice(0, 3)
        .map((item) => item.label)
        .join(", ");

const getBroadbandChecks = (adminCase: AdminCase) => {
  const assessment = adminCase.broadbandPriceRiseAssessment;

  if (!assessment) {
    return [];
  }

  return [
    assessment.providerName ? undefined : "Provider name",
    assessment.contractStartOrRenewalDate ? undefined : "Contract start/renewal date",
    (assessment.rightsConfirmed ?? []).length > 0
      ? undefined
      : "Whether cancellation/switching rights actually apply",
  ].filter((item): item is string => Boolean(item));
};

const getContractTimingLabel = (adminCase: AdminCase) => {
  const regime = adminCase.broadbandPriceRiseAssessment?.contractDateRegime;

  if (regime === "newer_or_renewed") {
    return "Appears on or after 17 January 2025";
  }

  if (regime === "older") {
    return "Appears before 17 January 2025";
  }

  if (regime === "unknown") {
    return "Contract date found, but timing needs checking";
  }

  return undefined;
};

const isBroadbandRelatedReminder = (primaryCase: AdminCase, adminCase: AdminCase) =>
  Boolean(primaryCase.broadbandPriceRiseAssessment) &&
  adminCase.itemId === primaryCase.itemId &&
  (adminCase.category === "deadline" || adminCase.category === "important_reply");

const ollamaModelOptions = [
  "llama3.2",
  "qwen2.5:7b",
  "qwen2.5:14b",
  "llama3.1:8b",
  "mistral",
];

const isPresetOllamaModel = (model: string) => ollamaModelOptions.includes(model);

const getHomePrimaryActionLabel = (opportunityType: string, guidedMode: GuidedCaseMode) => {
  // Evidence/admin checks are never money-back cases, so never show "Track refund".
  if (opportunityType === "travel_evidence_check") {
    return "Save this check";
  }

  if (guidedMode === "saving_or_review") {
    return "Save this check";
  }

  if (opportunityType === "travel_extra_cost_recovery") {
    return "Save this check";
  }

  if (opportunityType === "refund_expected" || opportunityType === "money_back") {
    return "Track refund";
  }

  if (
    opportunityType === "subscription_recurring_charge" ||
    opportunityType === "subscription_renewal"
  ) {
    return "Review subscription";
  }

  if (opportunityType === "suspicious_email_risk") {
    return "Check email safety";
  }

  if (
    opportunityType === "no_action_needed" ||
    opportunityType === "account_outcome_confirmation" ||
    opportunityType === "delivery_update" ||
    opportunityType === "receipt_guardian"
  ) {
    return "Save as record";
  }

  return "Save this check";
};

const sampleInputs: Array<{ label: string; title: string; sourceType: SourceType; rawText: string }> = [
  {
    label: "Price-rise notice",
    title: "Broadband/mobile price-rise notice",
    sourceType: "bill",
    rawText:
      "Important notice: your broadband and mobile tariff will increase from GBP 34 to GBP 46 per month from 1 August. Please review your options before the change date. You can contact us to discuss your package, switch plan, or confirm whether cancellation rights apply.",
  },
  {
    label: "Refund approved",
    title: "Refund approved",
    sourceType: "email",
    rawText:
      "Your refund of GBP 42.99 has been approved and will be returned to your original payment method within 5 to 10 working days. Reference RF12345.",
  },
  {
    label: "Subscription renewal",
    title: "Subscription renewal",
    sourceType: "email",
    rawText:
      "Your annual subscription renews on 12 July for GBP 79.99. Cancel before 10 July to avoid being charged.",
  },
  {
    label: "Receipt",
    title: "Receipt / proof of purchase",
    sourceType: "receipt",
    rawText:
      "Order confirmation. Retailer: Currys. Item: headphones. Paid GBP 89.99 on 3 June. Order number C12345.",
  },
  {
    label: "Missing parcel",
    title: "Missing parcel",
    sourceType: "email",
    rawText:
      "Your parcel has not arrived. It was due yesterday. Please contact us within 48 hours if it is still missing.",
  },
  {
    label: "Delivery update",
    title: "Delivery update",
    sourceType: "email",
    rawText:
      "Your parcel is due to arrive tomorrow between 10am and 2pm. Track your delivery using the link below.",
  },
  {
    label: "Payment received",
    title: "Payment received",
    sourceType: "email",
    rawText:
      "Thank you for your payment. Your account balance is now GBP 0.00. No action is required.",
  },
  {
    label: "Risky email",
    title: "Account verification required",
    sourceType: "email",
    rawText:
      "Your account will be locked today. Click this link immediately to verify your bank details and avoid suspension. Sender: support@secure-bank-login-example.com. Reply-to: randomhelpdesk@example.net.",
  },
];

type OcrStatus = "idle" | "reading" | "success" | "error";
type PhotoCaptureIntent = "replace" | "append" | "attachment";

function FactList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// WCP-005, mobile page length.
//
// The care-preparation summary was measured several screens below the top of the
// page on a 320 px phone, because the whole input surface stayed at full height
// above it. This is what stands in its place while a Wales care route is live: a
// short, readable record of what was submitted, and one control that says
// exactly what it will do.
//
// It hides nothing. The care panel below still echoes the full wording, the
// controls come back untouched with the text still in them, and the person can
// leave through the ordinary-message check as before. This component holds no
// rule about routing and cannot submit, save or send anything.
const COMPACT_MESSAGE_HEADING = "Your message";
const COMPACT_MESSAGE_REOPEN_LABEL = "View or change original message";
const COMPACT_MESSAGE_PREVIEW_LIMIT = 180;

const compactMessagePreview = (text: string): string => {
  const collapsed = text.trim().replace(/\s+/g, " ");
  return collapsed.length > COMPACT_MESSAGE_PREVIEW_LIMIT
    ? `${collapsed.slice(0, COMPACT_MESSAGE_PREVIEW_LIMIT).trimEnd()}...`
    : collapsed;
};

function CompactSubmittedMessage({
  submittedText,
  isOpen,
  onToggle,
  disclosureId,
}: {
  submittedText: string;
  isOpen: boolean;
  onToggle: () => void;
  disclosureId: string;
}) {
  return (
    <section
      className="rounded-lg border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-slate-950/20 sm:p-5"
      aria-label={COMPACT_MESSAGE_HEADING}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        {COMPACT_MESSAGE_HEADING}
      </p>
      {isOpen ? null : (
        <p className="mt-1 text-sm leading-6 text-slate-300">
          {compactMessagePreview(submittedText)}
        </p>
      )}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={disclosureId}
        onClick={onToggle}
        className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
      >
        <span>{COMPACT_MESSAGE_REOPEN_LABEL}</span>
        <span aria-hidden="true" className="text-lg leading-none">
          {isOpen ? "-" : "+"}
        </span>
      </button>
    </section>
  );
}

function AiExtractedFactsPanel({ extraction }: { extraction: AiExtractionResult }) {
  const [isOpen, setIsOpen] = useState(false);
  const amountItems = extraction.amounts.map((amount) => {
    const value = amount.value === null ? "not found" : `${amount.currency === "GBP" ? "\u00a3" : ""}${amount.value}`;
    return `${amount.label}: ${value} (${amount.frequency})`;
  });
  const dateItems = extraction.dates.map((date) => `${date.label}: ${date.value ?? "not found"}`);
  const deadlineItems = extraction.deadlines.map(
    (date) => `${date.label}: ${date.value ?? "not found"}`,
  );
  const referenceItems = extraction.referenceNumbers.map(
    (reference) => `${reference.label}: ${reference.value}`,
  );
  const evidenceQuotes = extraction.evidenceQuotes
    .slice(0, 6)
    .map((quote) => (quote.length > 180 ? `${quote.slice(0, 177)}...` : quote));

  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold uppercase tracking-wider text-cyan-200">
            Local AI extracted facts
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-300">
            AdminAvenger still uses its own rules to assess these facts.
          </span>
        </span>
        <span className="rounded-full border border-cyan-300/20 px-3 py-1 text-xs font-bold text-cyan-100">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              What AI read
            </h4>
            <div className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
              <p>Document: {extraction.documentType.replaceAll("_", " ")}</p>
              <p>Provider: {extraction.providerName ?? "Not found"}</p>
              <p>Service: {extraction.serviceType?.replaceAll("_", " ") ?? "Not found"}</p>
              <p>Summary: {extraction.summary}</p>
            </div>
          </div>
          <FactList title="Amounts" items={amountItems} />
          <FactList title="Dates" items={dateItems} />
          <FactList title="Deadlines" items={deadlineItems} />
          <FactList title="References" items={referenceItems} />
          <FactList title="Options mentioned" items={extraction.optionsMentioned} />
          <FactList title="Rights confirmed" items={extraction.rightsConfirmed} />
          <FactList title="Rights needing checking" items={extraction.rightsNeedChecking} />
          <FactList title="Missing information" items={extraction.missingInformation} />
          <FactList title="Warnings" items={extraction.warnings} />
          <FactList title="Evidence quotes" items={evidenceQuotes} />
        </div>
      ) : null}
    </section>
  );
}

export function HomeView({
  result,
  analysisStatus,
  analysisError,
  onCheck,
  onSaveCase,
  onSaveRecord,
  onClearResult,
  inboxScanSettings,
  onUpdateInboxScanSettings,
  onIgnoreInboxScanItem,
  onSaveScannedItem,
  onSaveEmailSafetyCase,
}: HomeViewProps) {
  const [rawText, setRawText] = useState("");
  const [inboxScanOpen, setInboxScanOpen] = useState(false);
  const [selectedInput, setSelectedInput] = useState<"paste" | "image" | "file">("paste");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [userQuestion, setUserQuestion] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [photoMetadata, setPhotoMetadata] = useState<PhotoIntakeMetadata | undefined>();
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrText, setOcrText] = useState("");
  const [ocrOriginalText, setOcrOriginalText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>();
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [ocrSectionWarnings, setOcrSectionWarnings] = useState<string[]>([]);
  const [ocrSourceMode, setOcrSourceMode] = useState<"single" | "multi">("single");
  const [reviewedPhotoSources, setReviewedPhotoSources] = useState<SourceDocument[]>([]);
  const [photoCaptureIntent, setPhotoCaptureIntent] = useState<PhotoCaptureIntent>("replace");
  const [inputResetKey, setInputResetKey] = useState(0);
  const [aiSettings, setAiSettings] = useState(loadAiProviderSettings);
  const [aiStatus, setAiStatus] = useState<ServiceStatus>("idle");
  const [aiError, setAiError] = useState("");
  const [aiExtraction, setAiExtraction] = useState<AiExtractionResult | undefined>();
  const [aiFallbackHint, setAiFallbackHint] = useState("");
  const [showDetailed, setShowDetailed] = useState(false);
  const [showEmailSafety, setShowEmailSafety] = useState(false);
  const [showGuidedNextStep, setShowGuidedNextStep] = useState(false);
  const [showPhotoCapturePanel, setShowPhotoCapturePanel] = useState(false);
  // An image chosen from the "Upload a file" area (or the "+" upload menu) is
  // handed to PhotoCapturePanel so it uses the same automatic scan review as
  // an image uploaded via "Take or upload a photo".
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | undefined>();
  const [pendingAttachmentImageIds, setPendingAttachmentImageIds] = useState<string[]>([]);
  const [activeAttachmentImageId, setActiveAttachmentImageId] = useState<string | undefined>();
  const [showExamples, setShowExamples] = useState(false);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
  const [showInboxTools, setShowInboxTools] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isDesktopPointer, setIsDesktopPointer] = useState(false);
  // Front-Door Intent Routing v1, UI wiring slice. This holds the one adaptive
  // confirmation step. It cannot create a case or open a specialist journey:
  // those prohibitions are typed as literal `false` in the view model.
  const [frontDoorRoute, dispatchFrontDoorRoute] = useReducer(
    frontDoorRouteReducer,
    initialFrontDoorRouteState,
  );
  // WCP-005. While a Wales care route is live, the full input surface above it
  // is replaced by a short summary of what was submitted. This flag is the
  // person's explicit override: it only ever changes because they pressed the
  // control, and it is never used to decide anything other than how much of the
  // input surface is drawn.
  const [showOriginalInputSurface, setShowOriginalInputSurface] = useState(false);
  // Document Attachment Intake v1 - files attached beside the paste box
  // (chosen from the device or dropped). Kept as its
  // own small list rather than reusing the single-photo OCR state above, so
  // attaching files never disturbs the existing "Take or upload a photo" /
  // "Upload a file" tabs - it only ever feeds combined text into the same
  // paste/check flow via attachmentCombinedText below.
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDraggingOverAttachment, setIsDraggingOverAttachment] = useState(false);
  const [careFeeFlowActive, setCareFeeFlowActive] = useState(false);
  const [careFeeReviewActive, setCareFeeReviewActive] = useState(false);
  const [careFeeIntakeMessage, setCareFeeIntakeMessage] = useState("");
  const [careFeeConfirmedRequest, setCareFeeConfirmedRequest] =
    useState<ConfirmedCareFeeComparisonRequestV1>();
  const [careFeeComparison, setCareFeeComparison] =
    useState<CareFeeSafeComparisonResultViewModel>();
  const [careFeeComparisonError, setCareFeeComparisonError] = useState("");
  const [careFeeComparisonInProgress, setCareFeeComparisonInProgress] = useState(false);
  const [careFeeConfirmationResetKey, setCareFeeConfirmationResetKey] = useState(0);
  const careFeeControlledEntryEnabled = isControlledFeatureEnabled(import.meta.env);
  const isChecking = analysisStatus === "loading";
  const isAiReading = aiStatus === "loading";
  const isReadingPhoto = ocrStatus === "reading";
  const isReadingAttachments = attachedFiles.some((attached) => attached.status === "reading");
  const isLocalOllamaMode = aiSettings.mode === "local_ollama";
  const hasEditedOcrText = ocrText.trim() !== ocrOriginalText.trim();
  // WCP-005. A Wales care route is live exactly when the orientation page is
  // about a named person's care, which is the state the three preparation panels
  // and the trusted directory hang off. Every other route, including the one
  // question that precedes this, the urgent page, benefits, documents and
  // ordinary messages, keeps the full input surface it has today.
  const careOrientation =
    frontDoorRoute.view?.kind === "orientation" ? frontDoorRoute.view : undefined;
  const walesCarePathActive =
    careOrientation !== undefined &&
    (careOrientation.aboutOneOtherPerson ||
      careOrientation.aboutSupporterWithNamedPerson ||
      careOrientation.aboutBothPeopleWithNamedPerson);
  const compactOriginalInput = walesCarePathActive && !showOriginalInputSurface;
  const originalInputDisclosureId = "home-original-input-surface";
  const isOcrReviewUnreliable =
    ocrStatus === "success" && isOcrResultUnreliable(ocrOriginalText || ocrText, ocrConfidence);
  const canShowOcrKeyDetails =
    ocrStatus === "success" && isOcrKeyDetailsReliable(ocrOriginalText || ocrText, ocrConfidence);
  const shouldHideOcrKeyDetails = !canShowOcrKeyDetails && !hasEditedOcrText;
  // "Key details found" card (see src/lib/ocrKeyDetails.ts) - recomputed from
  // whatever is currently in the editable OCR textarea, so editing the text
  // updates the card too. Purely local regex matching over text already on
  // this device; never runs while ocrStatus isn't "success" for nothing to
  // needlessly recompute while OCR itself is still reading.
  const ocrKeyDetails = useMemo(
    () => (ocrStatus === "success" ? extractOcrKeyDetails(ocrText) : { details: [], warnings: [] }),
    [ocrStatus, ocrText],
  );
  const visibleOcrKeyDetails = useMemo(
    () =>
      getVisibleOcrKeyDetails(ocrKeyDetails.details, {
        isOcrUnreliable: !canShowOcrKeyDetails,
        hasUserEditedText: hasEditedOcrText,
      }),
    [canShowOcrKeyDetails, hasEditedOcrText, ocrKeyDetails.details],
  );
  // Grouped into named sections (Money mentioned, Dates mentioned, etc.) for
  // the card below - a flat list of every detail was hard to scan on mobile.
  const ocrKeyDetailGroups = useMemo(
    () => groupOcrKeyDetails(visibleOcrKeyDetails),
    [visibleOcrKeyDetails],
  );
  // Document Attachment Intake v1 - combined text from every attached file
  // that has finished reading, in attachment order. Purely derived so a
  // failed/removed/re-added file always recomputes correctly; never stored
  // separately from attachedFiles itself.
  const attachmentCombinedText = useMemo(
    () => buildAttachedFilesCombinedText(attachedFiles),
    [attachedFiles],
  );
  const careFeeSourceDocuments = useMemo(
    () => buildSourceDocuments(attachedFiles),
    [attachedFiles],
  );
  useEffect(() => {
    setCareFeeConfirmedRequest(undefined);
    setCareFeeComparison(undefined);
    setCareFeeComparisonError("");
    setCareFeeComparisonInProgress(false);
  }, [careFeeSourceDocuments]);
  const showAttachmentCombinedTextNote =
    rawText.trim().length > 0 && hasReadableAttachedText(attachedFiles);
  // Front-Door Intent Routing v1, UI wiring slice. Everything the front door
  // read the submission from. Comparing this against the snapshot stored with
  // the current route is what makes a stale question impossible: editing the
  // paste box, clearing the input, loading a sample, loading a text file,
  // accepting reviewed photo text, adding or removing an attachment and
  // switching input mode all change one of these three values.
  const currentInputSnapshot = useMemo<FrontDoorInputSnapshot>(
    () => ({
      inputMode: selectedInput,
      rawText,
      attachmentsText: attachmentCombinedText,
    }),
    [attachmentCombinedText, rawText, selectedInput],
  );
  const primaryCase = useMemo(
    () => (result ? selectMostImportantCase(result.cases) : undefined),
    [result],
  );
  const primaryFinding = result?.findings.find((finding) => finding.id === primaryCase?.findingId);
  const primaryOpportunity = primaryCase
    ? deriveOpportunityCard(primaryCase, result?.item, primaryFinding)
    : undefined;
  const benefitsActionPack = primaryCase?.decisionResult
    ? buildBenefitsActionPack(primaryCase.decisionResult, primaryOpportunity, primaryCase)
    : null;
  const strategicNextStepPlan = primaryCase
    ? buildStrategicNextStepPlan({
        decisionResult: primaryCase.decisionResult,
        benefitsActionPack,
        opportunity: primaryOpportunity,
        adminCase: primaryCase,
      })
    : undefined;
  const normalResultViewModel = primaryCase
    ? buildResultViewModel({
        decisionResult: primaryCase.decisionResult,
        benefitsActionPack,
        strategicNextStepPlan,
        opportunity: primaryOpportunity,
        adminCase: primaryCase,
        careerSupportPack: primaryCase.careerSupportPack,
      })
    : undefined;
  const normalAdviserExportPack =
    primaryCase?.decisionResult && normalResultViewModel
      ? buildAdviserExportPack({
          decisionResult: primaryCase.decisionResult,
          resultViewModel: normalResultViewModel,
          benefitsActionPack,
          strategicNextStepPlan,
        })
      : undefined;
  const resultViewModel = normalResultViewModel;
  const adviserExportPack = normalAdviserExportPack;
  const guidedMode =
    primaryCase && primaryOpportunity
      ? getGuidedCaseMode(primaryCase, primaryOpportunity)
      : undefined;
  // Guided Next Step - the single clickable action shown next to "Best next
  // step" (create a draft, add evidence, answer questions, check a
  // deadline). Derived the same way primaryOpportunity is: computed fresh
  // from the case/item/finding, never stored on the case itself.
  const guidedNextStep = useMemo(
    () => (primaryCase ? deriveGuidedNextStep(primaryCase, result?.item, primaryFinding) : undefined),
    [primaryCase, result?.item, primaryFinding],
  );
  const hasClearCase = Boolean(
    primaryCase &&
      (primaryCase.category !== "unknown" ||
        isLowActionDeliveryUpdate(primaryCase) ||
        isNoActionResult(primaryCase)),
  );
  const hideSaveCase =
    primaryOpportunity?.opportunityType === "account_outcome_confirmation" ||
    primaryOpportunity?.opportunityType === "no_action_needed" ||
    primaryOpportunity?.opportunityType === "delivery_update" ||
    primaryOpportunity?.opportunityType === "receipt_guardian" ||
    isAppointmentTask(primaryCase);
  const otherCases = primaryCase
    ? (result?.cases.filter(
        (adminCase) =>
          adminCase.id !== primaryCase.id &&
          !isBroadbandRelatedReminder(primaryCase, adminCase),
      ) ?? [])
    : [];
  const relatedReminders = primaryCase
    ? (result?.cases.filter(
        (adminCase) =>
          adminCase.id !== primaryCase.id && isBroadbandRelatedReminder(primaryCase, adminCase),
      ) ?? [])
    : [];
  const missingEvidence = primaryCase ? getMissingEvidence(primaryCase) : [];
  const broadbandChecks = primaryCase ? getBroadbandChecks(primaryCase) : [];
  const broadbandAssessment = primaryCase?.broadbandPriceRiseAssessment;
  const providerWordingFound =
    broadbandAssessment?.providerWordingFound ?? broadbandAssessment?.rightsConfirmed ?? [];
  const broadbandContractDate =
    broadbandAssessment?.contractDate ?? broadbandAssessment?.contractStartOrRenewalDate;
  const contractTimingLabel = primaryCase ? getContractTimingLabel(primaryCase) : undefined;
  const emailSafetyAssessment = result
    ? assessEmailSafety(`${result.item.title}\n${result.item.rawText}`)
    : undefined;
  const showEmailSafetyButton =
    Boolean(inboxScanSettings.showEmailSafetyCheckButton && emailSafetyAssessment?.isEmailLike);
  const isCareerSupportCase =
    primaryOpportunity?.opportunityType === "career_support" || Boolean(primaryCase?.careerSupportPack);
  const primaryActionLabel =
    primaryOpportunity && guidedMode && primaryCase
      ? isCareerSupportCase
        ? "Save CV review"
        : isAppointmentTask(primaryCase)
          ? "Save this task"
          : getHomePrimaryActionLabel(primaryOpportunity.opportunityType, guidedMode)
      : undefined;
  const isCompletedRefund = Boolean(
    primaryOpportunity?.outcomeConfirmed &&
      (primaryOpportunity.opportunityType === "refund_expected" ||
        primaryOpportunity.opportunityType === "money_back"),
  );
  const simplePrimaryAction: ResultCaseSheetAction | undefined =
    primaryOpportunity && primaryCase && !isCompletedRefund
      ? {
          label: primaryActionLabel ?? "Save this check",
          onClick:
            primaryOpportunity.opportunityType === "suspicious_email_risk" &&
            emailSafetyAssessment?.isEmailLike
              ? () => setShowEmailSafety(true)
              : hideSaveCase || primaryOpportunity.opportunityType === "receipt_guardian"
                ? () => onSaveRecord(primaryCase.id)
                : () => onSaveCase(primaryCase.id),
          emphasis: "primary",
        }
      : undefined;
  const simpleSecondaryActions: ResultCaseSheetAction[] =
    primaryCase && primaryOpportunity
      ? isCareerSupportCase
        ? [
            {
              label: "Mark reviewed",
              onClick: () => onSaveRecord(primaryCase.id),
              emphasis: "quiet" as const,
            },
            {
              label: "Ignore",
              onClick: onClearResult,
              emphasis: "quiet" as const,
            },
          ]
        : [
          ...(showEmailSafetyButton &&
          primaryOpportunity.opportunityType !== "suspicious_email_risk"
            ? [
                {
                  label: "Check email safety",
                  onClick: () => setShowEmailSafety(true),
                  emphasis: "secondary" as const,
                },
              ]
            : []),
          ...(primaryOpportunity.opportunityType === "suspicious_email_risk"
            ? [
                {
                  label: "Save safety record",
                  onClick: () => onSaveRecord(primaryCase.id),
                  emphasis: "quiet" as const,
                },
              ]
            : hideSaveCase || primaryOpportunity.opportunityType === "receipt_guardian"
              ? []
              : [
                  {
                    label: "Save as record",
                    onClick: () => onSaveRecord(primaryCase.id),
                    emphasis: "quiet" as const,
                  },
                ]),
          {
            label: "Ignore",
            onClick: onClearResult,
            emphasis: "quiet" as const,
          },
        ]
      : [];

  const handleDownloadAdviserPack = () => {
    if (!adviserExportPack) {
      return;
    }

    downloadAdviserExportMarkdown(
      renderAdviserExportMarkdown(adviserExportPack),
      getAdviserExportFilename(),
    );
  };

  useEffect(
    () => () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    },
    [imagePreviewUrl],
  );

  useEffect(() => {
    saveAiProviderSettings(aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    setIsDesktopPointer(!isCoarsePointerEnvironment());
  }, []);

  // Front-Door Intent Routing v1, UI wiring slice.
  //
  // A question about wording that has since changed is worse than no question,
  // because the person answers about words that are no longer there. So the
  // route is invalidated the moment the input it was decided from stops
  // matching. This single comparison covers every way the input can change,
  // which is why there is no list of individual handlers to keep in step.
  //
  // Going back does not change the input, so back still returns to the same
  // question about the same words.
  useEffect(() => {
    if (!frontDoorRoute.snapshot) {
      return;
    }

    if (frontDoorInputSnapshotsMatch(frontDoorRoute.snapshot, currentInputSnapshot)) {
      return;
    }

    dispatchFrontDoorRoute({ type: "source_changed" });
  }, [currentInputSnapshot, frontDoorRoute.snapshot]);

  useEffect(() => {
    if (
      showPhotoCapturePanel ||
      activeAttachmentImageId ||
      pendingAttachmentImageIds.length === 0
    ) {
      return;
    }

    const nextAttachmentId = pendingAttachmentImageIds[0];
    const nextAttachment = attachedFiles.find(
      (attached) =>
        attached.id === nextAttachmentId &&
        attached.kind === "image" &&
        attached.status === "waiting",
    );

    if (!nextAttachment) {
      setPendingAttachmentImageIds((current) =>
        current.filter((attachmentId) => attachmentId !== nextAttachmentId),
      );
      return;
    }

    setPendingPhotoFile(nextAttachment.file);
    setActiveAttachmentImageId(nextAttachment.id);
    setPhotoCaptureIntent("attachment");
    setShowPhotoCapturePanel(true);
  }, [activeAttachmentImageId, attachedFiles, pendingAttachmentImageIds, showPhotoCapturePanel]);

  const clearInput = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setRawText("");
    setUploadedFileName("");
    setUploadNote("");
    setInputMessage("");
    setImagePreviewUrl("");
    setPhotoMetadata(undefined);
    setOcrStatus("idle");
    setOcrText("");
    setOcrOriginalText("");
    setOcrProgress(0);
    setOcrError("");
    setOcrConfidence(undefined);
    setOcrWarnings([]);
    setOcrSectionWarnings([]);
    setReviewedPhotoSources([]);
    setAiStatus("idle");
    setAiError("");
    setAiFallbackHint("");
    setAiExtraction(undefined);
    setShowDetailed(false);
    setShowEmailSafety(false);
    setInputResetKey((current) => current + 1);
    setAttachedFiles([]);
    setPendingAttachmentImageIds([]);
    setActiveAttachmentImageId(undefined);
    setPendingPhotoFile(undefined);
    setShowPhotoCapturePanel(false);
    setPhotoCaptureIntent("replace");
    setIsDraggingOverAttachment(false);
    onClearResult();
  };

  const loadSample = (sample: (typeof sampleInputs)[number]) => {
    setSelectedInput("paste");
    setRawText(sample.rawText);
    setUploadedFileName("");
    setUploadNote("");
    setInputMessage("");
    setPhotoMetadata(undefined);
    setOcrStatus("idle");
    setOcrText("");
    setOcrOriginalText("");
    setOcrProgress(0);
    setOcrError("");
    setOcrConfidence(undefined);
    setOcrWarnings([]);
    setOcrSectionWarnings([]);
    setReviewedPhotoSources([]);
    setAiError("");
    setAiFallbackHint("");
    setAiExtraction(undefined);
    setShowEmailSafety(false);
    setAttachedFiles([]);
    setPendingAttachmentImageIds([]);
    setActiveAttachmentImageId(undefined);
    setPendingPhotoFile(undefined);
    setShowPhotoCapturePanel(false);
    setPhotoCaptureIntent("replace");
    setIsDraggingOverAttachment(false);
    onClearResult();
  };

  const updateAiMode = (mode: AiMode) => {
    setAiSettings((current) => ({ ...current, mode }));
    setAiError("");
    setInputMessage("");
  };

  // Local extraction. It runs only after a submission has been decided to be a
  // document, never as a way around that decision.
  const runOllamaExtraction = async (source: FrontDoorSubmissionSource) => {
    const { acceptedText: textToExtract, sourceTitle, sourceType } = source;
    setAiStatus("loading");
    setAiError("");
    setAiFallbackHint("");
    setAiExtraction(undefined);
    setInputMessage("Reading this with local AI...");

    try {
      const extraction = await extractAdminFactsWithOllama({
        text: textToExtract,
        ollamaUrl: aiSettings.ollamaUrl,
        model: aiSettings.ollamaModel,
      });
      const reconstructedText = buildAdminTextFromAiExtraction(extraction, textToExtract);

      setAiExtraction(extraction);
      setAiStatus("success");
      setAiFallbackHint("");
      setInputMessage("Local AI extracted facts. AdminAvenger is checking them with its own rules.");
      setShowDetailed(false);
      setShowEmailSafety(false);

      const checked = await submitAcceptedText({
        sourceTitle: sourceTitle === "Pasted admin text"
          ? "Local AI extracted admin facts"
          : `Local AI extracted admin facts from ${sourceTitle}`,
        sourceType,
        acceptedText: reconstructedText,
        userQuestion,
        sourceDocuments: source.sourceDocuments,
        onCheck,
      });

      if (!checked) {
        setAiExtraction(undefined);
      }
    } catch (error) {
      const message =
        error instanceof OllamaExtractionError || error instanceof Error
          ? error.message
          : "Local AI extraction failed. AdminAvenger used local rules instead.";
      const couldNotReach = error instanceof OllamaExtractionError && error.code === "not_running";

      // Show the fallback notice once, via inputMessage only (do not also set aiError).
      setAiStatus("error");
      setAiError("");
      setInputMessage(message);
      setAiFallbackHint(
        couldNotReach ? `Check Ollama is running at ${aiSettings.ollamaUrl}.` : "",
      );
      setShowDetailed(false);
      setShowEmailSafety(false);

      await submitAcceptedText({
        sourceTitle,
        sourceType,
        acceptedText: textToExtract,
        userQuestion,
        sourceDocuments: source.sourceDocuments,
        onCheck,
      });
    }
  };

  const runOrdinaryMessageCheck = async (source: FrontDoorSubmissionSource) => {
    setInputMessage("");
    setAiError("");
    setAiFallbackHint("");
    const checked = await submitAcceptedText({
      sourceTitle: source.sourceTitle,
      sourceType: source.sourceType,
      acceptedText: source.acceptedText,
      userQuestion,
      sourceDocuments: source.sourceDocuments,
      onCheck,
    });

    if (!checked) {
      setAiExtraction(undefined);
    }
  };

  // Front-Door Intent Routing v1, UI wiring slice.
  //
  // The one submission path. Pasted text, pasted text combined with
  // attachments, reviewed photo text, a loaded text file and the "check this as
  // a message" exit all arrive here, so no handler carries a routing rule of
  // its own and no setting can skip the decision.
  //
  // The order below is the approved order and is deliberately not reorderable
  // by a caller: decide first, then act. Local extraction sits inside the
  // document branch, after the decision, exactly where ordinary analysis sits.
  const submitFrontDoorSource = async (
    source: FrontDoorSubmissionSource,
    snapshot: FrontDoorInputSnapshot,
    options: { readonly skipFrontDoor?: boolean } = {},
  ) => {
    const decision = options.skipFrontDoor
      ? ordinaryDocumentSubmission(source)
      : decideFrontDoorSubmission(source);

    if (decision.kind === "front_door_route") {
      dispatchFrontDoorRoute({
        type: "input_received",
        text: source.acceptedText,
        sourceTitle: source.sourceTitle,
        sourceType: source.sourceType,
        sourceDocuments: source.sourceDocuments,
        snapshot,
      });
      setInputMessage("");
      setAiError("");
      setAiFallbackHint("");
      return;
    }

    if (isLocalOllamaMode) {
      await runOllamaExtraction(decision.source);
      return;
    }

    await runOrdinaryMessageCheck(decision.source);
  };

  // "Just check this as a message" keeps the original accepted text, source
  // title and source type. Relabelling every route as pasted text here would
  // rename a photo or an attached document on its way to analysis.
  const handleFrontDoorCheckAsMessage = async () => {
    const source = frontDoorRoute.source;
    const snapshot = frontDoorRoute.snapshot ?? currentInputSnapshot;
    dispatchFrontDoorRoute({ type: "ordinary_check_requested" });

    if (!source || source.acceptedText.trim().length === 0) {
      return;
    }

    await submitFrontDoorSource(source, snapshot, { skipFrontDoor: true });
  };

  const handleCheck = async () => {
    setAiExtraction(undefined);
    setShowDetailed(false);
    setShowEmailSafety(false);
    dispatchFrontDoorRoute({ type: "dismissed" });
    onClearResult();

    if (selectedInput === "image" && rawText.trim().length === 0) {
      setInputMessage(
        ocrText.trim()
          ? "Use the extracted photo text first, then AdminAvenger can check it."
          : "AdminAvenger could not read enough text from this photo. Try a clearer photo, better lighting, or paste the text manually.",
      );
      return;
    }

    // Document Attachment Intake v1 - under the paste tab, whatever was
    // typed and whatever attached files have finished reading are combined
    // into one string here, then checked through the exact same "Check a
    // message" pipeline as plain pasted text. Other tabs are unaffected.
    const textToCheck =
      selectedInput === "paste"
        ? combineTypedTextWithAttachments(rawText, attachmentCombinedText)
        : rawText.trim();
    const checkSourceTitle =
      selectedInput === "paste"
        ? buildCheckSourceTitle(rawText, attachedFiles)
        : "Pasted admin text";

    if (textToCheck.length === 0) {
      setInputMessage(
        selectedInput === "paste"
          ? "Paste some text, or attach a document photo, to check this now."
          : "Choose a text file or photo above, or paste the text from the document to check it now.",
      );
      return;
    }

    if (isChecking || isAiReading || isReadingPhoto || isReadingAttachments) {
      return;
    }

    const attachmentSources =
      selectedInput === "paste" ? buildSourceDocuments(attachedFiles) : [];
    const directTextSource =
      selectedInput === "paste" && rawText.trim().length > 0
        ? createTextSourceDocument({
            id: createSourceDocumentId("pasted-text"),
            displayName: "Pasted admin text",
            intakeType: "pasted_text",
            extractionMethod: "user_text",
            order: 1,
            text: rawText.trim(),
          })
        : selectedInput === "file" && rawText.trim().length > 0
          ? createTextSourceDocument({
              id: createSourceDocumentId("uploaded-text"),
              displayName: uploadedFileName || "Uploaded text file",
              intakeType: "text_file",
              extractionMethod: "browser_text",
              order: 1,
              text: rawText.trim(),
            })
          : undefined;
    const sourceDocuments = directTextSource
      ? [
          directTextSource,
          ...attachmentSources.map((source) => ({ ...source, order: source.order + 1 })),
        ]
      : attachmentSources;

    await submitFrontDoorSource(
      {
        acceptedText: textToCheck,
        sourceTitle: checkSourceTitle,
        sourceType: "email",
        sourceDocuments: sourceDocuments.length > 0 ? sourceDocuments : undefined,
      },
      currentInputSnapshot,
    );
  };

  type PhotoOcrReadResult = {
    label?: string;
    text: string;
    confidence?: number;
    warnings: string[];
    metadata?: PhotoIntakeMetadata;
  };

  const readPhotoForOcr = async (
    photo: { file: File; label?: string; warnings?: string[] },
    index: number,
    total: number,
  ): Promise<PhotoOcrReadResult> => {
    const [dimensions, documentQuality] = await Promise.all([
      getImageDimensions(photo.file),
      assessDocumentImageQuality(photo.file),
    ]);
    const baseMetadata = createPhotoIntakeMetadata(photo.file);
    const metadata = dimensions ? { ...baseMetadata, ...dimensions } : baseMetadata;
    const baseImageQualityWarnings = getImageQualityWarnings({
      fileSize: photo.file.size,
      ...dimensions,
    });

    const result = await readTextFromImage(photo.file, (progress) => {
      setOcrProgress((index + progress.progress) / total);
    });

    const imageQualityWarnings = Array.from(
      new Set([
        ...baseImageQualityWarnings,
        ...getVisibleDocumentQualityWarningMessagesAfterOcr(
          documentQuality,
          result.confidence,
        ),
      ]),
    );

    return {
      label: photo.label,
      text: result.text,
      confidence: result.confidence,
      metadata,
      warnings: Array.from(new Set([...(photo.warnings ?? []), ...imageQualityWarnings, ...result.warnings])),
    };
  };

  const resetPhotoOcrReview = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl("");
    }

    setUploadedFileName("");
    setInputMessage("");
    setAiExtraction(undefined);
    setPhotoMetadata(undefined);
    setOcrStatus("idle");
    setOcrText("");
    setOcrOriginalText("");
    setOcrProgress(0);
    setOcrError("");
    setOcrConfidence(undefined);
    setOcrWarnings([]);
    setOcrSectionWarnings([]);
    setOcrSourceMode("single");
    setReviewedPhotoSources([]);
    setUploadNote("");
  };

  const getLowestOcrConfidence = (values: Array<number | undefined>) => {
    const numericValues = values.filter((value): value is number => typeof value === "number");
    return numericValues.length > 0 ? Math.min(...numericValues) : undefined;
  };

  const finishAttachmentImageReview = (attachmentId: string) => {
    setPendingAttachmentImageIds((current) =>
      current.filter((queuedAttachmentId) => queuedAttachmentId !== attachmentId),
    );
    setActiveAttachmentImageId(undefined);
    setPendingPhotoFile(undefined);
    setShowPhotoCapturePanel(false);
    setPhotoCaptureIntent("replace");
  };

  const handleRejectAttachmentImageReview = () => {
    const attachmentId = activeAttachmentImageId;

    if (!attachmentId) {
      setShowPhotoCapturePanel(false);
      setPendingPhotoFile(undefined);
      setPhotoCaptureIntent("replace");
      return;
    }

    finishAttachmentImageReview(attachmentId);
  };

  const handleCancelAttachmentImageReviewQueue = () => {
    setPendingAttachmentImageIds([]);
    setActiveAttachmentImageId(undefined);
    setPendingPhotoFile(undefined);
    setPhotoCaptureIntent("replace");
  };

  const handleCapturedPhotos = async (photos: CapturedPhotoForOcr[]) => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl("");
    }

    setShowAddMenu(false);
    setSelectedInput("image");
    setInputMessage("");
    setAiExtraction(undefined);
    setPhotoMetadata(undefined);
    setOcrStatus("idle");
    setOcrProgress(0);
    setOcrError("");

    const isAppend = photoCaptureIntent === "append" && ocrText.trim().length > 0;

    if (!isAppend) {
      setOcrText("");
      setOcrOriginalText("");
      setOcrConfidence(undefined);
      setOcrWarnings([]);
      setOcrSectionWarnings([]);
      setReviewedPhotoSources([]);
    }

    const oversizedPhoto = photos.find((photo) => !isFileWithinSizeLimit(photo.file));

    if (oversizedPhoto) {
      const message = getFileTooLargeMessage(oversizedPhoto.file);
      setUploadedFileName(oversizedPhoto.file.name);
      setUploadNote(message);
      setOcrStatus("error");
      setOcrError(message);
      setPhotoCaptureIntent("replace");
      return;
    }

    const usablePhotos = photos.filter((photo) => isSupportedPhotoFile(photo.file));

    if (usablePhotos.length === 0) {
      setUploadedFileName("");
      setUploadNote(
        "This image type may not be readable here. Try JPG, PNG, WEBP, or paste the text manually.",
      );
      setOcrStatus("error");
      setOcrError("AdminAvenger could not read this photo type in the browser.");
      setPhotoCaptureIntent("replace");
      return;
    }

    // Simple file names ("camera-photo.jpg", "extra-photo.jpg", or an
    // upload's own name) - never numbered "Photo 1: ..." style labels.
    const fileNameSummary = usablePhotos.map((photo) => photo.file.name).join(", ");
    setUploadedFileName(
      isAppend && uploadedFileName ? `${uploadedFileName}, ${fileNameSummary}` : fileNameSummary,
    );
    setImagePreviewUrl(URL.createObjectURL(usablePhotos[0].file));
    setUploadNote(
      usablePhotos.length > 1
        ? "Photo sections stay in this browser in this version. The photos are not stored in this prototype - keep the original photos somewhere safe."
        : "Photo stays in this browser in this version. The full photo is not stored in this prototype - keep the original photo somewhere safe.",
    );
    setOcrSourceMode(usablePhotos.length > 1 || isAppend ? "multi" : "single");
    setOcrStatus("reading");

    try {
      const results: PhotoOcrReadResult[] = [];

      for (let index = 0; index < usablePhotos.length; index += 1) {
        const photo = usablePhotos[index];
        // Sequential OCR keeps the combined text in the order the photos
        // were added: main photo first, then any optional extra photos.
        // eslint-disable-next-line no-await-in-loop
        const result = await readPhotoForOcr(photo, index, usablePhotos.length);
        results.push(result);
      }

      // Default one-photo flow: the text is used as-is, unlabelled. Only
      // when an optional close-up photo is appended does the combined text
      // gain the simple "--- Main photo ---" / "--- Close-up photo ---"
      // sections.
      const combinedText = results.reduce(
        (textSoFar, result) =>
          textSoFar.trim().length > 0
            ? appendExtraPhotoText(textSoFar, result.text)
            : result.text,
        isAppend ? ocrText : "",
      );
      const labelledWarnings =
        results.length > 1 || isAppend
          ? results.flatMap((result) =>
              result.warnings.map((warning) =>
                formatOcrSectionWarning(result.label ?? OCR_EXTRA_PHOTO_LABEL, warning),
              ),
            )
          : [];
      const allWarnings =
        results.length > 1 || isAppend
          ? Array.from(new Set([...(isAppend ? ocrWarnings : []), ...labelledWarnings]))
          : results[0]?.warnings ?? [];
      const firstSourceOrder = isAppend ? reviewedPhotoSources.length + 1 : 1;
      const newPhotoSources = results.map((result, index) => {
        const photo = usablePhotos[index];
        const sourceId = createSourceDocumentId("reviewed-photo");
        return createPhotoSourceDocument({
          id: sourceId,
          displayName: photo.sourceFileName ?? photo.file.name,
          intakeType: photo.origin === "camera" ? "camera_photo" : "photo",
          order: firstSourceOrder + index,
          text: result.text,
          confidence: result.confidence,
          warnings: result.warnings,
          reviewState: isOcrResultUnreliable(result.text, result.confidence)
            ? "review_required"
            : "confirmed",
        });
      });

      setPhotoMetadata(results[0]?.metadata);
      setOcrConfidence(
        getLowestOcrConfidence([
          ...(isAppend ? [ocrConfidence] : []),
          ...results.map((result) => result.confidence),
        ]),
      );
      setOcrWarnings(allWarnings);
      setOcrSectionWarnings(labelledWarnings);
      setOcrProgress(1);
      setOcrText(combinedText);
      setOcrOriginalText(combinedText);
      setReviewedPhotoSources((current) =>
        isAppend ? [...current, ...newPhotoSources] : newPhotoSources,
      );
      setOcrStatus("success");
      setPhotoCaptureIntent("replace");
    } catch (error) {
      setOcrStatus("error");
      setOcrError(error instanceof OcrReadError ? error.message : OCR_FAILED_MESSAGE);
      setPhotoCaptureIntent("replace");
    }
  };

  const handleConfirmedAttachmentPhotos = async (photos: CapturedPhotoForOcr[]) => {
    const attachmentId = activeAttachmentImageId;
    const reviewedPhoto = photos[0];

    if (!attachmentId) {
      return;
    }

    if (!reviewedPhoto?.isDocumentScan) {
      setAttachedFiles((current) =>
        current.map((item) =>
          item.id === attachmentId
            ? { ...item, status: "failed", errorMessage: ATTACHMENT_READ_FAILED_MESSAGE }
            : item,
        ),
      );
      finishAttachmentImageReview(attachmentId);
      return;
    }

    setAttachedFiles((current) =>
      current.map((item) =>
        item.id === attachmentId
          ? { ...item, status: "reading", errorMessage: undefined, warnings: [] }
          : item,
      ),
    );

    try {
      const result = await readPhotoForOcr(reviewedPhoto, 0, 1);

      setAttachedFiles((current) =>
        current.map((item) =>
          item.id === attachmentId
            ? {
                ...item,
                status: "read",
                extractedText: result.text,
                confidence: result.confidence,
                warnings: result.warnings,
              }
            : item,
        ),
      );
    } catch {
      setAttachedFiles((current) =>
        current.map((item) =>
          item.id === attachmentId
            ? { ...item, status: "failed", errorMessage: ATTACHMENT_READ_FAILED_MESSAGE }
            : item,
        ),
      );
    } finally {
      finishAttachmentImageReview(attachmentId);
    }
  };

  // "Check this text" - uses the reviewed/edited OCR text (never the raw
  // untouched OCR output) and feeds it straight into the same Check a
  // message flow every other input path uses. Never auto-saves or uploads
  // the photo, and never contacts anyone or counts money automatically -
  // it only runs the existing local decision-engine check.
  const handleCheckOcrText = async (reviewedText = ocrText) => {
    const cleanedText = reviewedText.trim();

    if (!cleanedText || isChecking || isAiReading || isReadingPhoto) {
      return;
    }

    setOcrText(cleanedText);
    setRawText(cleanedText);
    setSelectedInput("paste");
    setAiExtraction(undefined);
    setShowDetailed(false);
    setShowEmailSafety(false);
    setInputMessage("");
    setAiError("");
    setAiFallbackHint("");
    onClearResult();

    const originalWasEdited = cleanedText !== ocrOriginalText.trim();
    let acceptedPhotoSources = reviewedPhotoSources;

    if (reviewedPhotoSources.length === 1) {
      acceptedPhotoSources = reviewedPhotoSources.map((source) => ({
        ...source,
        extractedText: cleanedText,
        segments: source.segments.map((segment) => ({ ...segment, text: cleanedText })),
      }));
    } else if (reviewedPhotoSources.length > 1 && originalWasEdited) {
      const reviewWarning =
        "The combined reviewed text was edited; check each photo before relying on its original OCR text.";
      acceptedPhotoSources = [
        ...reviewedPhotoSources.map((source) => ({
          ...source,
          warnings: Array.from(new Set([...source.warnings, reviewWarning])),
          reviewState: "review_required" as const,
        })),
        createTextSourceDocument({
          id: createSourceDocumentId("reviewed-photo-text"),
          displayName: "Reviewed photo text",
          intakeType: "pasted_text",
          extractionMethod: "user_text",
          order: reviewedPhotoSources.length + 1,
          text: cleanedText,
        }),
      ];
    }

    // Reviewed photo text is a submission like any other. It used to go
    // straight to analysis or straight to local extraction, which meant a
    // sentence a person had typed over the top of unreadable photo text could
    // never reach the front door at all.
    await submitFrontDoorSource(
      {
        acceptedText: cleanedText,
        sourceTitle: "Photo text (reviewed before checking)",
        sourceType: "email",
        sourceDocuments:
          acceptedPhotoSources.length > 0 ? acceptedPhotoSources : undefined,
      },
      {
        inputMode: "paste",
        rawText: cleanedText,
        attachmentsText: attachmentCombinedText,
      },
    );
  };

  // "Retake photo" - resets the current photo/OCR state and reopens the
  // same "Take or upload a photo" panel used to get here, rather than
  // introducing a second way to pick a photo.
  const handleRetakePhoto = () => {
    resetPhotoOcrReview();
    setPendingPhotoFile(undefined);
    setPhotoCaptureIntent("replace");
    setShowPhotoCapturePanel(true);
  };

  // "Add close-up photo" - the optional follow-up after OCR review. Keeps
  // the current text and appends the extra photo's text as a
  // "--- Close-up photo ---" section (see appendExtraPhotoText in photoOcr.ts).
  const handleAddCloseUpPhoto = () => {
    setPendingPhotoFile(undefined);
    setPhotoCaptureIntent("append");
    setShowPhotoCapturePanel(true);
  };

  const handleUploadClearerPhoto = (file: File) => {
    resetPhotoOcrReview();
    setPendingPhotoFile(file);
    setPhotoCaptureIntent("replace");
    setShowPhotoCapturePanel(true);
  };

  // "Cancel" - backs out of the photo/OCR review without picking a new
  // photo. Reuses the same reset path as clearing/removing a photo.
  const handleCancelOcrReview = () => {
    resetPhotoOcrReview();
  };

  const handlePhotoEditManually = () => {
    if (photoCaptureIntent === "attachment") {
      handleCancelAttachmentImageReviewQueue();
    }

    setShowPhotoCapturePanel(false);
    setPendingPhotoFile(undefined);
    setPhotoCaptureIntent("replace");
    setSelectedInput("paste");
  };

  const handleFileUpload = async (file?: File) => {
    setUploadedFileName(file?.name ?? "");
    setInputMessage("");

    if (!file) {
      setUploadNote("");
      return;
    }

    if (!isFileWithinSizeLimit(file)) {
      setUploadNote(getFileTooLargeMessage(file));
      return;
    }

    if (!isSupportedTextFile(file)) {
      setUploadNote(UNSUPPORTED_FILE_MESSAGE);
      return;
    }

    try {
      const text = await file.text();
      setRawText(text);
      setUploadNote("Text loaded. You can review or edit before checking.");
    } catch {
      setUploadNote("This text file could not be read in the browser. Try copy/pasting the text instead.");
    }
  };

  const handleOpenPhotoCapturePanel = () => {
    setShowAddMenu(false);
    setPendingPhotoFile(undefined);
    setPhotoCaptureIntent("replace");
    setShowPhotoCapturePanel(true);
  };

  // Reuses the exact same save-flow decision the existing primary/secondary
  // Save buttons already make (record vs. case, per opportunity type) -
  // this never introduces a second, different way of saving a case.
  const handleSaveToCaseFromGuidedPanel = (draft?: GuidedDraftToSave) => {
    if (!primaryCase) {
      return;
    }

    if (
      hideSaveCase ||
      primaryOpportunity?.opportunityType === "receipt_guardian" ||
      primaryOpportunity?.opportunityType === "suspicious_email_risk"
    ) {
      onSaveRecord(primaryCase.id);
    } else {
      onSaveCase(primaryCase.id, draft);
    }

    setShowGuidedNextStep(false);
  };

  // Routes any file chosen from an upload control (the "Upload a file" area
  // and the compact "+" upload menu) to the right place. An image goes
  // through the same photo OCR flow as "Take or upload a photo", opening the
  // panel on the automatic scan review step - so an image is never shown an
  // unsupported or "not active in this mode" message. Text files use the
  // existing text reader; anything else falls through to the "not supported
  // yet" message inside handleFileUpload.
  const handleUploadedFileSelection = async (file?: File) => {
    setShowAddMenu(false);

    if (!file) {
      await handleFileUpload(undefined);
      return;
    }

    if (!isFileWithinSizeLimit(file)) {
      setUploadedFileName(file.name);
      setUploadNote(getFileTooLargeMessage(file));
      return;
    }

    const route = classifyUploadedFile(file);

    if (route === "photo_ocr") {
      setUploadNote("");
      setInputMessage("");
      setUploadedFileName("");
      setPendingPhotoFile(file);
      setPhotoCaptureIntent("replace");
      setShowPhotoCapturePanel(true);
      return;
    }

    if (route === "docx_extract" || route === "pdf_extract") {
      // Document File Support v1 - a DOCX/PDF chosen from the compact "+"
      // menu or the "Upload a file" tab is read through the exact same local
      // attachment pipeline as the "Attach document photos" area below
      // (handleAttachmentFilesSelected), never a second, parallel reader for
      // the same file types. Switching to the paste tab is what makes the
      // attached file (and its Reading/Read/Failed status) visible.
      setUploadNote("");
      setInputMessage("");
      setUploadedFileName("");
      setSelectedInput("paste");
      await handleAttachmentFilesSelected([file]);
      return;
    }

    setSelectedInput("file");
    await handleFileUpload(file);
  };

  // Document Attachment Intake v1 (+ Document File Support v1) - adds newly
  // chosen/dropped files to the attachment list, then reads each one in the
  // order they were attached: images are queued through the same browser-local
  // PhotoCapturePanel scan confirmation path as every other photo, text files
  // through the browser's own File.text(), and
  // DOCX/PDF files through the local extractors in
  // src/lib/documentFileText.ts. A read failure on one file only marks that
  // file as failed - it never stops the other files from being read, and
  // never crashes the check flow. Nothing here uploads a file anywhere;
  // every read happens in this browser tab.
  const handleAttachmentFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) {
      return;
    }

    const remainingCareFeeSlots = Math.max(0, 3 - attachedFiles.length);
    const acceptedFiles = careFeeFlowActive
      ? newFiles.slice(0, remainingCareFeeSlots)
      : newFiles;

    if (careFeeFlowActive && acceptedFiles.length < newFiles.length) {
      setCareFeeIntakeMessage("This controlled journey accepts up to three records.");
    } else if (careFeeFlowActive) {
      setCareFeeIntakeMessage("");
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    const newEntries = acceptedFiles.map((file) => createAttachedFile(file));
    setAttachedFiles((current) => [...current, ...newEntries]);
    const queuedImageIds = newEntries
      .filter((entry) => entry.kind === "image" && entry.status === "waiting")
      .map((entry) => entry.id);

    if (queuedImageIds.length > 0) {
      setPendingAttachmentImageIds((current) => [...current, ...queuedImageIds]);
    }

    for (const entry of newEntries) {
      if (entry.status === "failed" || entry.kind === "image") {
        continue;
      }

      setAttachedFiles((current) =>
        current.map((item) => (item.id === entry.id ? { ...item, status: "reading" } : item)),
      );

      try {
        if (entry.kind === "docx" || entry.kind === "pdf") {
          // Document File Support v1 - DOCX/PDF are read locally with
          // mammoth/pdfjs-dist (see src/lib/documentFileText.ts), never
          // uploaded anywhere. A "no selectable text" result (a scanned PDF,
          // or an empty DOCX) is not a crash - it is shown as its own
          // "failed" row with an honest, specific message, and never blocks
          // the other attached files from being read and combined.
          // eslint-disable-next-line no-await-in-loop
          const result =
            entry.kind === "docx" ? await extractDocxText(entry.file) : await extractPdfText(entry.file);

          if (result.status === "success") {
            setAttachedFiles((current) =>
              current.map((item) =>
                item.id === entry.id
                  ? {
                      ...item,
                      status: "read",
                      extractedText: result.text,
                      warnings: result.warnings,
                      segments: buildDocumentFileSegments(entry.id, result.segments),
                    }
                  : item,
              ),
            );
          } else {
            setAttachedFiles((current) =>
              current.map((item) =>
                item.id === entry.id
                  ? { ...item, status: "failed", errorMessage: result.message }
                  : item,
              ),
            );
          }
        } else {
          // eslint-disable-next-line no-await-in-loop
          const text = await entry.file.text();

          setAttachedFiles((current) =>
            current.map((item) =>
              item.id === entry.id ? { ...item, status: "read", extractedText: text } : item,
            ),
          );
        }
      } catch {
        setAttachedFiles((current) =>
          current.map((item) =>
            item.id === entry.id
              ? { ...item, status: "failed", errorMessage: ATTACHMENT_READ_FAILED_MESSAGE }
              : item,
          ),
        );
      }
    }
  };

  const handleRemoveAttachedFile = (id: string) => {
    setCareFeeIntakeMessage("");
    setPendingAttachmentImageIds((current) =>
      current.filter((attachmentId) => attachmentId !== id),
    );
    if (activeAttachmentImageId === id) {
      setActiveAttachmentImageId(undefined);
      setPendingPhotoFile(undefined);
      setShowPhotoCapturePanel(false);
      setPhotoCaptureIntent("replace");
    }
    setAttachedFiles((current) => current.filter((item) => item.id !== id));
  };

  const handleAttachmentDragOver = () => setIsDraggingOverAttachment(true);

  const handleAttachmentDragLeave = () => setIsDraggingOverAttachment(false);

  // preventDefault on drop (and dragover, in DocumentAttachmentArea) stops
  // the browser's default behaviour of navigating to/opening the dropped
  // file as a new page - the file is only ever handed to the same local
  // attachment pipeline as a chosen/captured file.
  const handleAttachmentDrop = (event: DragEvent<HTMLDivElement>) => {
    setIsDraggingOverAttachment(false);
    const droppedFiles = getFilesFromDroppedDataTransfer(event.dataTransfer);
    void handleAttachmentFilesSelected(droppedFiles);
  };

  const invalidateCareFeeComparison = () => {
    setCareFeeConfirmedRequest(undefined);
    setCareFeeComparison(undefined);
    setCareFeeComparisonError("");
    setCareFeeComparisonInProgress(false);
  };

  const handleCareFeeReady = (request: ConfirmedCareFeeComparisonRequestV1) => {
    setCareFeeConfirmedRequest(request);
    setCareFeeComparison(undefined);
    setCareFeeComparisonError("");
  };

  const handleCompareCareFeeRecords = () => {
    setCareFeeComparison(undefined);
    setCareFeeComparisonError("");
    if (!careFeeConfirmedRequest) {
      setCareFeeComparisonError(
        "These records changed or could not be verified. Review and confirm them again.",
      );
      return;
    }

    setCareFeeComparisonInProgress(true);
    const outcome = runCareFeeSafeComparison(
      careFeeConfirmedRequest,
      careFeeSourceDocuments,
    );
    setCareFeeComparisonInProgress(false);
    if (outcome.status === "failed") {
      setCareFeeComparisonError(outcome.message);
      return;
    }

    setCareFeeComparison(outcome.model);
  };

  const handleChangeCareFeeRecords = () => {
    invalidateCareFeeComparison();
    setCareFeeConfirmationResetKey((current) => current + 1);
  };

  const handleBackToCareFeeDocuments = () => {
    invalidateCareFeeComparison();
    setCareFeeReviewActive(false);
    setCareFeeConfirmationResetKey((current) => current + 1);
  };

  const handleStartOverCareFee = () => {
    invalidateCareFeeComparison();
    setCareFeeReviewActive(false);
    setCareFeeIntakeMessage("");
    setAttachedFiles([]);
    setPendingAttachmentImageIds([]);
    setActiveAttachmentImageId(undefined);
    setPendingPhotoFile(undefined);
    setShowPhotoCapturePanel(false);
    setPhotoCaptureIntent("replace");
    setCareFeeConfirmationResetKey((current) => current + 1);
  };

  const handleExitCareFee = () => {
    invalidateCareFeeComparison();
    setCareFeeReviewActive(false);
    setCareFeeFlowActive(false);
    setCareFeeIntakeMessage("");
    setCareFeeConfirmationResetKey((current) => current + 1);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="mx-auto flex max-w-2xl flex-col items-center space-y-3 pt-1 text-center sm:pt-4">
        <div className="flex items-center gap-3">
          <img
            src="/icons/icon-192.png"
            alt="AdminAvenger"
            width={48}
            height={48}
            className="h-11 w-11 flex-none rounded-xl shadow-lg shadow-slate-950/40 ring-1 ring-white/10 sm:h-12 sm:w-12"
          />
          <p className="text-base font-black tracking-tight text-white sm:text-lg">
            AdminAvenger
          </p>
        </div>
        <p className="text-sm font-semibold text-emerald-300">
          Your AI fights the boring battles for you.
        </p>
        <p className="text-xs text-slate-400 sm:text-sm">
          AI remembers. AI explains. Humans decide.
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-5xl">
          Paste a bill, email, letter, or message.
        </h2>
        <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
          AdminAvenger explains it in plain English, tells you what to have ready, and prepares the
          next step. You stay in control.
        </p>
      </header>

      {careFeeControlledEntryEnabled &&
      !careFeeFlowActive &&
      !frontDoorRoute.view &&
      !walesCarePathActive &&
      !result ? (
        <section className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-4 sm:p-5">
          <p className="text-sm leading-6 text-cyan-50/90">
            Controlled testing is available for preparing two local care-fee records.
          </p>
          <button
            type="button"
            onClick={() => {
              dispatchFrontDoorRoute({ type: "dismissed" });
              setInputMessage("");
              setCareFeeIntakeMessage("");
              setCareFeeReviewActive(false);
              invalidateCareFeeComparison();
              setCareFeeFlowActive(true);
            }}
            className="mt-3 min-h-11 rounded-lg border border-cyan-200/30 bg-slate-950 px-4 py-3 text-sm font-bold text-cyan-50 transition hover:border-cyan-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            Compare care-fee records
          </button>
        </section>
      ) : null}

      {walesCarePathActive && careOrientation ? (
        <CompactSubmittedMessage
          submittedText={careOrientation.originalInput}
          isOpen={showOriginalInputSurface}
          onToggle={() => setShowOriginalInputSurface((current) => !current)}
          disclosureId={originalInputDisclosureId}
        />
      ) : null}

      {careFeeFlowActive ? (
        <section aria-labelledby="care-fee-intake-heading" className="min-w-0 space-y-5">
          <div className="rounded-lg border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                  Controlled local journey
                </p>
                <h2 id="care-fee-intake-heading" className="mt-2 text-2xl font-bold text-white">
                  Prepare care-fee records
                </h2>
              </div>
              <button
                type="button"
                onClick={handleExitCareFee}
                className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Exit care-fee preparation
              </button>
            </div>
            {!careFeeReviewActive ? (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Attach up to three local records. They stay in this browser and are not saved by this journey.
                </p>
                <DocumentAttachmentArea
                  files={attachedFiles}
                  isDraggingOver={isDraggingOverAttachment}
                  disabled={
                    isChecking ||
                    isAiReading ||
                    isReadingPhoto ||
                    isReadingAttachments ||
                    attachedFiles.length >= 3
                  }
                  showCombinedTextNote={false}
                  onFilesSelected={(files) => void handleAttachmentFilesSelected(files)}
                  onRemoveFile={handleRemoveAttachedFile}
                  onDragOver={handleAttachmentDragOver}
                  onDragLeave={handleAttachmentDragLeave}
                  onDrop={handleAttachmentDrop}
                />
                {careFeeIntakeMessage ? (
                  <p role="status" aria-live="polite" className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-50">
                    {careFeeIntakeMessage}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setCareFeeReviewActive(true)}
                  disabled={attachedFiles.length === 0 || isReadingAttachments}
                  className="mt-5 min-h-11 w-full rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Review record candidates
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleBackToCareFeeDocuments}
                className="mt-4 min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Change attached records
              </button>
            )}
          </div>
          {careFeeReviewActive ? (
            <CareFeeClaimConfirmationPanel
              key={careFeeConfirmationResetKey}
              sourceDocuments={careFeeSourceDocuments}
              showExit={false}
              onExit={handleBackToCareFeeDocuments}
              onReady={handleCareFeeReady}
              onInvalidated={invalidateCareFeeComparison}
            />
          ) : null}
          {careFeeReviewActive && careFeeConfirmedRequest && !careFeeComparison ? (
            <section className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-4 sm:p-5">
              <h2 className="text-xl font-bold text-cyan-50">Run the local comparison</h2>
              <p className="mt-2 text-sm leading-6 text-cyan-50/90">
                The records are ready, but nothing has been compared yet. This stays in this browser session.
              </p>
              <button
                type="button"
                onClick={handleCompareCareFeeRecords}
                disabled={careFeeComparisonInProgress}
                className="mt-4 min-h-11 w-full rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-300"
              >
                {careFeeComparisonInProgress ? "Comparing records…" : "Compare these records"}
              </button>
            </section>
          ) : null}
          {careFeeComparisonError ? (
            <p
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50"
            >
              {careFeeComparisonError}
            </p>
          ) : null}
          {careFeeComparison ? (
            <CareFeeSafeComparisonResultPanel
              model={careFeeComparison}
              onChangeRecords={handleChangeCareFeeRecords}
              onBackToDocuments={handleBackToCareFeeDocuments}
              onStartOver={handleStartOverCareFee}
            />
          ) : null}
        </section>
      ) : null}

      {!careFeeFlowActive ? (
      <section
        id={originalInputDisclosureId}
        hidden={compactOriginalInput}
        className="rounded-lg border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-slate-950/20 sm:p-6"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["paste", "Paste text", "Fastest way to check something"],
            ["image", "Take or upload a photo", "Reads the text on your device"],
            ["file", "Upload a file", "TXT, MD, CSV, JSON, DOCX, PDF, JPG, PNG"],
          ].map(([value, label, helper]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setUploadNote("");
                setInputMessage("");

                // "Take or upload a photo" opens the in-app camera capture
                // panel first, rather than immediately switching to the
                // inline image section - the panel itself is what lets the
                // user choose between taking a new photo and uploading an
                // existing one. The inline image-review section below still
                // appears once a photo is actually produced, because the
                // panel hands its local photo files back into the same OCR
                // review state below.
                if (value === "image") {
                  handleOpenPhotoCapturePanel();
                  return;
                }

                setSelectedInput(value as "paste" | "image" | "file");
              }}
              className={`min-h-24 rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                selectedInput === value
                  ? "border-emerald-300/70 bg-emerald-300/12 text-white"
                  : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20 hover:text-white"
              }`}
            >
              <span className="block text-base font-bold">{label}</span>
              <span className="mt-1 block text-sm text-slate-500">{helper}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowExamples((current) => !current)}
            className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white"
          >
            {showExamples ? "Hide examples" : "See an example"}
          </button>
          <button
            type="button"
            onClick={() => setShowDeveloperOptions((current) => !current)}
            className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            Advanced options
          </button>
          {inboxScanSettings.previewEnabled ? (
            <button
              type="button"
              onClick={() => {
                setShowInboxTools((current) => !current);
                onUpdateInboxScanSettings({ startupPromptDismissed: true });
              }}
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-400 transition hover:border-white/20 hover:text-white"
            >
              Inbox preview (beta)
            </button>
          ) : null}
        </div>

        {showExamples ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/50 p-4">
            <p className="text-sm font-bold text-white">Try an example</p>
            <p className="mt-1 text-sm text-slate-500">
              Loads sample text only. Press What does this mean? when ready.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sampleInputs.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => loadSample(sample)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showInboxTools ? (
          <div className="mt-4 space-y-3">
            {inboxScanSettings.showStartupPrompt &&
            !inboxScanSettings.startupPromptDismissed ? (
              <InboxScanPromptCard
                onPreview={() => {
                  onUpdateInboxScanSettings({ startupPromptDismissed: true });
                  setInboxScanOpen(true);
                }}
                onSkip={() => onUpdateInboxScanSettings({ startupPromptDismissed: true })}
              />
            ) : null}
            <InboxScanPreview
              open={inboxScanOpen}
              onOpenChange={setInboxScanOpen}
              ignoredItemIds={inboxScanSettings.ignoredItemIds}
              onIgnore={onIgnoreInboxScanItem}
              onSaveItem={onSaveScannedItem}
            />
          </div>
        ) : null}

        {showDeveloperOptions ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/60 p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <label className="block text-sm font-bold text-white" htmlFor="ai-mode">
                AI mode
              </label>
              <select
                id="ai-mode"
                value={aiSettings.mode}
                onChange={(event) => updateAiMode(event.target.value as AiMode)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              >
                <option value="local_rules">Local rules only</option>
                <option value="local_ollama">Local Ollama experimental</option>
              </select>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {isLocalOllamaMode
                  ? "Local Ollama is reading the text to extract facts. AdminAvenger still decides the result with its own deterministic checks."
                  : "Local rules only is the default. AdminAvenger still decides the case with its own deterministic checks."}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-bold text-white">Local AI testing</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Local Ollama mode is for testing on this device. It only works if Ollama is
                installed and running locally. Normal users of the hosted app will not need this
                later.
              </p>

              {isLocalOllamaMode ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-300" htmlFor="ollama-url">
                    Ollama URL
                    <input
                      id="ollama-url"
                      value={aiSettings.ollamaUrl}
                      onChange={(event) =>
                        setAiSettings((current) => ({
                          ...current,
                          ollamaUrl: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-300" htmlFor="ollama-model">
                    Ollama model
                    <select
                      id="ollama-model"
                      value={
                        isPresetOllamaModel(aiSettings.ollamaModel)
                          ? aiSettings.ollamaModel
                          : "custom"
                      }
                      onChange={(event) => {
                        const nextModel = event.target.value;

                        setAiSettings((current) => ({
                          ...current,
                          ollamaModel:
                            nextModel === "custom"
                              ? isPresetOllamaModel(current.ollamaModel)
                                ? ""
                                : current.ollamaModel
                              : nextModel,
                        }));
                      }}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
                    >
                      {ollamaModelOptions.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                      <option value="custom">Custom model</option>
                    </select>
                    {isPresetOllamaModel(aiSettings.ollamaModel) ? null : (
                      <input
                        value={aiSettings.ollamaModel}
                        onChange={(event) =>
                          setAiSettings((current) => ({
                            ...current,
                            ollamaModel: event.target.value,
                          }))
                        }
                        placeholder="Type an Ollama model name"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
                      />
                    )}
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          {isLocalOllamaMode ? (
            <p className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
              Using local Ollama extraction on this device. If it fails, AdminAvenger will fall
              back to local rules.
            </p>
          ) : null}
          </div>
        ) : null}

        <div className="mt-5">
          {selectedInput === "paste" ? (
            <div>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  handleAttachmentDragOver();
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  handleAttachmentDragLeave();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleAttachmentDrop(event);
                }}
                className={`rounded-lg border border-dashed p-3 transition ${
                  isDraggingOverAttachment
                    ? "border-emerald-300/70 bg-emerald-300/10"
                    : "border-white/10 bg-slate-950/25"
                }`}
              >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-300" htmlFor="paste-message">
                    {VISIBLE_INPUT_DROP_LABEL}
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {VISIBLE_INPUT_DROP_HELPER}
                  </p>
                </div>
                <div
                  className="relative"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setShowAddMenu(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setShowAddMenu(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-label="Add photo or file"
                    aria-haspopup="menu"
                    aria-expanded={showAddMenu}
                    onClick={() => setShowAddMenu((current) => !current)}
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/15 bg-slate-950 text-lg font-bold text-slate-200 transition hover:border-emerald-300/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
                  >
                    <span aria-hidden="true">+</span>
                  </button>

                  {showAddMenu ? (
                    <div
                      role="menu"
                      aria-label="Add photo or file"
                      className="absolute right-0 z-10 mt-2 w-48 space-y-1 rounded-lg border border-white/10 bg-slate-900 p-2 shadow-xl shadow-slate-950/40"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleOpenPhotoCapturePanel}
                        className="flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                      >
                        Take photo
                      </button>
                      <label
                        role="menuitem"
                        className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-white focus-within:ring-2 focus-within:ring-emerald-300/60"
                      >
                        Upload file
                        <input
                          type="file"
                          accept={quickUploadAcceptAttribute}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            void handleUploadedFileSelection(file);
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>
              <textarea
                id="paste-message"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    shouldSubmitOnEnterKey({
                      key: event.key,
                      shiftKey: event.shiftKey,
                      isComposing: event.nativeEvent.isComposing,
                      hasText: rawText.trim().length > 0,
                      isBusy: isChecking || isAiReading || isReadingPhoto,
                      isCoarsePointer: !isDesktopPointer,
                    })
                  ) {
                    event.preventDefault();
                    void handleCheck();
                  }
                }}
                rows={9}
                placeholder="Paste the email, bill, letter, or message here..."
                className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
              </div>
              {isDesktopPointer ? (
                <p className="mt-1 text-xs text-slate-500">
                  Press Enter to check, Shift+Enter for a new line.
                </p>
              ) : null}

              <DocumentAttachmentArea
                files={attachedFiles}
                isDraggingOver={isDraggingOverAttachment}
                disabled={isChecking || isAiReading}
                showCombinedTextNote={showAttachmentCombinedTextNote}
                onFilesSelected={(files) => void handleAttachmentFilesSelected(files)}
                onRemoveFile={handleRemoveAttachedFile}
                onDragOver={handleAttachmentDragOver}
                onDragLeave={handleAttachmentDragLeave}
                onDrop={handleAttachmentDrop}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/60 p-5">
              <div className="block text-base font-bold text-white">
                {selectedInput === "image" ? "Take or upload a photo" : "Choose or drop a file"}
                {selectedInput === "image" ? (
                  <span className="mt-2 block text-sm font-normal leading-6 text-slate-400">
                    Take or choose one photo of a letter, bill, receipt, or email. AdminAvenger
                    will find the document area locally and ask you to review it before OCR.
                  </span>
                ) : (
                  <span className="mt-2 block text-sm font-normal leading-6 text-slate-400">
                    DOCX, PDF, TXT, images - read locally in your browser. You can also drag files
                    into the attachment area below.
                  </span>
                )}
                {selectedInput === "image" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleOpenPhotoCapturePanel}
                      className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      Take photo
                    </button>
                    <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus-within:ring-2 focus-within:ring-emerald-300/40">
                      Upload existing photo
                      <input
                        key={`${selectedInput}-${inputResetKey}`}
                        type="file"
                        accept={photoCaptureAcceptAttribute}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void handleUploadedFileSelection(file);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                ) : (
                  <input
                    key={`${selectedInput}-${inputResetKey}`}
                    type="file"
                    accept={quickUploadAcceptAttribute}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      void handleUploadedFileSelection(file);
                    }}
                    className="mt-4 block w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-3 file:py-2 file:text-sm file:font-bold file:text-slate-950"
                  />
                )}
                <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">
                  {FILE_SIZE_LIMIT_HELPER}
                </span>
              </div>
              {uploadedFileName ? (
                <p className="mt-3 text-sm font-semibold text-slate-200">{uploadedFileName}</p>
              ) : null}
              {photoMetadata ? (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {photoMetadata.mimeType || "unknown type"} /{" "}
                  {(photoMetadata.fileSize / 1024 / 1024).toFixed(2)} MB. Filename only is kept
                  while this screen is open.
                </p>
              ) : null}
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Selected upload preview"
                  className="mt-4 max-h-64 w-full rounded-lg border border-white/10 object-contain"
                />
              ) : null}
              {uploadNote ? <p role="status" aria-live="polite" aria-atomic="true" className="mt-2 text-sm leading-6 text-slate-400">{uploadNote}</p> : null}
              {selectedInput === "file" ? (
                <DocumentAttachmentArea
                  files={attachedFiles}
                  isDraggingOver={isDraggingOverAttachment}
                  disabled={isChecking || isAiReading}
                  showCombinedTextNote={showAttachmentCombinedTextNote}
                  onFilesSelected={(files) => void handleAttachmentFilesSelected(files)}
                  onRemoveFile={handleRemoveAttachedFile}
                  onDragOver={handleAttachmentDragOver}
                  onDragLeave={handleAttachmentDragLeave}
                  onDrop={handleAttachmentDrop}
                />
              ) : null}
              <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {selectedInput === "image" && ocrStatus === "reading"
                  ? OCR_READING_STATUS_MESSAGE
                  : ""}
              </p>
              {selectedInput === "image" && ocrStatus === "reading" ? (
                <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4">
                  <p className="text-sm font-bold text-cyan-50">
                    {OCR_READING_STATUS_MESSAGE} {Math.round(ocrProgress * 100)}%
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950">
                    <div
                      className="h-full rounded-full bg-cyan-300 transition-all"
                      style={{ width: `${Math.max(5, Math.round(ocrProgress * 100))}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {selectedInput === "image" && ocrStatus === "success" && isOcrReviewUnreliable ? (
                <LowConfidenceOcrReviewPanel
                  previewUrl={imagePreviewUrl}
                  extractedText={ocrText}
                  onRetake={handleRetakePhoto}
                  onAddCloseUp={handleAddCloseUpPhoto}
                  onUploadClearer={handleUploadClearerPhoto}
                  onCheckCorrectedText={(text) => void handleCheckOcrText(text)}
                  onCancel={handleCancelOcrReview}
                  disabled={isChecking || isAiReading || isReadingPhoto}
                />
              ) : null}
              {selectedInput === "image" && ocrStatus === "success" && !isOcrReviewUnreliable ? (
                <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                  <p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-bold text-emerald-50">
                    {ocrSourceMode === "multi" ? OCR_COMBINED_PHOTOS_ON_DEVICE_MESSAGE : OCR_ON_DEVICE_MESSAGE}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/80">{OCR_MISTAKES_MESSAGE}</p>
                  {shouldHideOcrKeyDetails ? (
                    <div className="mt-3 rounded-lg border border-amber-300/35 bg-amber-300/10 px-4 py-3">
                      <p className="text-sm font-bold text-amber-50">
                        {OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-amber-100/90">
                        {OCR_ADD_CLOSE_UP_SUGGESTION}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-amber-100/90">
                        {OCR_KEY_DETAILS_REVIEW_OPTIONS_MESSAGE}
                      </p>
                    </div>
                  ) : null}
                  {ocrWarnings.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3">
                      {ocrSectionWarnings.length > 0 ? (
                        <p className="mb-2 text-sm font-bold text-amber-50">
                          Some photo sections need extra review.
                        </p>
                      ) : null}
                      <ul className="space-y-1 text-sm leading-6 text-amber-100">
                        {ocrWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {shouldHideOcrKeyDetails ? (
                    <div className="mt-3 rounded-lg border border-amber-300/25 bg-slate-950/60 px-4 py-3">
                      <p className="text-sm font-bold text-amber-50">
                        {OCR_KEY_DETAILS_HIDDEN_UNRELIABLE_MESSAGE}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-amber-100/80">
                        Edit the text below if you can read the document, then check it when you are comfortable.
                      </p>
                    </div>
                  ) : visibleOcrKeyDetails.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.07] px-4 py-3">
                      <p className="text-sm font-bold text-cyan-50">{OCR_KEY_DETAILS_HEADING}</p>
                      <p className="mt-1 text-xs leading-5 text-cyan-50/80">
                        {OCR_KEY_DETAILS_CHECK_MESSAGE}
                      </p>
                      {ocrWarnings.length > 0 ? (
                        <p className="mt-1 text-xs leading-5 text-amber-200">
                          {OCR_KEY_DETAILS_LOW_QUALITY_CAUTION}
                        </p>
                      ) : null}
                      <div className="mt-3 space-y-3">
                        {ocrKeyDetailGroups.map((group) => (
                          <div key={group.heading}>
                            <p className="text-xs font-bold uppercase tracking-wide text-cyan-200/70">
                              {group.heading}
                            </p>
                            <ul className="mt-1 space-y-1.5 text-sm leading-6 text-cyan-50">
                              {group.details.map((detail, index) => (
                                <li key={`${detail.kind}-${detail.value}-${index}`} title={detail.caution}>
                                  <span className="font-semibold">{detail.label}:</span> {detail.value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <label className="mt-3 block text-sm font-bold text-emerald-50">
                    Edit the text if needed
                    <textarea
                      value={ocrText}
                      onChange={(event) => setOcrText(event.target.value)}
                      rows={9}
                      className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
                    />
                  </label>
                  <p className="mt-2 text-xs leading-5 text-emerald-50/70">
                    {OCR_REVIEW_BEFORE_CHECKING_MESSAGE} {OCR_RUNS_ON_DEVICE_MESSAGE}
                    {ocrConfidence === undefined ? "" : ` OCR confidence: ${Math.round(ocrConfidence)}%.`}
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => void handleCheckOcrText()}
                      disabled={!ocrText.trim() || isChecking || isAiReading || isReadingPhoto}
                      className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                    >
                      Check this text
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCloseUpPhoto}
                      disabled={isChecking || isAiReading || isReadingPhoto}
                      className="min-h-11 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-50 transition hover:border-cyan-200/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {PHOTO_ADD_CLOSE_UP_LABEL}
                    </button>
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
                    >
                      {PHOTO_RETAKE_PHOTO_LABEL}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelOcrReview}
                      className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {PHOTO_ADD_CLOSE_UP_DESCRIPTION}
                  </p>
                </div>
              ) : null}
              {selectedInput === "image" && ocrStatus === "error" ? (
                <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4">
                  <p role="alert" aria-live="assertive" aria-atomic="true" className="text-sm leading-6 text-amber-50">{ocrError || OCR_FAILED_MESSAGE}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="min-h-11 rounded-lg border border-amber-200/40 bg-slate-950/60 px-4 py-3 text-sm font-bold text-amber-50 transition hover:border-amber-100 hover:text-white"
                    >
                      {PHOTO_RETAKE_PHOTO_LABEL}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelOcrReview}
                      className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              {selectedInput === "file" && rawText ? (
                <label className="mt-4 block text-sm font-semibold text-slate-300">
                  Review the loaded text
                  <textarea
                    value={rawText}
                    onChange={(event) => setRawText(event.target.value)}
                    rows={8}
                    className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
                  />
                </label>
              ) : null}
            </div>
          )}

          {/* Optional question - a calm, visually distinct section so pilot users
              notice it. It stays one input with the same userQuestion state and the
              same submitAcceptedText handoff; only the presentation and wording change. */}
          <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
            <span
              id="user-question-eyebrow"
              className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-100"
            >
              Optional question
            </span>
            <label
              htmlFor="user-question"
              className="mt-3 block text-sm font-semibold text-slate-200"
            >
              What would you like to know about this?
            </label>
            <p id="user-question-hint" className="mt-1 text-xs leading-5 text-slate-400">
              This question is optional and stays separate from your document. Ask what it
              means, whether anything is urgent, if there is a deadline, or what to do next.
            </p>
            <input
              id="user-question"
              type="text"
              value={userQuestion}
              onChange={(event) => setUserQuestion(event.target.value)}
              placeholder="e.g. What does this mean? Is there a deadline? What should I do next?"
              autoComplete="off"
              aria-describedby="user-question-eyebrow user-question-hint"
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
            />
          </div>
        </div>

        {selectedInput !== "image" ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={handleCheck}
              disabled={isChecking || isAiReading || isReadingPhoto || isReadingAttachments}
              aria-busy={isChecking || isAiReading || isReadingPhoto || isReadingAttachments}
              className="w-full rounded-lg bg-emerald-400 px-5 py-4 text-lg font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
            >
              {isAiReading
                ? "Reading this with local AI..."
                : isChecking
                  ? "Checking..."
                  : "What does this mean?"}
            </button>
            <button
              type="button"
              onClick={clearInput}
              className="rounded-lg border border-white/10 bg-slate-950 px-5 py-4 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              Clear input
            </button>
          </div>
        ) : null}

        {selectedInput === "image" ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={clearInput}
              className="rounded-lg border border-white/10 bg-slate-950 px-5 py-4 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              Clear input
            </button>
          </div>
        ) : null}

        <p className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
          What you paste stays in this browser in this version. Nothing is uploaded.
          <span className="mt-1 block text-cyan-50/80">
            You can remove passwords or account numbers first &mdash; AdminAvenger does not need them to
            help.
          </span>
        </p>

        {analysisError ? (
          <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {analysisError}
          </p>
        ) : null}
        {inputMessage ? (
          <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {inputMessage}
          </p>
        ) : null}
        {aiFallbackHint ? (
          <p className="mt-2 px-1 text-xs leading-5 text-slate-500">{aiFallbackHint}</p>
        ) : null}
        {aiError ? (
          <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {aiError}
          </p>
        ) : null}
      </section>
      ) : null}

      {frontDoorRoute.view ? (
        <FrontDoorConfirmationPanel
          view={frontDoorRoute.view}
          selectedChoiceId={frontDoorRoute.selectedChoiceId}
          onChoose={(choiceId: FrontDoorChoiceId) => {
            // Answering the question starts a fresh care step, so the input
            // surface returns to its compact state rather than inheriting an
            // expansion from a previous route.
            setShowOriginalInputSurface(false);
            dispatchFrontDoorRoute({ type: "choice_selected", choiceId });
          }}
          onBack={() => dispatchFrontDoorRoute({ type: "go_back" })}
          onCheckAsMessage={() => {
            void handleFrontDoorCheckAsMessage();
          }}
        />
      ) : null}

      {aiExtraction ? <AiExtractedFactsPanel extraction={aiExtraction} /> : null}

      {resultViewModel ? (
        <ResultCaseSheet
          model={resultViewModel}
          decisionResult={primaryCase?.decisionResult}
          benefitsActionPack={benefitsActionPack}
          strategicNextStepPlan={strategicNextStepPlan}
          adviserExportPack={adviserExportPack}
          primaryAction={simplePrimaryAction}
          secondaryActions={simpleSecondaryActions}
          guidedNextStepButton={
            !isCareerSupportCase && guidedNextStep
              ? {
                  label: guidedNextStep.primaryAction.label,
                  onClick: () => setShowGuidedNextStep(true),
                }
              : undefined
          }
          onDownloadAdviserPack={adviserExportPack ? handleDownloadAdviserPack : undefined}
          supportingDetailsOpen={showDetailed}
          onToggleSupportingDetails={() => setShowDetailed((current) => !current)}
        />
      ) : null}

      {showDetailed && primaryOpportunity ? (
        <section className="rounded-lg border border-white/10 bg-slate-950/55 p-4 sm:p-5">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Supporting detail
          </p>
          <div className="mt-4 grid gap-4">
            <OpportunityCardPanel opportunity={primaryOpportunity} />
            {!isCareerSupportCase && strategicNextStepPlan ? <StrategicNextStepPanel plan={strategicNextStepPlan} /> : null}
            {benefitsActionPack ? <BenefitsActionPackPanel pack={benefitsActionPack} /> : null}
          </div>
        </section>
      ) : null}

      {showGuidedNextStep && guidedNextStep ? (
        <GuidedNextStepPanel
          guidedNextStep={guidedNextStep}
          onClose={() => setShowGuidedNextStep(false)}
          onSaveToCase={primaryCase ? handleSaveToCaseFromGuidedPanel : undefined}
        />
      ) : null}

      {showPhotoCapturePanel ? (
        <PhotoCapturePanel
          key={`${photoCaptureIntent}-${activeAttachmentImageId ?? "main"}-${pendingPhotoFile?.name ?? "new"}-${pendingPhotoFile?.lastModified ?? 0}-${pendingPhotoFile?.size ?? 0}`}
          onUsePhotos={(photos) =>
            photoCaptureIntent === "attachment"
              ? void handleConfirmedAttachmentPhotos(photos)
              : void handleCapturedPhotos(photos)
          }
          onClose={() => {
            setShowPhotoCapturePanel(false);
            setPendingPhotoFile(undefined);
          }}
          onCancel={
            photoCaptureIntent === "attachment" ? handleCancelAttachmentImageReviewQueue : undefined
          }
          onTryAgain={
            photoCaptureIntent === "attachment" ? handleRejectAttachmentImageReview : undefined
          }
          onEditManually={handlePhotoEditManually}
          defaultSection={photoCaptureIntent === "append" ? "additional" : undefined}
          initialPhotoFile={pendingPhotoFile}
        />
      ) : null}

      {showEmailSafety && emailSafetyAssessment && result ? (
        <EmailSafetyModal
          assessment={emailSafetyAssessment}
          onClose={() => setShowEmailSafety(false)}
          onSaveCase={() => {
            onSaveEmailSafetyCase(result.item, emailSafetyAssessment);
            setShowEmailSafety(false);
          }}
        />
      ) : null}

      {result && primaryCase && hasClearCase && showDetailed ? (
        <section className="rounded-lg border border-emerald-300/25 bg-white/[0.055] p-5 shadow-xl shadow-slate-950/15 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
                Detailed assessment
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white">{getResultTitle(primaryCase)}</h3>
              <p className="mt-2 text-base text-slate-400">{categoryLabels[primaryCase.category]}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge urgency={primaryCase.urgency} label={`${primaryCase.urgency} urgency`} />
              {broadbandAssessment ? (
                <>
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
                    Document match: {confidenceLabels[getDocumentMatchConfidence(primaryCase)]}
                  </span>
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100">
                    Action confidence: {confidenceLabels[getActionConfidence(primaryCase)]}
                  </span>
                </>
              ) : (
                <span className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-300">
                  {describeConfidence(primaryCase.confidence)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                What matters
              </h4>
              <p className="mt-2 text-base leading-7 text-slate-300">{primaryCase.summary}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                {broadbandAssessment ? "Potential cost increase" : "Money/time/stress"}
              </h4>
              {broadbandAssessment ? (
                <div className="mt-2 space-y-2 text-base leading-7 text-slate-300">
                  <p>
                    {broadbandAssessment.oldMonthlyPrice ?? "Old price unknown"} -&gt;{" "}
                    {broadbandAssessment.newMonthlyPrice ?? "new price unknown"} per month
                  </p>
                  <p>
                    {broadbandAssessment.monthlyIncrease
                      ? `${broadbandAssessment.monthlyIncrease}/month more`
                      : "Monthly increase not found yet"}
                  </p>
                  <p>
                    {broadbandAssessment.annualIncrease
                      ? `${broadbandAssessment.annualIncrease}/year if unchanged`
                      : "Annual increase not found yet"}
                  </p>
                  <p>
                    Effective date: {broadbandAssessment.effectiveDate ?? "not found yet"}
                  </p>
                  {broadbandContractDate ? (
                    <p>
                      Contract date found: {broadbandContractDate}
                      {contractTimingLabel ? ` (${contractTimingLabel})` : ""}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-base leading-7 text-slate-300">
                  {primaryCase.valueLabel ??
                    "This may still be worth sorting because it could affect money, deadlines, or stress."}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              What to do next
            </h4>
            <p className="mt-2 text-base leading-7 text-slate-300">{primaryCase.nextAction}</p>
          </div>

          {broadbandAssessment && providerWordingFound.length > 0 ? (
            <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-100">
                Provider wording found
              </h4>
              <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                The message appears to say you may leave without an early termination charge
                {broadbandAssessment.responseDeadline
                  ? ` if you contact the provider before ${broadbandAssessment.responseDeadline}`
                  : ""}
                . AdminAvenger has not decided your rights, but this is important wording to
                check with the provider.
              </p>
              <ul className="mt-3 space-y-1 text-sm leading-6 text-emerald-50/80">
                {providerWordingFound.map((wording) => (
                  <li key={wording}>{wording}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-100">
                Evidence found
              </h4>
              <p className="mt-2 text-sm leading-6 text-emerald-50/85">
                {getEvidenceSummary(primaryCase)
                  ? getEvidenceSummary(primaryCase)
                  : "No evidence recorded yet."}
              </p>
            </div>
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-amber-100">
                {broadbandAssessment ? "What to check before acting" : "Still missing"}
              </h4>
              <p className="mt-2 text-sm leading-6 text-amber-50/85">
                {(broadbandChecks.length > 0 ? broadbandChecks : missingEvidence).length > 0
                  ? (broadbandChecks.length > 0 ? broadbandChecks : missingEvidence)
                      .slice(0, 3)
                      .join(", ")
                  : "No obvious missing evidence found, but check the details before acting."}
              </p>
              {broadbandAssessment ? (
                <p className="mt-3 text-sm leading-6 text-amber-50/85">
                  Why this matters: contract timing can affect which price-rise terms apply.
                </p>
              ) : null}
            </div>
          </div>

          {broadbandAssessment ? (
            <div className="mt-4 rounded-lg border border-sky-400/20 bg-sky-400/10 p-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-sky-100">
                Contract timing
              </h4>
              <p className="mt-2 text-sm leading-6 text-sky-100/85">
                {broadbandContractDate
                  ? `Contract date found: ${broadbandContractDate}. ${
                      contractTimingLabel ?? "Timing needs checking."
                    }`
                  : (broadbandAssessment.contractTimingExplanation ??
                    "Contract start or renewal date is needed. This affects which price-rise terms may apply and whether the increase was shown clearly when you signed or renewed.")}
              </p>
              {broadbandContractDate ? (
                <p className="mt-2 text-sm leading-6 text-sky-100/85">
                  {broadbandAssessment.contractTimingExplanation ??
                    "Check which price-rise terms may apply before acting."}
                </p>
              ) : null}
            </div>
          ) : null}

          {getCaveat(primaryCase) ? (
            <p className="mt-4 rounded-lg border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm leading-6 text-sky-100">
              {getCaveat(primaryCase)}
            </p>
          ) : null}

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Save actions are at the top, under the preview result. Nothing is saved until you choose
            to save.
          </p>

          {otherCases.length > 0 ? (
            <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-300">
                AdminAvenger also found...
              </p>
              <div className="mt-3 grid gap-2">
                {otherCases.map((adminCase) => (
                  <button
                    key={adminCase.id}
                    type="button"
                    onClick={() => onSaveCase(adminCase.id)}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-left text-sm font-semibold text-slate-200 transition hover:border-emerald-300/50 hover:text-white"
                  >
                    {adminCase.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {broadbandAssessment && relatedReminders.length > 0 ? (
            <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Related reminders
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {broadbandAssessment.effectiveDate ? (
                  <li>Price rise takes effect: {broadbandAssessment.effectiveDate}</li>
                ) : null}
                <li>Ask the provider before the change date</li>
              </ul>
            </div>
          ) : null}

        </section>
      ) : null}

      {result && !primaryOpportunity ? (
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h3 className="text-xl font-semibold text-white">
            No obvious money-back or urgent admin issue found.
          </h3>
          <p className="mt-2 text-base leading-7 text-slate-400">
            Try pasting the full message, including prices, dates, provider names, order references,
            deadlines, and what the sender is asking you to do.
          </p>
        </section>
      ) : null}

    </div>
  );
}
