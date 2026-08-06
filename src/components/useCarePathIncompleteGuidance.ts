import { useCallback, useId, useState } from "react";

export type CarePathChoiceType = "checkbox" | "radio";

export const CARE_PATH_INCOMPLETE_GUIDANCE = {
  checkbox: "Choose at least one option, or select ‘I’m not sure’.",
  radio: "Choose one option, or select ‘I’m not sure’.",
} as const satisfies Record<CarePathChoiceType, string>;

type VisibleGuidance = {
  readonly stepKey: string;
  readonly choiceType: CarePathChoiceType;
};

export function useCarePathIncompleteGuidance(stepKey: string) {
  const baseId = useId();
  const [visibleGuidance, setVisibleGuidance] =
    useState<VisibleGuidance | null>(null);
  const guidance =
    visibleGuidance?.stepKey === stepKey
      ? CARE_PATH_INCOMPLETE_GUIDANCE[visibleGuidance.choiceType]
      : undefined;
  const safeStepKey = stepKey.replace(/[^a-z0-9_-]/gi, "-");
  const guidanceId = `${baseId}-${safeStepKey}-incomplete-guidance`;

  const showGuidance = useCallback(
    (choiceType: CarePathChoiceType) => {
      setVisibleGuidance({ stepKey, choiceType });
    },
    [stepKey],
  );

  const clearGuidance = useCallback(() => {
    setVisibleGuidance(null);
  }, []);

  return {
    guidance,
    guidanceId,
    showGuidance,
    clearGuidance,
  } as const;
}
