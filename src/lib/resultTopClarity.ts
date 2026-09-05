export type DeadlineRelationship = "upcoming" | "today" | "passed" | "unknown";

export type DeadlineClarityInput = {
  value: string;
  purpose?: string;
  now: Date;
};

export type DeadlineClarity = {
  relationship: DeadlineRelationship;
  label: string;
  explanation: string;
};

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const normaliseDay = (date: Date): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const parseCalendarDay = (value: string): number | undefined => {
  const trimmed = value.trim();

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (iso) {
    const candidate = Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const parsed = new Date(candidate);
    return parsed.getUTCFullYear() === Number(iso[1]) &&
      parsed.getUTCMonth() === Number(iso[2]) - 1 &&
      parsed.getUTCDate() === Number(iso[3])
      ? candidate
      : undefined;
  }

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    const year = Number(slash[3]);
    const candidate = Date.UTC(year, month, day);
    const parsed = new Date(candidate);
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month && parsed.getUTCDate() === day
      ? candidate
      : undefined;
  }

  const words = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/u);
  if (!words) return undefined;

  const month = MONTH_INDEX[words[2].toLowerCase()];
  if (month === undefined) return undefined;

  const day = Number(words[1]);
  const year = Number(words[3]);
  const candidate = Date.UTC(year, month, day);
  const parsed = new Date(candidate);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month && parsed.getUTCDate() === day
    ? candidate
    : undefined;
};

export const classifyDeadlineRelationship = (
  value: string,
  now: Date,
): DeadlineRelationship => {
  const deadlineDay = parseCalendarDay(value);
  if (deadlineDay === undefined || Number.isNaN(now.getTime())) return "unknown";

  const today = normaliseDay(now);
  if (deadlineDay < today) return "passed";
  if (deadlineDay === today) return "today";
  return "upcoming";
};

export const buildDeadlineClarity = ({
  value,
  purpose,
  now,
}: DeadlineClarityInput): DeadlineClarity => {
  const relationship = classifyDeadlineRelationship(value, now);
  const purposeText = purpose?.trim();
  const purposeSuffix = purposeText ? ` The source says this date is for ${purposeText}.` : "";

  if (relationship === "passed") {
    return {
      relationship,
      label: `Source-stated date has passed: ${value}`,
      explanation:
        `The source states ${value}, and that date has passed.${purposeSuffix} AdminAvenger cannot tell from this date alone what missing it means for your options.`,
    };
  }

  if (relationship === "today") {
    return {
      relationship,
      label: `Source-stated date is today: ${value}`,
      explanation:
        `The source states ${value}, which is today.${purposeSuffix} Check the source wording before deciding whether any action is needed.`,
    };
  }

  if (relationship === "upcoming") {
    return {
      relationship,
      label: `Source-stated date is upcoming: ${value}`,
      explanation:
        `The source states ${value}, which is still upcoming.${purposeSuffix} Check the source wording before deciding whether any action is needed.`,
    };
  }

  return {
    relationship,
    label: `Source-stated date to check: ${value}`,
    explanation:
      `The source states ${value}, but AdminAvenger cannot safely compare it with today's date.${purposeSuffix} Check the original wording before acting.`,
  };
};
