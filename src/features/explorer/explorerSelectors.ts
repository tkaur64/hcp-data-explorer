import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import type { ExplorerDisplayRow } from "./displayRows";
import { createRegionGroupRow, createTerritoryGroupRow } from "./displayRows";
import { buildGroupIndex } from "./groupIndex";
import { hcpAdapter } from "./explorerSlice";
import type { HcpEntity } from "../../domain/hcp";

export const selectExplorerState = (state: RootState) => state.explorer;

export const {
  selectAll: selectAllHcps,
  selectById: selectHcpById,
  selectIds: selectHcpIds,
  selectTotal: selectHcpTotal,
} = hcpAdapter.getSelectors<RootState>(selectExplorerState);

export const selectRegionNames = createSelector(
  [selectExplorerState],
  (explorer) =>
    Object.keys(explorer.aggregates.regions).sort((first, second) =>
      first.localeCompare(second),
    ),
);

export const selectExplorerSummary = createSelector(
  [selectExplorerState],
  (explorer) => ({
    totalRecords: explorer.ids.length,
    regionCount: Object.keys(explorer.aggregates.regions).length,
    territoryCount: Object.keys(explorer.aggregates.territories).length,
    editedRowCount: Object.keys(explorer.edits).length,
  }),
);

export const selectGroupIndex = createSelector(
  [selectAllHcps],
  buildGroupIndex,
);

const selectEntities = (state: RootState) => state.explorer.entities;

const selectView = (state: RootState) => state.explorer.view;

export const selectDisplayRows = createSelector(
  [selectGroupIndex, selectEntities, selectView],
  (groupIndex, entities, view): ExplorerDisplayRow[] => {
    const displayRows: ExplorerDisplayRow[] = [];

    const normalizedQuery = view.searchQuery.trim().toLocaleLowerCase();

    const isSearching = normalizedQuery.length > 0;

    const regions =
      view.regionFilter === null ? groupIndex.regions : [view.regionFilter];

    for (const region of regions) {
      const territories = groupIndex.territoriesByRegion[region];

      if (!territories) {
        continue;
      }

      const territoryBlocks: Array<{
        territory: string;
        matchingRecords: HcpEntity[];
      }> = [];

      for (const territory of territories) {
        const rowKeys = groupIndex.rowKeysByTerritory[territory] ?? [];

        if (!isSearching) {
          territoryBlocks.push({
            territory,
            matchingRecords: [],
          });

          continue;
        }

        const matchingRecords: HcpEntity[] = [];

        for (const rowKey of rowKeys) {
          const entity = entities[rowKey];

          if (!entity) {
            continue;
          }

          const matchesName = entity.name
            .toLocaleLowerCase()
            .includes(normalizedQuery);

          const matchesId = entity.id
            .toLocaleLowerCase()
            .includes(normalizedQuery);

          if (matchesName || matchesId) {
            matchingRecords.push(entity);
          }
        }

        if (matchingRecords.length > 0) {
          territoryBlocks.push({
            territory,
            matchingRecords,
          });
        }
      }

      if (isSearching && territoryBlocks.length === 0) {
        continue;
      }

      displayRows.push(createRegionGroupRow(region));

      const regionIsExpanded =
        isSearching || Boolean(view.expandedRegions[region]);

      if (!regionIsExpanded) {
        continue;
      }

      for (const { territory, matchingRecords } of territoryBlocks) {
        displayRows.push(createTerritoryGroupRow(region, territory));

        const territoryIsExpanded =
          isSearching || Boolean(view.expandedTerritories[territory]);

        if (!territoryIsExpanded) {
          continue;
        }

        if (isSearching) {
          displayRows.push(...matchingRecords);
          continue;
        }

        const rowKeys = groupIndex.rowKeysByTerritory[territory] ?? [];

        for (const rowKey of rowKeys) {
          const entity = entities[rowKey];

          if (entity) {
            displayRows.push(entity);
          }
        }
      }
    }

    return displayRows;
  },
);
