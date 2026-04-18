import { useEffect, useRef, useState, type DependencyList } from "react";
import { animate, stagger, type AnimationParams, type TargetsParam } from "animejs";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

export function useAnimeIn<T extends HTMLElement>(
  params: AnimationParams,
  deps: DependencyList = [],
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const anim = animate(el as unknown as TargetsParam, params);
    return () => {
      anim.pause?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function animateInOnce(
  target: TargetsParam,
  params: AnimationParams,
): (() => void) | void {
  if (prefersReducedMotion()) return;
  const anim = animate(target, params);
  return () => {
    anim.pause?.();
  };
}

export { animate, stagger };
