import { useEffect, useMemo, useState } from "react";
import { EmailSafetyModal } from "../components/EmailSafetyModal";
import { GuidedNextStepPanel } from "../components/GuidedNextStepPanel";
import { InboxScanPreview } from "../components/InboxScanPreview";
import { InboxScanPromptCard } from "../components/InboxScanPromptCard";
import { OpportunityCardPanel } from "../components/OpportunityCardPanel";
import { PhotoCapturePanel } from "../components/PhotoCapturePanel";
import { SimpleResultPanel, type SimpleResultAction } from "../components/SimpleResultPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { InboxScanSettings } from "../lib/inboxScanStorage";
import { getGuidedCaseMode, type GuidedCaseMode } from "../lib/guidedCaseMode";
import { deriveGuidedNextStep } from "../lib/guidedNextSteps";
import {
  loadAiProviderSettings,
  saveAiProviderSettings,
  type AiMode,
} from "../lib/aiProviderSettings";
import { buildAdminTextFromAiExtraction } from "../lib/aiExtractionAdapter";
import { deriveOpportunityCard, describeConfidence } from "../lib/opportunityCards";
import {
  createPhotoIntakeMetadata,
  getImageDimensions,
  getImageQualityWarnings,
  isSupportedPhotoFile,
  type PhotoIntakeMetadata,
} from "../lib/photoIntake";
import {
  assessDocumentImageQuality,
  getVisibleDocumentQualityWarningMessages,
} from "../lib/documentImageQuality";
import { assessEmailSafety } from "../lib/suspiciousEmail";
import {
  isCoarsePointerEnvironment,
  shouldSubmitOnEnterKey,
} from "../lib/checkInputKeyboard";
import {
  photoAcceptAttribute,
  quickUploadAcceptAttribute,
  textFileAcceptAttribute,
} from "../lib/fileIntakeAccept";
import type { ServiceStatus } from "../services/analysisService";
import {
  OCR_FAILED_MESSAGE,
  OCR_MISTAKES_MESSAGE,
  OCR_ON_DEVICE_MESSAGE,
  OCR_READING_STATUS_MESSAGE,
  OCR_REVIEW_BEFORE_CHECKING_MESSAGE,
  OCR_RUNS_ON_DEVICE_MESSAGE,
  OcrReadError,
  readTextFromImage,
} from "../lib/photoOcr";
import {
  OCR_KEY_DETAILS_CHECK_MESSAGE,
  OCR_KEY_DETAILS_HEADING,
  OCR_KEY_DETAILS_LOW_QUALITY_CAUTION,
  extractOcrKeyDetails,
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

export type HomeAnalysisResult = {
  item: AdminItem;
  findings: AdminFinding[];
  cases: AdminCase[];
};

type HomeViewProps = {
  result?: HomeAnalysisResult;
  analysisStatus: ServiceStatus;
  analysisError?: string;
  onCheck: (title: string, sourceType: SourceType, rawText: string) => Promise<boolean>;
  onSaveCase: (caseId: string) => void;
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

const categoryPriority: Record<AdminCase["category"], number> = {
  bill_increase: 0,
  refund: 1,
  subscription: 2,
  warranty: 3,
  complaint: 4,
  important_reply: 5,
  deadline: 6,
  job_application: 7,
  admin_dispute: 8,
  unknown: 9,
};

const urgencyPriority: Record<AdminCase["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const getMostImportantCase = (cases: AdminCase[]) =>
  [...cases].sort((first, second) => {
    const urgencyDifference = urgencyPriority[first.urgency] - urgencyPriority[second.urgency];

    if (urgencyDifference !== 0) {
      return urgencyDifference;
    }

    return categoryPriority[first.category] - categoryPriority[second.category];
  })[0];

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
  adminCase?.category === "unknown" && /^No obvious saving or action found/i.test(adminCase.title);

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

const supportedTextFileExtensions = [".txt", ".md", ".csv", ".json"];

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

const isSupportedTextFile = (file: File) => {
  const fileName = file.name.toLowerCase();

  return supportedTextFileExtensions.some((extension) => fileName.endsWith(extension));
};

type OcrStatus = "idle" | "reading" | "success" | "error";

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

function AiExtractedFactsPanel({ extraction }: { extraction: AiExtractionResult }) {
  const [isOpen, setIsOpen] = useState(false);
  const amountItems = extraction.amounts.map((amount) => {
    const value = amount.value === null ? "not found" : `${amount.currency === "GBP" ? "£" : ""}${amount.value}`;
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [photoMetadata, setPhotoMetadata] = useState<PhotoIntakeMetadata | undefined>();
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrText, setOcrText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>();
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
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
  const [showExamples, setShowExamples] = useState(false);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
  const [showInboxTools, setShowInboxTools] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isDesktopPointer, setIsDesktopPointer] = useState(false);
  const isChecking = analysisStatus === "loading";
  const isAiReading = aiStatus === "loading";
  const isReadingPhoto = ocrStatus === "reading";
  const isLocalOllamaMode = aiSettings.mode === "local_ollama";
  // "Key details found" card (see src/lib/ocrKeyDetails.ts) - recomputed from
  // whatever is currently in the editable OCR textarea, so editing the text
  // updates the card too. Purely local regex matching over text already on
  // this device; never runs while ocrStatus isn't "success" for nothing to
  // needlessly recompute while OCR itself is still reading.
  const ocrKeyDetails = useMemo(
    () => (ocrStatus === "success" ? extractOcrKeyDetails(ocrText) : { details: [], warnings: [] }),
    [ocrStatus, ocrText],
  );
  // Grouped into named sections (Money mentioned, Dates mentioned, etc.) for
  // the card below - a flat list of every detail was hard to scan on mobile.
  const ocrKeyDetailGroups = useMemo(
    () => groupOcrKeyDetails(ocrKeyDetails.details),
    [ocrKeyDetails],
  );
  const primaryCase = useMemo(
    () => (result ? getMostImportantCase(result.cases) : undefined),
    [result],
  );
  const primaryFinding = result?.findings.find((finding) => finding.id === primaryCase?.findingId);
  const primaryOpportunity = primaryCase
    ? deriveOpportunityCard(primaryCase, result?.item, primaryFinding)
    : undefined;
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
  const recordSaveHint =
    primaryOpportunity?.opportunityType === "no_action_needed" ||
    primaryOpportunity?.opportunityType === "delivery_update"
      ? "Best for FYI/no-action items."
      : primaryOpportunity?.opportunityType === "receipt_guardian"
        ? "Best for proof of purchase."
        : "Save this for your records only. It will not count as money saved.";
  const hideSaveCase =
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
  const primaryActionLabel =
    primaryOpportunity && guidedMode && primaryCase
      ? isAppointmentTask(primaryCase)
        ? "Save this task"
        : getHomePrimaryActionLabel(primaryOpportunity.opportunityType, guidedMode)
      : undefined;
  const simplePrimaryAction: SimpleResultAction | undefined =
    primaryOpportunity && primaryCase
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
  const simpleSecondaryActions: SimpleResultAction[] =
    primaryCase && primaryOpportunity
      ? [
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
    setOcrProgress(0);
    setOcrError("");
    setOcrConfidence(undefined);
    setOcrWarnings([]);
    setAiStatus("idle");
    setAiError("");
    setAiFallbackHint("");
    setAiExtraction(undefined);
    setShowDetailed(false);
    setShowEmailSafety(false);
    setInputResetKey((current) => current + 1);
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
    setOcrProgress(0);
    setOcrError("");
    setOcrConfidence(undefined);
    setOcrWarnings([]);
    setAiError("");
    setAiFallbackHint("");
    setAiExtraction(undefined);
    setShowEmailSafety(false);
    onClearResult();
  };

  const updateAiMode = (mode: AiMode) => {
    setAiSettings((current) => ({ ...current, mode }));
    setAiError("");
    setInputMessage("");
  };

  const runOllamaExtraction = async (textOverride?: string) => {
    const textToExtract = textOverride ?? rawText.trim();
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

      const checked = await onCheck("Local AI extracted admin facts", "email", reconstructedText);

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

      await onCheck("Pasted admin text", "email", textToExtract);
    }
  };

  const handleCheck = async () => {
    setAiExtraction(undefined);
    setShowDetailed(false);
    setShowEmailSafety(false);
    onClearResult();

    if (selectedInput === "image" && rawText.trim().length === 0) {
      setInputMessage(
        ocrText.trim()
          ? "Use the extracted photo text first, then AdminAvenger can check it."
          : "AdminAvenger could not read enough text from this photo. Try a clearer photo, better lighting, or paste the text manually.",
      );
      return;
    }

    if (rawText.trim().length === 0) {
      setInputMessage(
        selectedInput === "paste"
          ? "Paste some text to check this now."
          : "Image/file reading is not active in this mode. Paste the text from the document or enable a supported AI extraction mode.",
      );
      return;
    }

    if (isChecking || isAiReading || isReadingPhoto) {
      return;
    }

    if (isLocalOllamaMode) {
      await runOllamaExtraction();
      return;
    }

    setInputMessage("");
    setAiError("");
    setAiFallbackHint("");
    const checked = await onCheck("Pasted admin text", "email", rawText.trim());

    if (!checked) {
      setAiExtraction(undefined);
    }
  };

  const handleImageUpload = async (file?: File) => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl("");
    }

    setUploadedFileName(file?.name ?? "");
    setInputMessage("");
    setAiExtraction(undefined);
    setPhotoMetadata(undefined);
    setOcrStatus("idle");
    setOcrText("");
    setOcrProgress(0);
    setOcrError("");
    setOcrConfidence(undefined);
    setOcrWarnings([]);

    if (!file) {
      setUploadNote("");
      return;
    }

    if (!isSupportedPhotoFile(file)) {
      setUploadNote(
        "This image type may not be readable here. Try JPG, PNG, WEBP, or paste the text manually.",
      );
      setOcrStatus("error");
      setOcrError("AdminAvenger could not read this photo type in the browser.");
      return;
    }

    setImagePreviewUrl(URL.createObjectURL(file));
    setUploadNote(
      "Photo stays in this browser in this version. The full photo is not stored in this prototype - keep the original photo somewhere safe.",
    );

    // Best-effort pixel dimensions (never blocks - see getImageDimensions),
    // combined with the file size to flag a photo that is likely too small
    // or too compressed for a full-page letter before OCR even runs. Runs
    // alongside the Document Capture Coach's own quality checks (see
    // src/lib/documentImageQuality.ts) so every photo entry path - not just
    // the one that goes through PhotoCapturePanel's own capture-review
    // screen - carries the same warnings into OCR review below.
    const [dimensions, documentQuality] = await Promise.all([
      getImageDimensions(file),
      assessDocumentImageQuality(file),
    ]);
    const baseMetadata = createPhotoIntakeMetadata(file);
    setPhotoMetadata(dimensions ? { ...baseMetadata, ...dimensions } : baseMetadata);
    const imageQualityWarnings = Array.from(
      new Set([
        ...getImageQualityWarnings({ fileSize: file.size, ...dimensions }),
        ...getVisibleDocumentQualityWarningMessages(documentQuality),
      ]),
    );

    setOcrStatus("reading");
    setOcrWarnings(imageQualityWarnings);

    try {
      const result = await readTextFromImage(file, (progress) => {
        setOcrProgress(progress.progress);
      });

      setOcrConfidence(result.confidence);
      // Combine the photo's own quality warnings with OCR's text/confidence
      // warnings, de-duplicated (e.g. a very small, low-confidence photo
      // should not somehow show the same warning twice).
      setOcrWarnings(Array.from(new Set([...imageQualityWarnings, ...result.warnings])));
      setOcrProgress(1);
      setOcrText(result.text);
      setOcrStatus("success");
      setInputMessage("");
    } catch (error) {
      setOcrStatus("error");
      setOcrError(error instanceof OcrReadError ? error.message : OCR_FAILED_MESSAGE);
    }
  };

  // "Check this text" - uses the reviewed/edited OCR text (never the raw
  // untouched OCR output) and feeds it straight into the same Check a
  // message flow every other input path uses. Never auto-saves or uploads
  // the photo, and never contacts anyone or counts money automatically -
  // it only runs the existing local decision-engine check.
  const handleCheckOcrText = async () => {
    const cleanedText = ocrText.trim();

    if (!cleanedText || isChecking || isAiReading || isReadingPhoto) {
      return;
    }

    setRawText(cleanedText);
    setSelectedInput("paste");
    setAiExtraction(undefined);
    setShowDetailed(false);
    setShowEmailSafety(false);
    setInputMessage("");
    setAiError("");
    setAiFallbackHint("");
    onClearResult();

    if (isLocalOllamaMode) {
      await runOllamaExtraction(cleanedText);
      return;
    }

    const checked = await onCheck("Photo text (reviewed before checking)", "email", cleanedText);

    if (!checked) {
      setAiExtraction(undefined);
    }
  };

  // "Try another photo" - resets the current photo/OCR state and reopens the
  // same "Take or upload a photo" panel used to get here, rather than
  // introducing a second way to pick a photo.
  //
  // TODO(multi-photo): this always replaces the current photo/text. A future
  // "Add another photo" action could instead keep the current ocrText and
  // append the next photo's extracted text via combineOcrTexts (see
  // src/lib/photoOcr.ts) so a letter split across more than one photo can be
  // reviewed as one combined block of text. Not built yet - see the TODO in
  // photoOcr.ts for why this needs its own small design pass first.
  const handleTryAnotherPhoto = () => {
    void handleImageUpload(undefined);
    setShowPhotoCapturePanel(true);
  };

  // "Cancel" - backs out of the photo/OCR review without picking a new
  // photo. Reuses the same reset path as clearing/removing a photo.
  const handleCancelOcrReview = () => {
    void handleImageUpload(undefined);
  };

  const handleFileUpload = async (file?: File) => {
    setUploadedFileName(file?.name ?? "");
    setInputMessage("");

    if (!file) {
      setUploadNote("");
      return;
    }

    if (!isSupportedTextFile(file)) {
      setUploadNote(
        "File reading is coming later. For now, copy/paste the text from the document if you can.",
      );
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

  const handleQuickPhotoCapture = async (file?: File) => {
    setShowAddMenu(false);
    setSelectedInput("image");
    await handleImageUpload(file);
  };

  // Reuses the exact same save-flow decision the existing primary/secondary
  // Save buttons already make (record vs. case, per opportunity type) -
  // this never introduces a second, different way of saving a case.
  const handleSaveToCaseFromGuidedPanel = () => {
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
      onSaveCase(primaryCase.id);
    }

    setShowGuidedNextStep(false);
  };

  const handleQuickFileUpload = async (file?: File) => {
    setShowAddMenu(false);

    if (!file) {
      return;
    }

    if (isSupportedPhotoFile(file)) {
      setSelectedInput("image");
      await handleImageUpload(file);
      return;
    }

    setSelectedInput("file");
    await handleFileUpload(file);
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
          Paste the bill, email, or message you want help with.
        </h2>
        <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
          AdminAvenger explains it in plain English, tells you what to have ready, and prepares the
          next step. You stay in control.
        </p>
      </header>

      <section className="rounded-lg border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["paste", "Paste text", "Fastest way to check something"],
            ["image", "Take or upload a photo", "Reads the text on your device"],
            ["file", "Upload a file", "TXT, MD, CSV, JSON"],
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
                // appears once a photo is actually produced, because
                // handleQuickPhotoCapture (passed to the panel) sets
                // selectedInput to "image" itself.
                if (value === "image") {
                  setShowPhotoCapturePanel(true);
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
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold text-slate-300" htmlFor="paste-message">
                  Paste your message
                </label>
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
                      <label
                        role="menuitem"
                        className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-white focus-within:ring-2 focus-within:ring-emerald-300/60"
                      >
                        Take photo
                        <input
                          type="file"
                          accept={photoAcceptAttribute}
                          capture="environment"
                          onChange={(event) => void handleQuickPhotoCapture(event.target.files?.[0])}
                          className="sr-only"
                        />
                      </label>
                      <label
                        role="menuitem"
                        className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-white focus-within:ring-2 focus-within:ring-emerald-300/60"
                      >
                        Upload file
                        <input
                          type="file"
                          accept={quickUploadAcceptAttribute}
                          onChange={(event) => void handleQuickFileUpload(event.target.files?.[0])}
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
                placeholder="Paste the email, bill, letter, or message here…"
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
              {isDesktopPointer ? (
                <p className="mt-1 text-xs text-slate-500">
                  Press Enter to check, Shift+Enter for a new line.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/60 p-5">
              <label className="block text-base font-bold text-white">
                {selectedInput === "image" ? "Take or upload a photo" : "Choose a text file"}
                {selectedInput === "image" ? (
                  <span className="mt-2 block text-sm font-normal leading-6 text-slate-400">
                    Take a photo of a letter, bill, receipt, or email. AdminAvenger will try to
                    read the text on this device.
                  </span>
                ) : null}
                <input
                  key={`${selectedInput}-${inputResetKey}`}
                  type="file"
                  accept={selectedInput === "image" ? photoAcceptAttribute : textFileAcceptAttribute}
                  capture={selectedInput === "image" ? "environment" : undefined}
                  onChange={(event) =>
                    selectedInput === "image"
                      ? void handleImageUpload(event.target.files?.[0])
                      : void handleFileUpload(event.target.files?.[0])
                  }
                  className="mt-4 block w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-3 file:py-2 file:text-sm file:font-bold file:text-slate-950"
                />
              </label>
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
              {uploadNote ? <p className="mt-2 text-sm leading-6 text-slate-400">{uploadNote}</p> : null}
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
              {selectedInput === "image" && ocrStatus === "success" ? (
                <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                  <p className="text-sm font-bold text-emerald-50">{OCR_ON_DEVICE_MESSAGE}</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/80">{OCR_MISTAKES_MESSAGE}</p>
                  {ocrWarnings.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3">
                      <ul className="space-y-1 text-sm leading-6 text-amber-100">
                        {ocrWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {ocrKeyDetails.details.length > 0 ? (
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
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
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
                      onClick={handleTryAnotherPhoto}
                      className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
                    >
                      Try another photo
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
              {selectedInput === "image" && ocrStatus === "error" ? (
                <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4">
                  <p className="text-sm leading-6 text-amber-50">{ocrError || OCR_FAILED_MESSAGE}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleTryAnotherPhoto}
                      className="min-h-11 rounded-lg border border-amber-200/40 bg-slate-950/60 px-4 py-3 text-sm font-bold text-amber-50 transition hover:border-amber-100 hover:text-white"
                    >
                      Try another photo
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
        </div>

        {selectedInput !== "image" ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={handleCheck}
              disabled={isChecking || isAiReading || isReadingPhoto}
              aria-busy={isChecking || isAiReading || isReadingPhoto}
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
            You can remove passwords or account numbers first — AdminAvenger does not need them to
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

      {aiExtraction ? <AiExtractedFactsPanel extraction={aiExtraction} /> : null}

      {primaryOpportunity ? (
        <SimpleResultPanel
          opportunity={primaryOpportunity}
          primaryAction={simplePrimaryAction}
          secondaryActions={simpleSecondaryActions}
          detailsOpen={showDetailed}
          onToggleDetails={() => setShowDetailed((current) => !current)}
          note={`Nothing has been saved yet. ${recordSaveHint}`}
          details={<OpportunityCardPanel opportunity={primaryOpportunity} />}
          guidedNextStepButton={
            guidedNextStep
              ? {
                  label: guidedNextStep.primaryAction.label,
                  onClick: () => setShowGuidedNextStep(true),
                }
              : undefined
          }
        />
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
          onUsePhoto={(file) => void handleQuickPhotoCapture(file)}
          onClose={() => setShowPhotoCapturePanel(false)}
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
