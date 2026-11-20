import process from "node:process";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4381/Bookverse/",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4381",
    url: "http://127.0.0.1:4381/Bookverse/",
    reuseExistingServer: !process.env.CI,
  },
});
