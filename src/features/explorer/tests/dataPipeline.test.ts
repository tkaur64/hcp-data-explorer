import { describe, expect, test } from "@jest/globals";

import type { HcpRecord } from "../../../infrastructure/provided/data-generator";
import { auditRows, createHcpEntities } from "../../../domain/hcp";
import { buildAggregates } from "../utils/buildAggregates";
import {
  createRegionGroupRow,
  createTerritoryGroupRow,
  createTerritoryRowKey,
  isRegionGroupRow,
  isTerritoryGroupRow,
} from "../utils/displayRows";
import { buildGroupIndex } from "../utils/groupIndex";

describe("data pipeline", () => {
  test("audits duplicate and invalid source data", () => {
    const records: HcpRecord[] = [
      {
        id: "HCP-A",
        name: "Provider A",
        specialty: null,
        region: "Midwest",
        territory: "T1",
        calls: "10",
        trx: 0,
        nrx: 1,
      },
      {
        id: "HCP-A",
        name: "Provider B",
        specialty: "Oncology",
        region: "Midwest",
        territory: "T1",
        calls: 61,
        trx: 20,
        nrx: 2,
      },
      {
        id: "HCP-B",
        name: "Provider C",
        specialty: "Cardiology",
        region: "National",
        territory: "T1",
        calls: "invalid",
        trx: 10,
        nrx: 3,
      },
    ];

    expect(auditRows(records)).toEqual({
      totalRecords: 3,
      duplicateIdValues: 1,
      duplicateRows: 1,
      missingSpecialties: 1,
      callsStoredAsStrings: 2,
      invalidCalls: 1,
      callsAboveValidatorCap: 1,
      zeroTrx: 1,
    });
  });

  test("builds Region and composite Territory aggregates", () => {
    const entities = createHcpEntities([
      {
        id: "HCP-1",
        name: "Provider 1",
        specialty: "Oncology",
        region: "Midwest",
        territory: "T1",
        calls: 10,
        trx: 20,
        nrx: 2,
      },
      {
        id: "HCP-2",
        name: "Provider 2",
        specialty: "Cardiology",
        region: "Midwest",
        territory: "T1",
        calls: "5",
        trx: 10,
        nrx: 1,
      },
      {
        id: "HCP-3",
        name: "Provider 3",
        specialty: "Neurology",
        region: "National",
        territory: "T1",
        calls: 7,
        trx: 14,
        nrx: 3,
      },
    ]);

    const aggregates = buildAggregates(entities);

    expect(aggregates.regions.Midwest).toMatchObject({
      calls: 15,
      trx: 30,
      nrx: 3,
      hcpCount: 2,
    });

    expect(aggregates.regions.National).toMatchObject({
      calls: 7,
      trx: 14,
      nrx: 3,
      hcpCount: 1,
    });

    expect(
      aggregates.territories[createTerritoryRowKey("Midwest", "T1")],
    ).toMatchObject({
      calls: 15,
      hcpCount: 2,
    });

    expect(
      aggregates.territories[createTerritoryRowKey("National", "T1")],
    ).toMatchObject({
      calls: 7,
      hcpCount: 1,
    });
  });

  test("keeps repeated territory names separated by Region", () => {
    const entities = createHcpEntities([
      {
        id: "HCP-1",
        name: "Midwest Provider",
        specialty: "Oncology",
        region: "Midwest",
        territory: "T1",
        calls: 10,
        trx: 20,
        nrx: 2,
      },
      {
        id: "HCP-2",
        name: "National Provider",
        specialty: "Cardiology",
        region: "National",
        territory: "T1",
        calls: 5,
        trx: 10,
        nrx: 1,
      },
    ]);

    const index = buildGroupIndex(entities);

    expect(
      index.rowKeysByTerritory[createTerritoryRowKey("Midwest", "T1")],
    ).toEqual(["hcp:0"]);

    expect(
      index.rowKeysByTerritory[createTerritoryRowKey("National", "T1")],
    ).toEqual(["hcp:1"]);
  });

  test("creates identifiable Region and Territory display rows", () => {
    const regionRow = createRegionGroupRow("Midwest");

    const territoryRow = createTerritoryGroupRow("Midwest", "T1");

    expect(regionRow.rowKey).toBe("region:Midwest");

    expect(territoryRow.rowKey).toBe("territory:Midwest:T1");

    expect(isRegionGroupRow(regionRow)).toBe(true);

    expect(isTerritoryGroupRow(territoryRow)).toBe(true);
  });
});
