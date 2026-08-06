// Front-Door Orientation Result v1.
//
// Approved specification: docs/specs/active/front-door-intent-routing-v1.md
// Section 15, reached through the Section 10.3 transition
// `person_target_confirmed` to `orientation_selected`.
//
// The one page shown immediately after the person answers the confirmation
// question. It exists because the alternative was worse: before the front door,
// a sentence about somebody's father reached a document result titled "No
// obvious saving or action found", with the next step "Identify the sender,
// date, reference, and deadline". That is what this page replaces.
//
// It says four things and stops:
//
//   1. what this may be about, as an interpretation and never a finding;
//   2. one useful next step;
//   3. what to gather, three bullets at most;
//   4. what AdminAvenger cannot decide.
//
// What it deliberately does not do is longer than what it does. No document
// result, no evidence pack, no preparation score, no case, no money, no
// timeline, no adviser pack, no saving, no referral, no specialist route, no
// automatic navigation. It does not open Carer Support, Benefits or Estate
// Administration, because none of those is approved and none of those exists.
//
// Two writing rules run through every line. AdminAvenger says what it thinks it
// is seeing, never what is true: "this sounds like you may be", never "you are
// entitled". And it never applies a label to a person. Someone who says they
// look after their neighbour every day is not called a carer here, because
// being called something you have not called yourself is its own small harm,
// and because whether that label carries rights is not AdminAvenger's to say.

import {
  confirmationShapeOf,
  frontDoorPersonLabelOf,
  type FrontDoorConfirmationShape,
} from "./frontDoorConfirmationShape";
// Type-only, so this leaves no runtime edge back to the route view.
import type { FrontDoorChoiceId } from "./frontDoorRouteView";
import type { FrontDoorIntentClassification } from "./types";
import { ORDINARY_MESSAGE_CHECK_LABEL } from "../ordinaryMessageCheck";

export type FrontDoorOrientationView = {
  readonly kind: "orientation";
  readonly heading: string;
  /** What this may be about. An interpretation, never a finding. */
  readonly interpretation: string;
  readonly nextStepHeading: string;
  /** One action, in one sentence. */
  readonly nextStep: string;
  readonly gatherHeading: string;
  /** Three bullets at most. A longer list is a task, not a next step. */
  readonly gather: readonly string[];
  readonly cannotDecideHeading: string;
  readonly cannotDecide: readonly string[];
  readonly cannotContactStatement: string;
  /** The person's own words, unaltered. */
  readonly originalInput: string;
  /**
   * The person's own word for who this is about, where one was given.
   *
   * Verbatim. "Dad" is never normalised to "father".
   */
  readonly personLabel: string | undefined;
  /**
   * True only where this page is about help for one other person, and the
   * person said so by choosing it.
   *
   * This is what gates the optional needs intake. It is deliberately narrow:
   * somebody who chose "Me because I support them", "Both of us" or "I'm not
   * sure" has not asked for help for one other person, and a page built to
   * describe one person's day would be the wrong page for them.
   */
  readonly aboutOneOtherPerson: boolean;
  /**
   * True only for a care orientation focused on the person providing support,
   * where the source wording identifies the other person.
   */
  readonly aboutSupporterWithNamedPerson: boolean;
  /**
   * True only for a care orientation where the person chose both sides and
   * named the other person.
   */
  readonly aboutBothPeopleWithNamedPerson: boolean;
  readonly backLabel: string;
  readonly ordinaryCheckLabel: string;
  readonly backAvailable: true;
  readonly ordinaryCheckAvailable: true;
  /** Typed as the literal `false`, so the prohibitions are unrepresentable. */
  readonly targetConfirmed: false;
  readonly specialistRouteOpened: false;
  readonly caseCreated: false;
  readonly estateRouteOpened: false;
};

const HEADINGS = {
  heading: "What this may be about",
  nextStepHeading: "A useful next step",
  gatherHeading: "What to gather",
  cannotDecideHeading: "What AdminAvenger cannot decide",
} as const;

const BUTTONS = {
  backLabel: "Back",
  ordinaryCheckLabel: ORDINARY_MESSAGE_CHECK_LABEL,
} as const;

const PROHIBITIONS = {
  backAvailable: true,
  ordinaryCheckAvailable: true,
  targetConfirmed: false,
  specialistRouteOpened: false,
  caseCreated: false,
  estateRouteOpened: false,
} as const;

/**
 * The limits, stated the same way on every page.
 *
 * They do not soften when the situation looks simple. A page that lists its
 * limits only when it is unsure teaches people that the absence of a warning
 * means certainty.
 */
const CANNOT_DECIDE: readonly string[] = [
  "Whether anyone qualifies for support",
  "Whether anyone meets legal criteria",
  "What a council or organisation will decide",
];

const CANNOT_CONTACT =
  "AdminAvenger cannot contact a council, an organisation or a service for you.";

/** What to call the other person when nobody was named. */
const SOMEONE = "the person you mentioned";

/** "your sister", or a neutral stand-in when no label was given. */
const theirLabel = (label: string | undefined): string =>
  label ? `your ${label}` : SOMEONE;

type OrientationBody = {
  readonly interpretation: string;
  readonly nextStep: string;
  readonly gather: readonly string[];
};

// --- Care -------------------------------------------------------------------

const careBody = (
  choiceId: FrontDoorChoiceId,
  label: string | undefined,
): OrientationBody => {
  const them = theirLabel(label);

  if (choiceId === "self_supporting") {
    // The focus moves to the person who typed it. It stays on what they are
    // doing and how it is going, and never on what that makes them.
    return {
      interpretation:
        "This sounds like you may be looking for support for yourself, because of the help you give someone else.",
      nextStep:
        "Write down what you do in a normal week, and where it is getting harder.",
      gather: [
        "What you help with",
        "How often you help",
        "What has changed recently",
      ],
    };
  }

  if (choiceId === "both") {
    // Two people, two positions. They are described in the same breath and
    // still kept apart, because merging them is how one of them disappears.
    return {
      interpretation: `This sounds like there may be two things here, kept separate: what ${them} might need, and what you might need yourself.`,
      nextStep:
        "Write the two down separately, so neither one gets lost behind the other.",
      gather: [
        `What ${them} finds difficult`,
        "What you do to help",
        "What has changed recently",
      ],
    };
  }

  if (choiceId === "unsure") {
    return {
      interpretation:
        "You are not sure yet, and that is a reasonable place to start. Nothing here has been decided.",
      nextStep:
        "Write down what has been happening, in the order it happened.",
      gather: [
        "What has changed recently",
        "Who is involved",
        "Anything you have been sent about it",
      ],
    };
  }

  return {
    interpretation: `This sounds like you may be trying to understand what support ${them} might need.`,
    nextStep: `Write down what has been changing for ${them}, in your own words.`,
    gather: [
      `What ${them} finds difficult`,
      "How often it happens",
      "What has changed recently",
    ],
  };
};

// --- Benefits ---------------------------------------------------------------
//
// "Help with money" is used throughout rather than a benefit name. Repeating
// the benefit somebody asked about reads as confirmation that it is the right
// one, which is a decision this page must not make.

const benefitsBody = (
  choiceId: FrontDoorChoiceId,
  label: string | undefined,
): OrientationBody => {
  const them = theirLabel(label);

  if (choiceId === "self") {
    return {
      interpretation:
        "This sounds like you may be trying to find out whether there is help with money you could ask about.",
      nextStep: "Write down what you receive now, and what has changed.",
      gather: [
        "What you already receive",
        "What has changed recently",
        "Anything you have been sent about it",
      ],
    };
  }

  if (choiceId === "both") {
    // Two people, two different questions, and only one of them is about money.
    //
    // "Mum gets PIP and I help every day" says nothing about the person who
    // typed it needing financial help. Turning their side into a money question
    // because they support somebody would be AdminAvenger inventing a need, and
    // it is a short step from there to implying a benefit they never asked
    // about. So their side stays where the source put it: what they do, and
    // what doing it costs them in health, work and daily life.
    //
    // The other person's side stays about support and what has changed. That
    // somebody already receives a benefit is not treated as evidence that they
    // qualify for anything else.
    return {
      interpretation: `There may be two separate things to look at: what support ${them} may need, and what support you may need because of the help you give. These are considered separately.`,
      nextStep: `Write the two down separately: what has been changing for ${them}, and what you are doing to help.`,
      gather: [
        `What ${them} finds difficult, and what has changed`,
        "What you do to help, and how often",
        "How helping is affecting your own health, work or daily life",
      ],
    };
  }

  if (choiceId === "unsure") {
    return {
      interpretation:
        "You are not sure yet whose money this is about, and that is fine. Nothing here has been decided.",
      nextStep: "Write down who receives what at the moment.",
      gather: [
        "Who receives what now",
        "What has changed recently",
        "Anything you have been sent about it",
      ],
    };
  }

  return {
    interpretation: `This sounds like you may be trying to find out whether there is help with money ${them} could ask about.`,
    nextStep: `Write down what ${them} receives now, and what has changed.`,
    gather: [
      `What ${them} already receives`,
      "What has changed recently",
      "Anything they have been sent about it",
    ],
  };
};

// --- Bereavement ------------------------------------------------------------
//
// Short, on purpose. Somebody has died and this page is not the place for a
// guide. It acknowledges what was said, offers one small thing, and stops. No
// deadline is mentioned and nothing is described as urgent.

const bereavementBody = (choiceId: FrontDoorChoiceId): OrientationBody => {
  if (choiceId === "understand_document") {
    return {
      interpretation:
        "Someone has died, and this sounds like you may have been sent something you would like explained.",
      nextStep:
        "Keep it to hand. When you are ready, paste or photograph it and AdminAvenger will go through it with you.",
      gather: ["The letter or form itself", "Who sent it", "Any date on it"],
    };
  }

  if (choiceId === "unsure") {
    return {
      interpretation:
        "Someone has died, and you are not sure what happens next. That is a normal place to be.",
      nextStep: "Keep anything that arrives in one place, and leave the rest for now.",
      gather: ["Anything that has arrived", "Anything anyone has asked you for"],
    };
  }

  return {
    interpretation:
      "Someone has died, and this sounds like you may be working out what needs sorting out.",
    nextStep: "Write down what has arrived so far, and what people have asked you for.",
    gather: [
      "Anything that has arrived",
      "Anything anyone has asked you for",
      "Any dates you have been given",
    ],
  };
};

// --- General ----------------------------------------------------------------

const generalBody = (
  choiceId: FrontDoorChoiceId,
  label: string | undefined,
): OrientationBody => {
  if (choiceId === "about_document") {
    return {
      interpretation:
        "This sounds like it may be about something you have been sent.",
      nextStep:
        "Paste or photograph it and AdminAvenger will go through it with you.",
      gather: ["The letter, bill or message itself", "Who sent it", "Any date on it"],
    };
  }

  if (choiceId === "about_care") {
    return careBody("other_person", label);
  }

  if (choiceId === "about_money") {
    return benefitsBody("unsure", label);
  }

  return {
    interpretation:
      "You are not sure yet what this is, and that is a reasonable place to start. Nothing here has been decided.",
    nextStep: "Write down what has been happening, in the order it happened.",
    gather: [
      "What has changed recently",
      "Who is involved",
      "Anything you have been sent about it",
    ],
  };
};

const bodyFor = (
  shape: FrontDoorConfirmationShape,
  choiceId: FrontDoorChoiceId,
  label: string | undefined,
): OrientationBody => {
  switch (shape) {
    case "bereavement":
      return bereavementBody(choiceId);
    case "benefits":
      return benefitsBody(choiceId, label);
    case "care":
      return careBody(choiceId, label);
    default:
      return generalBody(choiceId, label);
  }
};

/**
 * Build the orientation page for one answer to one question.
 *
 * Pure, deterministic and synchronous. No network, storage, clock or
 * randomness. It reads a classification and a choice and returns words.
 *
 * The urgent choice never arrives here. Urgency is resolved before any routing
 * question and is answered by the existing urgent page, which this slice does
 * not touch.
 */
export const deriveFrontDoorOrientationView = (
  classification: FrontDoorIntentClassification,
  choiceId: FrontDoorChoiceId,
  originalInput: string,
): FrontDoorOrientationView => {
  const shape = confirmationShapeOf(classification);
  const label = frontDoorPersonLabelOf(classification, originalInput);
  const body = bodyFor(shape, choiceId, label);

  // Three conditions, all required. Care-shaped, because benefits, bereavement
  // and general orientations are a different question. The person chose the
  // other person, because nobody else has asked for help for one other person.
  // And the source gave a word for who that person is.
  //
  // The last one is easy to miss. A care signal can fire with nobody named at
  // all: "I look after him every day" describes a caring role and mentions no
  // relationship word. Offering to prepare a picture of somebody's day when
  // there is no name to put at the top of it is an offer about nobody.
  const aboutOneOtherPerson =
    shape === "care" && choiceId === "other_person" && label !== undefined;
  const aboutSupporterWithNamedPerson =
    shape === "care" && choiceId === "self_supporting" && label !== undefined;
  const aboutBothPeopleWithNamedPerson =
    shape === "care" && choiceId === "both" && label !== undefined;

  return {
    ...PROHIBITIONS,
    ...HEADINGS,
    ...BUTTONS,
    kind: "orientation",
    interpretation: body.interpretation,
    nextStep: body.nextStep,
    gather: body.gather,
    cannotDecide: CANNOT_DECIDE,
    cannotContactStatement: CANNOT_CONTACT,
    originalInput,
    personLabel: label,
    aboutOneOtherPerson,
    aboutSupporterWithNamedPerson,
    aboutBothPeopleWithNamedPerson,
  };
};
