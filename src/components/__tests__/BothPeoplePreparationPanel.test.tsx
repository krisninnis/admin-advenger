// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BothPeoplePreparationPanel } from "../BothPeoplePreparationPanel";

afterEach(cleanup);

const OFFER = "Prepare both sides separately";
const CHOOSE_FIRST = "Which side would you like to prepare first?";

const renderPanel = () => {
  const onReturnToOriginalMessage = vi.fn();
  render(
    <BothPeoplePreparationPanel
      personLabel="Dad"
      originalInput="I care for Dad full-time and he needs more help now."
      onReturnToOriginalMessage={onReturnToOriginalMessage}
    />,
  );
  return { user: userEvent.setup(), onReturnToOriginalMessage };
};

const openChooser = async () => {
  const result = renderPanel();
  await result.user.click(screen.getByRole("button", { name: OFFER }));
  return result;
};

const chooseSupportedPersonFirst = async () => {
  const result = await openChooser();
  await result.user.click(
    screen.getByRole("radio", { name: "The other person's needs" }),
  );
  await result.user.click(screen.getByRole("button", { name: "Continue" }));
  return result;
};

const completeSupportedPerson = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("checkbox", { name: "Washing or dressing" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("radio", { name: "It has become more difficult" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("radio", { name: "Every day" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
};

const completeSupporter = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    screen.getByRole("checkbox", { name: "Shopping or household tasks" }),
  );
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("radio", { name: "A few times a week" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(
    screen.getByRole("checkbox", { name: "It is becoming harder to manage" }),
  );
  await user.click(screen.getByRole("button", { name: "Continue" }));
};

describe("the optional both-people offer", () => {
  it("starts closed and does not show a question automatically", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: OFFER })).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("opens a real choose-first fieldset with the three approved radios", async () => {
    await openChooser();

    const group = screen.getByRole("group", { name: CHOOSE_FIRST });
    expect(group.tagName).toBe("FIELDSET");
    expect(within(group).getByText(CHOOSE_FIRST).tagName).toBe("LEGEND");
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
  });

  it("does not auto-advance when a first side is selected", async () => {
    const { user } = await openChooser();
    await user.click(screen.getByRole("radio", { name: "The other person's needs" }));

    expect(screen.getByRole("group", { name: CHOOSE_FIRST })).toBeTruthy();
    expect(screen.queryByText("What is difficult day to day?")).toBeNull();
  });

  it("announces a missing choose-first selection accessibly", async () => {
    const { user } = await openChooser();
    const continueButton = screen.getByRole("button", { name: "Continue" });
    await user.click(continueButton);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe(
      "Choose one option, or select ‘I’m not sure’.",
    );
    expect(screen.getByRole("group", { name: CHOOSE_FIRST })).toBeTruthy();
    expect(document.activeElement).toBe(
      within(screen.getByRole("group", { name: CHOOSE_FIRST })).getByText(
        CHOOSE_FIRST,
      ),
    );
  });

  it("supports keyboard selection without moving to the next screen", async () => {
    const { user } = await openChooser();
    const radio = screen.getByRole("radio", { name: "I'm not sure" });
    radio.focus();
    await user.keyboard(" ");

    expect((radio as HTMLInputElement).checked).toBe(true);
    expect(document.activeElement).toBe(radio);
    expect(screen.getByRole("group", { name: CHOOSE_FIRST })).toBeTruthy();
  });
});

describe("the two composed intakes", () => {
  it("can show the supported-person intake first", async () => {
    await chooseSupportedPersonFirst();

    const group = screen.getByRole("group", {
      name: "What is difficult day to day?",
    });
    expect(group).toBeTruthy();
    expect(document.activeElement).toBe(
      within(group).getByText("What is difficult day to day?"),
    );
  });

  it("can show the supporter intake first", async () => {
    const { user } = await openChooser();
    await user.click(
      screen.getByRole("radio", { name: "How supporting them affects me" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByRole("group", { name: "What help do you provide?" }),
    ).toBeTruthy();
  });

  it("shows exactly one question group at a time", async () => {
    const { user } = await chooseSupportedPersonFirst();

    expect(screen.getAllByRole("group")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  it("moves from the completed first intake to the second intake", async () => {
    const { user } = await chooseSupportedPersonFirst();
    await completeSupportedPerson(user);

    const group = screen.getByRole("group", { name: "What help do you provide?" });
    expect(group).toBeTruthy();
    expect(document.activeElement).toBe(
      within(group).getByText("What help do you provide?"),
    );
  });

  it("Back preserves first-side answers", async () => {
    const { user } = await chooseSupportedPersonFirst();
    await user.click(screen.getByRole("checkbox", { name: "Washing or dressing" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(
      (screen.getByRole("checkbox", {
        name: "Washing or dressing",
      }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(document.activeElement).toBe(
      within(
        screen.getByRole("group", { name: "What is difficult day to day?" }),
      ).getByText("What is difficult day to day?"),
    );
  });
});

describe("the combined summary", () => {
  const reachSummary = async () => {
    const result = await chooseSupportedPersonFirst();
    await completeSupportedPerson(result.user);
    await completeSupporter(result.user);
    return result;
  };

  it("renders two distinct accessible summary regions", async () => {
    await reachSummary();

    const heading = screen.getByRole("heading", { name: "Your preparation summary" });
    expect(heading).toBeTruthy();
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(heading);
    expect(screen.getByRole("region", { name: "Support needed by Dad" })).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "How supporting Dad affects you" }),
    ).toBeTruthy();
  });

  it("shows each side's answers only in its own section", async () => {
    await reachSummary();

    const supported = within(
      screen.getByRole("region", { name: "Support needed by Dad" }),
    );
    const supporter = within(
      screen.getByRole("region", { name: "How supporting Dad affects you" }),
    );
    expect(supported.getByText("Every day")).toBeTruthy();
    expect(supported.queryByText("A few times a week")).toBeNull();
    expect(supporter.getByText("A few times a week")).toBeTruthy();
    expect(supporter.queryByText("Every day")).toBeNull();
  });

  it("shows all three exact boundary statements", async () => {
    await reachSummary();

    expect(
      screen.getByText(
        "These are two separate preparation summaries. AdminAvenger has not merged them into one assessment or decided what support either person should receive.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "AdminAvenger has not decided whether anyone has a formal caring role, whether anyone qualifies for support, or what any organisation will decide.",
      ),
    ).toBeTruthy();
    expect(screen.getByText(/support service in Wales/i)).toBeTruthy();
  });

  it("offers Back, Return and one copy-both action", async () => {
    await reachSummary();

    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Return to the original message" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy both summaries" })).toBeTruthy();
  });

  it("copies both visible summary sections together", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { user } = await reachSummary();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await user.click(screen.getByRole("button", { name: "Copy both summaries" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]?.[0] as string;
    expect(copied).toContain("Support needed by Dad");
    expect(copied).toContain("How supporting Dad affects you");
    expect(copied).toContain("These are two separate preparation summaries.");
  });

  it("returns only when explicitly asked", async () => {
    const { user, onReturnToOriginalMessage } = await reachSummary();
    expect(onReturnToOriginalMessage).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Return to the original message" }),
    );
    expect(onReturnToOriginalMessage).toHaveBeenCalledTimes(1);
  });

  it("renders no save, case, send, contact, referral, apply, claim or link", async () => {
    await reachSummary();

    for (const name of [
      /save/i,
      /case/i,
      /send/i,
      /contact/i,
      /referral/i,
      /apply/i,
      /claim/i,
    ]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.queryByRole("link")).toBeNull();
  });
});
