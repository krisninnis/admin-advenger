// Front-Door Intent Routing v1, UI wiring slice.
//
// The explicit security boundary.
//
// Before this module existed, security-shaped wording only stayed on the
// security route by accident: the known scam controls happen to contain words
// that the front-door classifier reads as document markers ("your", "account",
// "link"). That is a coincidence, not a guarantee. A scam message written
// without any of those words would have been diverted into a care, benefits,
// bereavement or general clarification question, and the person would have been
// asked "Who needs help?" instead of being warned.
//
// So the boundary is stated here, in one pure function, and it runs before
// front-door classification rather than alongside it.
//
// This module reads the existing safety policy and changes nothing about it.
// `shouldPrioritiseEmailSafety` and `assessEmailSafety` keep their current
// behaviour exactly; this is a new caller, not a new rule.

import { shouldPrioritiseEmailSafety } from "../suspiciousEmail";

/**
 * Does this input look like it is asking for credentials, money or an action
 * that a person should be warned about before anything else happens?
 *
 * Pure, deterministic and synchronous. No network, storage, clock or
 * randomness.
 *
 * The declared source type is deliberately not consulted. Someone pasting a
 * scam text message into the paste box has not told AdminAvenger it is an
 * email, and the warning must not depend on them doing so. The existing safety
 * assessor is therefore asked the question it already answers for email-shaped
 * text, and its own signal thresholds decide the outcome.
 */
export const isSecurityShapedInput = (text: string): boolean => {
  if (typeof text !== "string" || !text.trim()) {
    return false;
  }

  return shouldPrioritiseEmailSafety(text);
};
