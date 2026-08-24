import { describe, expect, test } from "@jest/globals";

import type { HcpEntity } from "../../../domain/hcp";
import { compareHcpRecords } from "../utils/sorting";
import type { CallsEditState, SortState } from "../state/explorerTypes";

function createEntity(
  sourceIndex: number,
  overrides: Partial<HcpEntity> = {},
): HcpEntity {
  return {
    id: `HCP-${sourceIndex}`,
    name: `Provider ${sourceIndex}`,
    specialty: "Oncology",
    region: "Midwest",
    territory: "T1",
    calls: 10,
    trx: 20,
    nrx: 5,
    ...overrides,
    rowType: "hcp",
    rowKey: `hcp:${sourceIndex}`,
    sourceIndex,
  };
}

function sortRecords(
  records: HcpEntity[],
  sort: SortState,
  edits: Partial<Record<HcpEntity["rowKey"], CallsEditState>> = {},
): HcpEntity[] {
  return [...records].sort((first, second) =>
    compareHcpRecords(first, second, sort, edits),
  );
}

describe("HCP sorting", () => {
  test("sorts numeric Calls strings numerically", () => {
    const records = [
      createEntity(0, { calls: "30" }),
      createEntity(1, { calls: "2" }),
      createEntity(2, { calls: 10 }),
    ];

    const result = sortRecords(records, {
      column: "calls",
      direction: "asc",
    });

    expect(result.map((row) => row.calls)).toEqual(["2", 10, "30"]);
  });

  test("sorts Calls descending numerically", () => {
    const records = [
      createEntity(0, { calls: "30" }),
      createEntity(1, { calls: "2" }),
      createEntity(2, { calls: 10 }),
    ];

    const result = sortRecords(records, {
      column: "calls",
      direction: "desc",
    });

    expect(result.map((row) => row.calls)).toEqual(["30", 10, "2"]);
  });

  test("keeps missing specialties last in both directions", () => {
    const records = [
      createEntity(0, { specialty: null }),
      createEntity(1, {
        specialty: "Oncology",
      }),
      createEntity(2, {
        specialty: "Cardiology",
      }),
    ];

    const ascending = sortRecords(records, {
      column: "specialty",
      direction: "asc",
    });

    const descending = sortRecords(records, {
      column: "specialty",
      direction: "desc",
    });

    expect(ascending.map((row) => row.specialty)).toEqual([
      "Cardiology",
      "Oncology",
      null,
    ]);

    expect(descending.map((row) => row.specialty)).toEqual([
      "Oncology",
      "Cardiology",
      null,
    ]);
  });

  test("uses source order as the deterministic tie-breaker", () => {
    const later = createEntity(9, {
      id: "HCP-DUPLICATE",
    });

    const earlier = createEntity(2, {
      id: "HCP-DUPLICATE",
    });

    const result = sortRecords([later, earlier], {
      column: "id",
      direction: "asc",
    });

    expect(result.map((row) => row.sourceIndex)).toEqual([2, 9]);
  });

  test("sorts using accepted Calls edit overlays", () => {
    const first = createEntity(0, {
      calls: 50,
    });

    const second = createEntity(1, {
      calls: 10,
    });

    const edits = {
      [first.rowKey]: {
        acceptedValue: 5,
        status: "saved",
      },
    } satisfies Partial<Record<HcpEntity["rowKey"], CallsEditState>>;

    const result = sortRecords(
      [first, second],
      {
        column: "calls",
        direction: "asc",
      },
      edits,
    );

    expect(result.map((row) => row.rowKey)).toEqual([
      first.rowKey,
      second.rowKey,
    ]);
  });
});
