import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import os from "os";
import path from "path";

import { configureTailwindConfig } from "./init";

// A realistic NativeWind config that already carries the core color tokens and
// the chart entries, plus radius/keyframes/plugin — but predates sidebar tokens.
const CORE_CONFIG_WITHOUT_SIDEBAR = `const { hairlineWidth } = require("nativewind/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "chart-1": "hsl(var(--chart-1))",
        "chart-2": "hsl(var(--chart-2))",
        "chart-3": "hsl(var(--chart-3))",
        "chart-4": "hsl(var(--chart-4))",
        "chart-5": "hsl(var(--chart-5))",
      },
      borderRadius: {
        lg: "min(var(--radius), 20px)",
        md: "calc(var(--radius) * 0.8)",
        sm: "calc(var(--radius) * 0.6)",
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
`;

describe("configureTailwindConfig sidebar backfill", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "lovda-tw-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("backfills sidebar mappings into an existing colors block that has core tokens but no sidebar", async () => {
    const cfgPath = path.join(tempDir, "tailwind.config.js");
    await writeFile(cfgPath, CORE_CONFIG_WITHOUT_SIDEBAR, "utf8");

    configureTailwindConfig(tempDir, "/does-not-exist/tailwind.config.js");

    const out = await readFile(cfgPath, "utf8");
    expect(out).toContain("sidebar: {");
    expect(out).toContain('DEFAULT: "hsl(var(--sidebar))"');
    expect(out).toContain('foreground: "hsl(var(--sidebar-foreground))"');
    expect(out).toContain('primary: "hsl(var(--sidebar-primary))"');
    expect(out).toContain('"primary-foreground": "hsl(var(--sidebar-primary-foreground))"');
    expect(out).toContain('accent: "hsl(var(--sidebar-accent))"');
    expect(out).toContain('"accent-foreground": "hsl(var(--sidebar-accent-foreground))"');
    expect(out).toContain('border: "hsl(var(--sidebar-border))"');
    expect(out).toContain('ring: "hsl(var(--sidebar-ring))"');
    // Sidebar follows the chart entries so the block stays ordered.
    expect(out.indexOf('"chart-5"')).toBeLessThan(out.indexOf("sidebar: {"));
  });

  it("is idempotent — a second run does not duplicate the sidebar block", async () => {
    const cfgPath = path.join(tempDir, "tailwind.config.js");
    await writeFile(cfgPath, CORE_CONFIG_WITHOUT_SIDEBAR, "utf8");

    configureTailwindConfig(tempDir, "/does-not-exist/tailwind.config.js");
    configureTailwindConfig(tempDir, "/does-not-exist/tailwind.config.js");

    const out = await readFile(cfgPath, "utf8");
    expect(out.match(/sidebar: \{/g)).toHaveLength(1);
  });

  it("creates a full colors block that already includes sidebar when none exists", async () => {
    const cfgPath = path.join(tempDir, "tailwind.config.js");
    await writeFile(
      cfgPath,
      `const { hairlineWidth } = require("nativewind/theme");\nmodule.exports = { darkMode: "class", theme: { extend: {} }, plugins: [require("tailwindcss-animate")] };\n`,
      "utf8",
    );

    configureTailwindConfig(tempDir, "/does-not-exist/tailwind.config.js");

    const out = await readFile(cfgPath, "utf8");
    expect(out).toContain('background: "hsl(var(--background))"');
    expect(out).toContain("sidebar: {");
    expect(out).toContain('ring: "hsl(var(--sidebar-ring))"');
  });
});
