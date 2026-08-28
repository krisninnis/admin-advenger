import { describe, expect, it } from "vitest";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";

const run = (id: string, message: string) =>
  runPublicMessageScenario({ id, message } as unknown as PublicMessageScenario);

const APPOINTMENT =
  "Hi, just to let you know your appointment has been moved from 2 September 2026 at 10:30am to 8 September 2026 at 2:15pm. Please arrive 10 minutes early. You don't need to reply unless the new appointment time doesn't work for you.";

const MOVED_APPOINTMENT_TWO_SENTENCE =
  "Your appointment was originally booked for 2 September 2026 at 10:30am. It has now been moved to 8 September 2026 at 2:15pm. You do not need to reply to this message.";

const APPLICATION_DOCUMENT_REQUEST =
  "Your application has been received. We need a copy of your latest bank statement to continue processing it. Please send this by 4 September 2026. If we do not receive it by then, your application may be delayed. This is not a decision on your application.";

const CONDITIONAL_ACCOUNT_CLOSURE = `Once we receive the death certificate, we will be able to close the account.

Until then, the account remains active and monthly charges will continue. Please send the document by 12 August 2026.

Reference DOC-12884.`;

describe("ordinary message action and consequence integrity v1", () => {
  it("preserves moved-appointment practical and conditional reply instructions", () => {
    const journey = run("appointment-instructions", APPOINTMENT);
    const visible = journey.visibleText;

    expect(journey.resultViewModel.title).toBe("Appointment date changed");
    expect(visible).toContain("2 September 2026");
    expect(visible).toContain("10:30am");
    expect(visible).toContain("8 September 2026");
    expect(visible).toContain("2:15pm");
    expect(visible).toMatch(/arrive 10 minutes early/i);
    expect(visible).toMatch(/do(?: not|n't) need to reply unless the new appointment time doesn't work/i);
    expect(visible).not.toMatch(/money back|refund|compensation|complaint draft/i);
  });

  it("classifies a two-sentence moved appointment with 'originally booked for' and 'moved to' as a date change", () => {
    const journey = run("moved-appointment-two-sentence", MOVED_APPOINTMENT_TWO_SENTENCE);
    const visible = journey.visibleText;

    expect(journey.resultViewModel.title).toBe("Appointment date changed");
    expect(visible).toContain("2 September 2026");
    expect(visible).toContain("10:30am");
    expect(visible).toContain("8 September 2026");
    expect(visible).toContain("2:15pm");

    const keyDates = journey.resultViewModel.keyDates;
    const prevDates = keyDates.filter((kd: { label: string }) => kd.label === "Previous appointment date");
    const replDates = keyDates.filter((kd: { label: string }) => kd.label === "Replacement appointment date");
    expect(prevDates.length).toBe(1);
    expect(replDates.length).toBe(1);
    expect(prevDates[0].value).toBe("2 September 2026");
    expect(replDates[0].value).toBe("8 September 2026");

    expect(visible).toMatch(/do not need to reply/i);
    expect(visible).not.toMatch(/please\s+(reply|respond|contact|send|provide)/i);
    expect(visible).not.toMatch(/money back|refund|compensation|complaint draft/i);
    expect(visible).not.toMatch(/deadline|must\s+respond|must\s+reply/i);
  });

  it("treats an application bank-statement request as a document request, not a refund", () => {
    const journey = run("application-document-request", APPLICATION_DOCUMENT_REQUEST);
    const visible = journey.visibleText;

    expect(journey.resultViewModel.title).toBe("Document request to act on");
    expect(visible).toMatch(/latest bank statement/i);
    expect(visible).toContain("4 September 2026");
    expect(visible).toMatch(/application may be delayed/i);
    expect(visible).toMatch(/not a decision on your application/i);
    expect(visible).not.toMatch(/money back|possible refund|refund clue|pending recovery|track refund|complaint draft|compensation/i);
  });

  it("keeps the deadline tied to the requested document", () => {
    const journey = run("application-deadline", APPLICATION_DOCUMENT_REQUEST);
    const fallback = journey.adminCase.generalAdminFallback;

    expect(fallback?.topic).toBe("document_request");
    expect(fallback?.requestedDocument).toMatch(/latest bank statement/i);
    expect(fallback?.dates.some((date) => date.role === "stated_deadline" && date.value === "4 September 2026")).toBe(true);
    expect(fallback?.consequence).toMatch(/application may be delayed/i);
    expect(fallback?.nextAction).toMatch(/provide the requested latest bank statement by 4 September 2026/i);
  });

  it("preserves specialist account-outcome precedence over the generic document-request path", () => {
    const journey = run("conditional-account-closure", CONDITIONAL_ACCOUNT_CLOSURE);

    expect(journey.resultViewModel.title).toBe("Account closure needs a document");
    expect(journey.visibleText).toMatch(/account remains active/i);
    expect(journey.visibleText).toMatch(/monthly charges will continue/i);
    expect(journey.visibleText).toMatch(/death certificate/i);
    expect(journey.visibleText).toContain("12 August 2026");
    expect(journey.visibleText).toContain("DOC-12884");
  });

  it("does not let the bare word delayed create a refund category", () => {
    const journey = run(
      "non-refund-delay",
      "Your application is still being processed and may be delayed while we check the documents.",
    );

    expect(journey.visibleText).not.toMatch(/money back|possible refund|refund clue|pending recovery|track refund|compensation/i);
  });
});
