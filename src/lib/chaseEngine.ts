import type { AdminCase } from "../types";

export type ChaseSummary = {
  dueToday: AdminCase[];
  overdue: AdminCase[];
  upcoming: AdminCase[];
  waitingWithChaseDates: AdminCase[];
  waitingWithoutChaseDate: AdminCase[];
};

const chaseStatuses = ["waiting", "chasing", "sent_manually"] as const;

const isActiveCase = (adminCase: AdminCase) =>
  adminCase.status !== "resolved" && adminCase.status !== "ignored";

const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const sortByChaseDate = (cases: AdminCase[]) =>
  [...cases].sort((first, second) =>
    (first.chaseDate ?? "").localeCompare(second.chaseDate ?? ""),
  );

export const getTodayDateString = () => toDateString(new Date());

export const getDefaultChaseDate = (daysFromToday = 3) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return toDateString(date);
};

export const getCasesDueToday = (cases: AdminCase[], today = getTodayDateString()) =>
  sortByChaseDate(
    cases.filter(
      (adminCase) => isActiveCase(adminCase) && adminCase.chaseDate === today,
    ),
  );

export const getOverdueCases = (cases: AdminCase[], today = getTodayDateString()) =>
  sortByChaseDate(
    cases.filter(
      (adminCase) =>
        isActiveCase(adminCase) &&
        Boolean(adminCase.chaseDate) &&
        adminCase.chaseDate! < today,
    ),
  );

export const getUpcomingChaseCases = (cases: AdminCase[], today = getTodayDateString()) =>
  sortByChaseDate(
    cases.filter(
      (adminCase) =>
        isActiveCase(adminCase) &&
        Boolean(adminCase.chaseDate) &&
        adminCase.chaseDate! > today,
    ),
  );

export const getWaitingCasesWithChaseDates = (cases: AdminCase[]) =>
  sortByChaseDate(
    cases.filter(
      (adminCase) => adminCase.status === "waiting" && Boolean(adminCase.chaseDate),
    ),
  );

export const getWaitingCasesWithoutChaseDate = (cases: AdminCase[]) =>
  cases.filter(
    (adminCase) =>
      chaseStatuses.includes(adminCase.status as (typeof chaseStatuses)[number]) &&
      !adminCase.chaseDate,
  );

export const getChaseSummary = (
  cases: AdminCase[],
  today = getTodayDateString(),
): ChaseSummary => ({
  dueToday: getCasesDueToday(cases, today),
  overdue: getOverdueCases(cases, today),
  upcoming: getUpcomingChaseCases(cases, today),
  waitingWithChaseDates: getWaitingCasesWithChaseDates(cases),
  waitingWithoutChaseDate: getWaitingCasesWithoutChaseDate(cases),
});
