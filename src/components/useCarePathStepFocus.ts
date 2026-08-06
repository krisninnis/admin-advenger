import { useCallback, useEffect, useRef } from "react";

type FocusTargetRef = (element: HTMLElement | null) => void;

export function useCarePathStepFocus(stepKey: string): FocusTargetRef {
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const previousStepKeyRef = useRef(stepKey);

  useEffect(() => {
    const stepChanged = previousStepKeyRef.current !== stepKey;
    previousStepKeyRef.current = stepKey;

    if (stepChanged) {
      focusTargetRef.current?.focus();
    }
  }, [stepKey]);

  return useCallback((element: HTMLElement | null) => {
    focusTargetRef.current = element;
  }, []);
}
