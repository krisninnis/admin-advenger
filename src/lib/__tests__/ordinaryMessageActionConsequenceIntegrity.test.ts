import { describe, expect, it } from "vitest";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";

const run = (id: string, message: string) =>
  runPublicMessageScenario({ id, message } as unknown as PublicMessageScenario);

const APPOINTMENT =
  "Hi, just to let you know your appointment has been moved from 2 September 2026 at 10:30am to 8 September 2026 at 2:15pm. Please arrive 10 minutes early. You don't need to reply unless the new appointment time doesn't work for you.";

const APPLICATION_DOCUMENT_REQUEST =
  "Your application has been received. We need a copy of your latest bank statement to continue processing it. Please send this by 4 September 2026. If we do not receive it by then, your application may be delayed. This is not a decision on your application.";

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

  it("does not let the bare word delayed create a refund category", () => {
    const journey = run(
      "non-refund-delay",
      "Your application is still being processed and may be delayed while we check the documents.",
    );

    expect(journey.visibleText).not.toMatch(/money back|possible refund|refund clue|pending recovery|track refund|compensation/i);
  });
});
