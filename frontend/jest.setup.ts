import "@testing-library/jest-dom";

// jsdom has no ResizeObserver, and Radix measures with it (e.g. Slider).
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
