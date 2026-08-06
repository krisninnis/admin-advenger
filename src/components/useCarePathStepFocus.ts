import { useCallback, useEffect, useRef } from "react";

type FocusTargetRef = (element: HTMLElement | null) => void;

type CarePathStepFocus = {
  readonly focusTargetRef: FocusTargetRef;
  readonly focusCurrentStep: () => void;
};

export function useCarePathStepFocus(stepKey: string): CarePathStepFocus {
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const previousStepKeyRef = useRef(stepKey);

  useEffect(() => {
    const stepChanged = previousStepKeyRef.current !== stepKey;
    previousStepKeyRef.current = stepKey;

    if (stepChanged) {
      focusTargetRef.current?.focus();
    }
  }, [stepKey]);

  const setFocusTarget = useCallback((element: HTMLElement | null) => {
    focusTargetRef.current = element;
  }, []);

  const focusCurrentStep = useCallback(() => {
    focusTargetRef.current?.focus();
  }, []);

  return { focusTargetRef: setFocusTarget, focusCurrentStep };
}
