/**
 * Centralized Framer Motion variant definitions using M3 motion token values.
 *
 * Easing curves correspond to Tailwind tokens in tailwind.config.js:
 *   [0.05, 0.7, 0.1, 1.0]  → emphasized-decelerate (enter animations)
 *   [0.3, 0, 1, 1]          → emphasized-accelerate (exit animations)
 *   [0.2, 0, 0, 1]          → standard (utility/backdrop)
 *
 * Durations are in seconds (Framer Motion convention).
 * M3 duration token equivalents are noted in comments.
 */

import type { Variants } from "framer-motion";

// M3 easing curves
const EMPHASIZED_DECELERATE = [0.05, 0.7, 0.1, 1.0] as const;
const EMPHASIZED_ACCELERATE = [0.3, 0, 1, 1] as const;
const STANDARD = [0.2, 0, 0, 1] as const;

/**
 * Page-level enter/exit transition.
 * Enter: slide up 16px + fade, emphasized-decelerate, 400ms (medium4)
 * Exit:  fade only, emphasized-accelerate, 200ms (short4)
 */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EMPHASIZED_DECELERATE },
  },
  exit: {
    opacity: 0,
    y: 0,
    transition: { duration: 0.2, ease: EMPHASIZED_ACCELERATE },
  },
};

/**
 * Staggered list container. Use with listItemVariants on children.
 * staggerChildren: 40ms between items.
 */
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: EMPHASIZED_ACCELERATE },
  },
};

/**
 * Per-item variant for staggered lists.
 * Enter: slide up 8px + fade, emphasized-decelerate, 300ms (medium2)
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EMPHASIZED_DECELERATE },
  },
};

/**
 * Surface (card/modal) emergence.
 * Enter: scale from 0.95 + fade, emphasized-decelerate, 300ms (medium2)
 * Exit:  fade only, emphasized-accelerate, 200ms (short4)
 */
export const surfaceVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: EMPHASIZED_DECELERATE },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: EMPHASIZED_ACCELERATE },
  },
};

/**
 * Navigation drawer slide-in (x-axis).
 * Enter: x -280 → 0, emphasized-decelerate, 350ms (medium3)
 * Exit:  x 0 → -280, emphasized-accelerate, 300ms (medium2)
 */
export const drawerVariants: Variants = {
  hidden: { x: -280 },
  visible: {
    x: 0,
    transition: { duration: 0.35, ease: EMPHASIZED_DECELERATE },
  },
  exit: {
    x: -280,
    transition: { duration: 0.3, ease: EMPHASIZED_ACCELERATE },
  },
};

/**
 * Scrim/backdrop fade.
 * Enter: opacity 0 → 1, standard, 200ms (short4)
 * Exit:  opacity 1 → 0, standard, 200ms (short4)
 */
/**
 * Accordion expand/collapse (e.g., category list in nav drawer).
 * Enter: height 0 → auto + fade, emphasized-decelerate, 250ms (medium1)
 * Exit:  height auto → 0 + fade, emphasized-accelerate, 200ms (short4)
 */
export const accordionVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.25, ease: EMPHASIZED_DECELERATE },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: EMPHASIZED_ACCELERATE },
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: STANDARD },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: STANDARD },
  },
};
