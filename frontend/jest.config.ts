import type { Config } from "jest";
import nextJest from "next/jest.js";

// next/jest wires up the SWC transform, tsconfig path aliases, and mocks for
// CSS, images, and next/font, so none of that needs configuring by hand.
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,tsx}",
  ],
};

// Exported as a call so Jest awaits the async Next.js config load.
export default createJestConfig(config);
