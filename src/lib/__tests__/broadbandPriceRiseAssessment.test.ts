import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { assessBroadbandPriceRise } from "../broadbandPriceRiseAssessment";

const makeItem = (rawText: string, title = "journey-3-service-notice.docx"): AdminItem => ({
  id: "item-broadband-price-rise",
  title,
  sourceType: "bill",
  rawText,
  createdAt: "2026-07-17T12:00:00.000Z",
});

const noticeBody = [
  "Service price change notice",
  "Date: 15 July 2026",
  "Account reference: NB-73104",
  "Your monthly broadband price will change from \u00a329.00 to \u00a332.50 from 1 August 2026.",
  "Please review your account and contact us by 29 July 2026 if any details appear incorrect.",
].join("\n");

describe("assessBroadbandPriceRise provider extraction", () => {
  it("keeps a provider shown as the standalone document heading", () => {
    expect(
      assessBroadbandPriceRise(makeItem(`Northbridge Broadband\n${noticeBody}`)).providerName,
    ).toBe("Northbridge Broadband");
  });

  it("keeps provider wording already supported by the extractor", () => {
    expect(
      assessBroadbandPriceRise(
        makeItem(`This notice is from Greenfield Telecom.\n${noticeBody}`, "price-rise.txt"),
      ).providerName,
    ).toBe("Greenfield Telecom");
  });

  it("does not mistake the notice heading or filename for a provider", () => {
    expect(assessBroadbandPriceRise(makeItem(noticeBody)).providerName).toBeUndefined();
  });
});