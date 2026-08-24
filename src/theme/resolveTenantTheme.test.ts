import { describe, expect, test } from "@jest/globals";

import { DEFAULT_THEME } from "../infrastructure/provided/theme-config";
import { resolveTenantTheme } from "./resolveTenantTheme";

describe("resolveTenantTheme", () => {
  test("returns the complete default theme for an unknown tenant", () => {
    expect(resolveTenantTheme("unknown")).toEqual(DEFAULT_THEME);
  });

  test("returns the valid Aurelia configuration", () => {
    const theme = resolveTenantTheme("aurelia");

    expect(theme.appName).toBe("Aurelia Field IQ");
    expect(theme.primary).toBe("#0B5FA5");
    expect(theme.radius).toBe(8);
  });

  test("falls back per field for invalid Meridian values", () => {
    const theme = resolveTenantTheme("meridian");

    // Valid tenant fields survive.
    expect(theme.appName).toBe("Meridian 360");
    expect(theme.surface).toBe("#F4F4F4");
    expect(theme.background).toBe("#FFFFFF");

    // Invalid or missing fields fall back independently.
    expect(theme.primary).toBe(DEFAULT_THEME.primary);

    expect(theme.onPrimary).toBe(DEFAULT_THEME.onPrimary);

    expect(theme.text).toBe(DEFAULT_THEME.text);
    expect(theme.radius).toBe(DEFAULT_THEME.radius);
  });
});
