import { useCallback, useEffect, useRef } from "react";
import { driver } from "driver.js";
import { useTourStore } from "../stores/tourStore";
import { PAGE_TOUR_STEPS } from "../lib/pageTours";

type DriverInstance = ReturnType<typeof driver>;

export function usePageTour(pageName: string) {
  const driverRef = useRef<DriverInstance | null>(null);
  const {
    hasCompletedOnboarding,
    isActive,
    activePageTour,
    completedPageTours,
    startPageTour,
    endPageTour,
  } = useTourStore();

  const steps = PAGE_TOUR_STEPS[pageName];

  const runPageTour = useCallback(() => {
    if (!steps || steps.length === 0) return;

    // Destroy previous instance if any
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    startPageTour(pageName);

    // Delay to ensure page data has loaded and DOM is ready
    setTimeout(() => {
      const d = driver({
        showProgress: true,
        animate: true,
        overlayColor: "rgba(0,0,0,0.75)",
        stagePadding: 8,
        stageRadius: 10,
        popoverClass: "zm-tour-popover",
        onDestroyed: () => {
          endPageTour(pageName);
          driverRef.current = null;
        },
        steps,
      });
      driverRef.current = d;
      d.drive();
    }, 600);
  }, [pageName, steps, startPageTour, endPageTour]);

  // Auto-trigger on first visit (only after main onboarding is done)
  useEffect(() => {
    if (
      hasCompletedOnboarding &&
      !isActive &&
      !activePageTour &&
      !completedPageTours.has(pageName) &&
      steps &&
      steps.length > 0
    ) {
      const timer = setTimeout(runPageTour, 1200);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, isActive, activePageTour, completedPageTours, pageName, steps, runPageTour]);

  return { runPageTour };
}
