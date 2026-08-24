import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  createHcpEntities,
  type HcpEntity,
  type HcpRowKey,
} from "../../domain/hcp";
import { generateRows } from "../../provided/data-generator";
import { buildAggregates } from "./buildAggregates";
import type { ExplorerState, SortColumn } from "./explorerTypes";

export const hcpAdapter = createEntityAdapter<HcpEntity, HcpRowKey>({
  selectId: (record) => record.rowKey,
});

const generatedRecords = createHcpEntities(generateRows(42, 50000));

const initialAggregates = buildAggregates(generatedRecords);

const initiallyExpandedRegions: Record<string, boolean> = Object.fromEntries(
  Object.keys(initialAggregates.regions).map((region) => [region, true]),
);

const initialState: ExplorerState = hcpAdapter.setAll(
  hcpAdapter.getInitialState({
    edits: {},
    aggregates: initialAggregates,

    view: {
      searchQuery: "",
      regionFilter: null,
      sort: null,
      expandedRegions: initiallyExpandedRegions,
      expandedTerritories: {},
    },

    history: {
      past: [],
      future: [],
    },

    selection: {},
    tenantKey: "default",
  }),
  generatedRecords,
);

const explorerSlice = createSlice({
  name: "explorer",
  initialState,

  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.view.searchQuery = action.payload;
    },

    setRegionFilter(state, action: PayloadAction<string | null>) {
      state.view.regionFilter = action.payload;
    },

    cycleSort(state, action: PayloadAction<SortColumn>) {
      const selectedColumn = action.payload;
      const currentSort = state.view.sort;

      if (currentSort === null || currentSort.column !== selectedColumn) {
        state.view.sort = {
          column: selectedColumn,
          direction: "asc",
        };

        return;
      }

      if (currentSort.direction === "asc") {
        state.view.sort = {
          column: selectedColumn,
          direction: "desc",
        };

        return;
      }

      state.view.sort = null;
    },

    toggleRegion(state, action: PayloadAction<string>) {
      const region = action.payload;

      state.view.expandedRegions[region] = !state.view.expandedRegions[region];
    },

    toggleTerritory(state, action: PayloadAction<string>) {
      const territory = action.payload;

      state.view.expandedTerritories[territory] =
        !state.view.expandedTerritories[territory];
    },

    toggleSelection(state, action: PayloadAction<HcpRowKey>) {
      const rowKey = action.payload;

      if (state.selection[rowKey]) {
        delete state.selection[rowKey];
      } else {
        state.selection[rowKey] = true;
      }
    },

    clearSelection(state) {
      state.selection = {};
    },

    setTenantKey(state, action: PayloadAction<string>) {
      state.tenantKey = action.payload;
    },
  },
});

export const {
  setSearchQuery,
  setRegionFilter,
  cycleSort,
  toggleRegion,
  toggleTerritory,
  toggleSelection,
  clearSelection,
  setTenantKey,
} = explorerSlice.actions;

export default explorerSlice.reducer;
