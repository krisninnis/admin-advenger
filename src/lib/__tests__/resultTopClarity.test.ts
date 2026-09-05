import { describe, expect, it } from "vitest";
import {
  buildDeadlineClarity,
  classifyDeadlineRelationship,
} from "../resultTopClarity";

describe("result top deadline clarity", () => {
  const now = new Date("2026-09-05T12:00:00.000Z");

  it("classifies a passed source-stated date without inventing a consequence", () => {
    const result = buildDeadlineClarity({
      value: "29 July 2026",
      purpose: "contacting Northbridge Broadband if any details appear incorrect",
      now,
    });

    expect(result.relationship).toBe("passed");
    expect(result.label).toBe("Source-stated date has passed: 29 July 2026");
    expect(result.explanation).toContain("that date has passed");
    expect(result.explanation).toContain(
      "The source says this date is for contacting Northbridge Broadband if any details appear incorrect.",
    );
    expect(result.explanation).toContain(
      "AdminAvenger cannot tell from this date alone what missing it means for your options.",
    );
    expect(result.explanation).not.toMatch(/cancelled|disconnected|lost rights|penalty|must act urgently/i);
  });

  it("classifies a source-stated date that is today", () => {
    const result = buildDeadlineClarity({
      value: "5 September 2026",
      purpose: "checking the details",
      now,
    });

    expect(result.relationship).toBe("today");
    expect(result.label).toBe("Source-stated date is today: 5 September 2026");
  });

  it("classifies an upcoming source-stated date", () => {
    const result = buildDeadlineClarity({
      value: "12 September 2026",
      purpose: "checking the details",
      now,
    });

    expect(result.relationship).toBe("upcoming");
    expect(result.label).toBe("Source-stated date is upcoming: 12 September 2026");
  });

  it("fails closed when the date cannot be safely compared", () => {
    const result = buildDeadlineClarity({
      value: "next Friday",
      purpose: "responding if needed",
      now,
    });

    expect(result.relationship).toBe("unknown");
    expect(result.explanation).toContain("cannot safely compare it with today's date");
    expect(result.explanation).not.toMatch(/passed|overdue|urgent/i);
  });

  it("supports the date forms already accepted by the admin extractors", () => {
    expect(classifyDeadlineRelationship("2026-07-29", now)).toBe("passed");
    expect(classifyDeadlineRelationship("05/09/2026", now)).toBe("today");
    expect(classifyDeadlineRelationship("12 September 2026", now)).toBe("upcoming");
  });
});
