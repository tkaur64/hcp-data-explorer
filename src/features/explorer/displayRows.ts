import type { HcpEntity, HcpRowKey } from "../../domain/hcp";

export type RegionRowKey = `region:${string}`;

export type TerritoryRowKey = `territory:${string}:${string}`;

export interface RegionGroupRow {
  rowType: "region";
  rowKey: RegionRowKey;
  region: string;
}

export interface TerritoryGroupRow {
  rowType: "territory";
  rowKey: TerritoryRowKey;
  region: string;
  territory: string;
}

export type ExplorerDisplayRow = RegionGroupRow | TerritoryGroupRow | HcpEntity;

export type ExplorerDisplayRowKey = RegionRowKey | TerritoryRowKey | HcpRowKey;

export function createRegionGroupRow(region: string): RegionGroupRow {
  return {
    rowType: "region",
    rowKey: `region:${region}`,
    region,
  };
}

export function createTerritoryGroupRow(
  region: string,
  territory: string,
): TerritoryGroupRow {
  return {
    rowType: "territory",
    rowKey: `territory:${region}:${territory}`,
    region,
    territory,
  };
}

export function isHcpRow(row: ExplorerDisplayRow): row is HcpEntity {
  return row.rowType === "hcp";
}

export function isRegionGroupRow(
  row: ExplorerDisplayRow,
): row is RegionGroupRow {
  return row.rowType === "region";
}

export function isTerritoryGroupRow(
  row: ExplorerDisplayRow,
): row is TerritoryGroupRow {
  return row.rowType === "territory";
}
