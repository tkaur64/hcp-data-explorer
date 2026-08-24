import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import type { ExplorerDisplayRow } from "./displayRows";
import { createRegionGroupRow, createTerritoryGroupRow } from "./displayRows";
import { buildGroupIndex } from "./groupIndex";
import { hcpAdapter } from "./explorerSlice";

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

    const regions =
      view.regionFilter === null ? groupIndex.regions : [view.regionFilter];

    for (const region of regions) {
      if (!groupIndex.territoriesByRegion[region]) {
        continue;
      }

      displayRows.push(createRegionGroupRow(region));

      if (!view.expandedRegions[region]) {
        continue;
      }

      const territories = groupIndex.territoriesByRegion[region];

      for (const territory of territories) {
        displayRows.push(createTerritoryGroupRow(region, territory));

        if (!view.expandedTerritories[territory]) {
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
