import type { SourceType } from "../types";

export type SubmissionCheckFn = (
  title: string,
  sourceType: SourceType,
  rawText: string,
  userQuestion?: string,
) => Promise<boolean>;

export type SubmissionHandoffInput = {
  sourceTitle: string;
  sourceType: SourceType;
  acceptedText: string;
  userQuestion?: string;
  onCheck: SubmissionCheckFn;
};

export const submitAcceptedText = async ({
  sourceTitle,
  sourceType,
  acceptedText,
  userQuestion,
  onCheck,
}: SubmissionHandoffInput): Promise<boolean> => {
  const trimmedText = acceptedText;

  if (!trimmedText.trim()) {
    return false;
  }

  const trimmedQuestion = userQuestion?.trim();

  return onCheck(sourceTitle, sourceType, trimmedText, trimmedQuestion || undefined);
};
