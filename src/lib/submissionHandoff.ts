import type { SourceType } from "../types";
import type { SourceDocument } from "./sourceProvenance";

export type SubmissionCheckFn = (
  title: string,
  sourceType: SourceType,
  rawText: string,
  userQuestion?: string,
  sourceDocuments?: readonly SourceDocument[],
) => Promise<boolean>;

export type SubmissionHandoffInput = {
  sourceTitle: string;
  sourceType: SourceType;
  acceptedText: string;
  userQuestion?: string;
  sourceDocuments?: readonly SourceDocument[];
  onCheck: SubmissionCheckFn;
};

export const submitAcceptedText = async ({
  sourceTitle,
  sourceType,
  acceptedText,
  userQuestion,
  sourceDocuments,
  onCheck,
}: SubmissionHandoffInput): Promise<boolean> => {
  const trimmedText = acceptedText;

  if (!trimmedText.trim()) {
    return false;
  }

  const trimmedQuestion = userQuestion?.trim();

  if (sourceDocuments) {
    return onCheck(
      sourceTitle,
      sourceType,
      trimmedText,
      trimmedQuestion || undefined,
      sourceDocuments,
    );
  }

  return onCheck(sourceTitle, sourceType, trimmedText, trimmedQuestion || undefined);
};
