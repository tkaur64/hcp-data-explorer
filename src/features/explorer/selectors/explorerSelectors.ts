import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../../app/store";
import type { ExplorerDisplayRow } from "../utils/displayRows";
import {
  createRegionGroupRow,
  createTerritoryGroupRow,
  createTerritoryRowKey,
} from "../utils/displayRows";
import {
  compareAggregateValues,
  compareHcpRecords,
  compareTextValues,
  isNumericSortColumn,
} from "../utils/sorting";
import { buildGroupIndex } from "../utils/groupIndex";
import { hcpAdapter } from "../state/explorerSlice";
import type { HcpEntity } from "../../../domain/hcp";
import {
  matchesHcpSearch,
  normalizeSearchQuery,
} from "../utils/recordFiltering";

export const selectExplorerState = (state: RootState) => state.explorer;
const selectEdits = (state: RootState) => state.explorer.edits;

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

const selectAggregates = (state: RootState) => state.explorer.aggregates;

export const selectDisplayRows = createSelector(
  [selectGroupIndex, selectEntities, selectView, selectAggregates, selectEdits],
  (groupIndex, entities, view, aggregates, edits): ExplorerDisplayRow[] => {
    const displayRows: ExplorerDisplayRow[] = [];

    const normalizedQuery = normalizeSearchQuery(view.searchQuery);

    const isSearching = normalizedQuery.length > 0;
    const activeSort = view.sort;

    const regions =
      view.regionFilter === null
        ? [...groupIndex.regions]
        : [view.regionFilter];

    /*
     * Numeric columns sort Region groups using their
     * aggregate values. Region text sorting uses the
     * Region name.
     */
    if (activeSort) {
      if (isNumericSortColumn(activeSort.column)) {
        regions.sort((first, second) => {
          const aggregateComparison = compareAggregateValues(
            aggregates.regions[first],
            aggregates.regions[second],
            activeSort.column,
            activeSort.direction,
          );

          if (aggregateComparison !== 0) {
            return aggregateComparison;
          }

          return compareTextValues(first, second, "asc");
        });
      } else if (activeSort.column === "region") {
        regions.sort((first, second) =>
          compareTextValues(first, second, activeSort.direction),
        );
      }
    }

    for (const region of regions) {
      const indexedTerritories = groupIndex.territoriesByRegion[region];

      if (!indexedTerritories) {
        continue;
      }

      const territories = [...indexedTerritories];

      /*
       * Numeric columns sort Territory groups using their
       * aggregate values. Territory text sorting uses the
       * Territory name.
       */
      if (activeSort) {
        if (isNumericSortColumn(activeSort.column)) {
          territories.sort((first, second) => {
            const firstKey = createTerritoryRowKey(region, first);

            const secondKey = createTerritoryRowKey(region, second);

            const aggregateComparison = compareAggregateValues(
              aggregates.territories[firstKey],
              aggregates.territories[secondKey],
              activeSort.column,
              activeSort.direction,
            );

            if (aggregateComparison !== 0) {
              return aggregateComparison;
            }

            return compareTextValues(first, second, "asc");
          });
        } else if (activeSort.column === "territory") {
          territories.sort((first, second) =>
            compareTextValues(first, second, activeSort.direction),
          );
        }
      }

      const territoryBlocks: Array<{
        territory: string;
        matchingRecords: HcpEntity[];
      }> = [];

      for (const territory of territories) {
        const territoryKey = createTerritoryRowKey(region, territory);

        const rowKeys = groupIndex.rowKeysByTerritory[territoryKey] ?? [];

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

          if (matchesHcpSearch(entity, normalizedQuery)) {
            matchingRecords.push(entity);
          }
        }

        if (matchingRecords.length > 0) {
          if (activeSort) {
            matchingRecords.sort((first, second) =>
              compareHcpRecords(first, second, activeSort, edits),
            );
          }

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
        const territoryKey = createTerritoryRowKey(region, territory);

        displayRows.push(createTerritoryGroupRow(region, territory));

        const territoryIsExpanded =
          isSearching || Boolean(view.expandedTerritories[territoryKey]);

        if (!territoryIsExpanded) {
          continue;
        }

        if (isSearching) {
          displayRows.push(...matchingRecords);
          continue;
        }

        const rowKeys = groupIndex.rowKeysByTerritory[territoryKey] ?? [];

        if (!activeSort) {
          for (const rowKey of rowKeys) {
            const entity = entities[rowKey];

            if (entity) {
              displayRows.push(entity);
            }
          }

          continue;
        }

        const sortedRecords: HcpEntity[] = [];

        for (const rowKey of rowKeys) {
          const entity = entities[rowKey];

          if (entity) {
            sortedRecords.push(entity);
          }
        }

        sortedRecords.sort((first, second) =>
          compareHcpRecords(first, second, activeSort, edits),
        );

        displayRows.push(...sortedRecords);
      }
    }

    return displayRows;
  },
);

const selectSearchQuery = (state: RootState) => state.explorer.view.searchQuery;

const selectRegionFilter = (state: RootState) =>
  state.explorer.view.regionFilter;

export const selectMatchingHcpCount = createSelector(
  [selectAllHcps, selectSearchQuery, selectRegionFilter],
  (entities, searchQuery, regionFilter) => {
    const normalizedQuery = normalizeSearchQuery(searchQuery);

    let count = 0;

    for (const entity of entities) {
      if (regionFilter !== null && entity.region !== regionFilter) {
        continue;
      }

      if (!matchesHcpSearch(entity, normalizedQuery)) {
        continue;
      }

      count += 1;
    }

    return count;
  },
);
