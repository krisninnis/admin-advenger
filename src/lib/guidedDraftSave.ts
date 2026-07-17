import type { AdminCase, AdminDraft, AdminFinding } from "../types";
import {
  GUIDED_NEXT_STEP_SAFETY_NOTE,
  type NextStepAction,
} from "./guidedNextSteps";

export type GuidedDraftToSave = {
  subject: string;
  body: string;
  safetyNote: string;
};

export const GUIDED_DRAFT_CHASE_AFTER_DAYS = 7;

export const getGuidedDraftToSave = (
  action: NextStepAction,
  draftText: string,
): GuidedDraftToSave | undefined =>
  action.kind === "draft_message"
    ? {
        subject: action.title,
        body: draftText,
        safetyNote: action.safetyNote ?? GUIDED_NEXT_STEP_SAFETY_NOTE,
      }
    : undefined;

export const createAdminDraftFromGuidedDraft = (
  adminCase: AdminCase,
  draft: GuidedDraftToSave,
  createdAt: string,
): AdminDraft => ({
  id: `draft-${crypto.randomUUID()}`,
  findingId: adminCase.findingId,
  subject: draft.subject,
  body: draft.body,
  recommendedNextStep: draft.safetyNote,
  chaseAfterDays: GUIDED_DRAFT_CHASE_AFTER_DAYS,
  createdAt,
});

export const markSelectedCaseDrafted = (
  adminCase: AdminCase,
  updatedAt: string,
): AdminCase => ({
  ...adminCase,
  status: "drafted",
  updatedAt,
});

export const markSelectedFindingDrafted = (
  finding: AdminFinding,
): AdminFinding => ({
  ...finding,
  status: "drafted",
});
