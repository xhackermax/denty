if (process.env.NODE_ENV === "production") {
  throw new Error(
    "Denty tests cannot run with NODE_ENV=production. " +
      "Use the pipeline test stage, which forces NODE_ENV=test.",
  );
}

import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
