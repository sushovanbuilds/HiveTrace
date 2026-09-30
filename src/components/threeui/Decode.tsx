"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import {
  startArticleHeadingDecode,
  type ArticleHeadingDecodeOptions,
} from "./articleHeadingDecode";

/**
 * HiveTrace-tuned timing for the decode reveal. The authored mechanism and
 * its own defaults live untouched in `./articleHeadingDecode.ts`.
 */
const DECODE_DEFAULTS = {
  duration: 560,
  stagger: 140,
  scrambleLength: 10,
  preserveChance: 0.3,
  tailChance: 0.18,
} as const;

type DecodeProps = Partial<ArticleHeadingDecodeOptions> & {
  /** Element that carries the animated text. Defaults to "span". */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * HIVETRACE wrapper around ThreeUI's authored article-heading decode
 * (`TextAnimationCollection`, `article-headings` variant).
 *
 * The authored interaction logic is preserved verbatim — this wrapper only
 * composes it with HiveTrace content and typography:
 * - the decode runs over `[data-article-heading]` inside a layout-neutral
 *   (`display: contents`) root, so surrounding layout is unaffected;
 * - color, type scale and placement come from the caller's `className`
 *   (HiveTrace design tokens), never from edited canonical internals;
 * - reduced-motion is honored by the authored code itself (it leaves the
 *   final text untouched when `prefers-reduced-motion` is set);
 * - server render emits the final text, so the content is readable with
 *   JavaScript disabled and indexable.
 *
 * The authored `ArticleHeadings` component shell is intentionally not used:
 * its markup carries ThreeUI's own demo editorial content ("FIELD NOTES",
 * "Context Is Infrastructure…"), which would violate the HIVETRACE branding
 * rule. Only the mechanism is adopted, via composition.
 */
export function Decode({
  as: Tag = "span",
  className,
  style,
  children,
  ...tuning
}: DecodeProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const { duration, stagger, scrambleLength, preserveChance, tailChance } = {
    ...DECODE_DEFAULTS,
    ...tuning,
  };

  // Binding mirrors the authored ArticleHeadings component exactly, except
  // the one-shot reveal is deferred until the heading scrolls into view —
  // below-fold decodes must not fire unseen on mount. (The wrapper root is
  // `display: contents` and has no box of its own, so the inner heading —
  // the element that actually carries `[data-article-heading]` — is observed.)
  useEffect(() => {
    const root = rootRef.current;
    const target = root?.querySelector("[data-article-heading]") ?? root;
    if (!root || !target) return undefined;
    const opts = {
      duration,
      stagger,
      scrambleLength,
      preserveChance,
      tailChance,
    };
    const start = () => startArticleHeadingDecode(root, opts);
    if (typeof IntersectionObserver === "undefined") return start();
    let started = false;
    let stopDecode: (() => void) | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((e) => e.isIntersecting)) return;
        started = true;
        io.disconnect();
        stopDecode = start();
      },
      { threshold: 0.35 }
    );
    io.observe(target);
    // Unmount must also stop the rAF loop the decode starts, otherwise the
    // reveal keeps writing to a detached heading after navigation.
    return () => {
      io.disconnect();
      stopDecode?.();
    };
  }, [duration, preserveChance, scrambleLength, stagger, tailChance]);

  return (
    <span ref={rootRef} className="contents">
      <Tag data-article-heading className={className} style={style}>
        {children}
      </Tag>
    </span>
  );
}
