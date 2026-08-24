import { describe, expect, test } from "@jest/globals";

import type { HcpRecord } from "../infrastructure/provided/data-generator";
import { calculateCpi, createHcpEntities, toNumericCalls } from "./hcp";

describe("HCP domain helpers", () => {
  test("normalizes numeric Calls values and numeric strings", () => {
    expect(toNumericCalls(12)).toBe(12);
    expect(toNumericCalls("12")).toBe(12);
    expect(toNumericCalls(" 12 ")).toBe(12);
  });

  test("returns null for blank and invalid Calls values", () => {
    expect(toNumericCalls("")).toBeNull();
    expect(toNumericCalls("   ")).toBeNull();
    expect(toNumericCalls("invalid")).toBeNull();
  });

  test("calculates CPI as Calls divided by TRx", () => {
    expect(calculateCpi(20, 40)).toBe(50);
    expect(calculateCpi("15", 60)).toBe(25);
  });

  test("returns null CPI when TRx is zero", () => {
    expect(calculateCpi(20, 0)).toBeNull();
  });

  test("creates stable internal keys for duplicate HCP IDs", () => {
    const records: HcpRecord[] = [
      {
        id: "HCP-DUPLICATE",
        name: "First Provider",
        specialty: "Oncology",
        region: "Midwest",
        territory: "T1",
        calls: 10,
        trx: 20,
        nrx: 5,
      },
      {
        id: "HCP-DUPLICATE",
        name: "Second Provider",
        specialty: "Cardiology",
        region: "Midwest",
        territory: "T1",
        calls: 12,
        trx: 22,
        nrx: 6,
      },
    ];

    const entities = createHcpEntities(records);

    expect(entities[0].rowKey).toBe("hcp:0");
    expect(entities[1].rowKey).toBe("hcp:1");
    expect(entities[0].id).toBe(entities[1].id);
  });
});
