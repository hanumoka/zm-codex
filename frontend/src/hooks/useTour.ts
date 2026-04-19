import { useCallback, useRef } from "react";
import { useTourStore } from "../stores/tourStore";
import { createTourDriver } from "../lib/tour";
import type { driver } from "driver.js";

type DriverInstance = ReturnType<typeof driver>;

export function useTour() {
  const driverRef = useRef<DriverInstance | null>(null);
  const { startTour, markCompleted } = useTourStore();

  const startTourFlow = useCallback(() => {
    // Destroy previous instance if any
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    startTour();

    // Small delay to ensure DOM is ready after state update
    setTimeout(() => {
      const d = createTourDriver(() => {
        markCompleted();
        driverRef.current = null;
      });
      driverRef.current = d;
      d.drive();
    }, 500);
  }, [startTour, markCompleted]);

  return { startTourFlow };
}
