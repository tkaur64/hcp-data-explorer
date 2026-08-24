import type { HcpEntity, HcpRowKey } from "../../domain/hcp";

export interface ExplorerGroupIndex {
  regions: string[];
  territoriesByRegion: Record<string, string[]>;
  rowKeysByTerritory: Record<string, HcpRowKey[]>;
}

export function buildGroupIndex(records: HcpEntity[]): ExplorerGroupIndex {
  const territorySetsByRegion: Record<string, Set<string>> = {};

  const rowKeysByTerritory: Record<string, HcpRowKey[]> = {};

  for (const record of records) {
    const territories =
      territorySetsByRegion[record.region] ??
      (territorySetsByRegion[record.region] = new Set<string>());

    territories.add(record.territory);

    const rowKeys =
      rowKeysByTerritory[record.territory] ??
      (rowKeysByTerritory[record.territory] = []);

    rowKeys.push(record.rowKey);
  }

  const regions = Object.keys(territorySetsByRegion).sort((first, second) =>
    first.localeCompare(second),
  );

  const territoriesByRegion: Record<string, string[]> = {};

  for (const region of regions) {
    territoriesByRegion[region] = [...territorySetsByRegion[region]].sort(
      (first, second) => first.localeCompare(second),
    );
  }

  return {
    regions,
    territoriesByRegion,
    rowKeysByTerritory,
  };
}
