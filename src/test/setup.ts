import "@testing-library/jest-dom/vitest";

/**
 * Node 25+ ships an experimental global `localStorage` accessor that returns
 * `undefined` unless a storage file is configured. Its presence stops Vitest's
 * jsdom environment from copying jsdom's own Storage onto the global scope, so
 * tests would see no storage at all. Point the globals back at jsdom's real
 * implementation so no shell flag is needed on any supported runtime.
 */
declare const jsdom: { window: Window & typeof globalThis } | undefined;

if (typeof jsdom !== "undefined") {
  for (const key of ["localStorage", "sessionStorage"] as const) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      get: () => jsdom.window[key],
    });
  }
  Object.defineProperty(globalThis, "Storage", {
    configurable: true,
    writable: true,
    value: jsdom.window.Storage,
  });
}
