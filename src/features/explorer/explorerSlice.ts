import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  createHcpEntities,
  toNumericCalls,
  type HcpEntity,
  type HcpRowKey,
} from "../../domain/hcp";
import { createTerritoryRowKey } from "./displayRows";
import { submitCallsEdit } from "./callsEditing";
import { generateRows } from "../../provided/data-generator";
import { buildAggregates } from "./buildAggregates";
import type { Aggregate, ExplorerState, SortColumn } from "./explorerTypes";
import type { TerritoryRowKey } from "./displayRows";

export const hcpAdapter = createEntityAdapter<HcpEntity, HcpRowKey>({
  selectId: (record) => record.rowKey,
});

function replaceAggregateCalls(
  aggregate: Aggregate | undefined,
  previousValue: number | null,
  nextValue: number | null,
): void {
  if (!aggregate) {
    return;
  }

  if (previousValue === null) {
    aggregate.invalidCallsCount = Math.max(0, aggregate.invalidCallsCount - 1);
  } else {
    aggregate.calls -= previousValue;
  }

  if (nextValue === null) {
    aggregate.invalidCallsCount += 1;
  } else {
    aggregate.calls += nextValue;
  }
}

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

    toggleTerritory(state, action: PayloadAction<TerritoryRowKey>) {
      const territoryKey = action.payload;

      state.view.expandedTerritories[territoryKey] =
        !state.view.expandedTerritories[territoryKey];
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
    undoLastEdit(state) {
      const hasPendingEdit = Object.values(state.edits).some(
        (edit) => edit?.status === "pending",
      );

      if (hasPendingEdit) {
        return;
      }

      const command = state.history.past[state.history.past.length - 1];

      if (!command) {
        return;
      }

      const entity = state.entities[command.rowKey];

      if (!entity) {
        return;
      }

      const currentValue =
        state.edits[command.rowKey]?.acceptedValue ??
        toNumericCalls(entity.calls);

      const restoredValue = command.previousValue;

      if (currentValue !== restoredValue) {
        replaceAggregateCalls(
          state.aggregates.regions[entity.region],
          currentValue,
          restoredValue,
        );

        const territoryKey = createTerritoryRowKey(
          entity.region,
          entity.territory,
        );

        replaceAggregateCalls(
          state.aggregates.territories[territoryKey],
          currentValue,
          restoredValue,
        );
      }

      const sourceValue = toNumericCalls(entity.calls);

      if (restoredValue === null || restoredValue === sourceValue) {
        delete state.edits[command.rowKey];
      } else {
        state.edits[command.rowKey] = {
          acceptedValue: restoredValue,
          status: "saved",
        };
      }

      state.history.past.pop();
      state.history.future.push(command);
    },
    redoLastEdit(state) {
      const hasPendingEdit = Object.values(state.edits).some(
        (edit) => edit?.status === "pending",
      );

      if (hasPendingEdit) {
        return;
      }

      const command = state.history.future[state.history.future.length - 1];

      if (!command) {
        return;
      }

      const entity = state.entities[command.rowKey];

      if (!entity) {
        return;
      }

      const currentValue =
        state.edits[command.rowKey]?.acceptedValue ??
        toNumericCalls(entity.calls);

      const restoredValue = command.nextValue;

      if (currentValue !== restoredValue) {
        replaceAggregateCalls(
          state.aggregates.regions[entity.region],
          currentValue,
          restoredValue,
        );

        const territoryKey = createTerritoryRowKey(
          entity.region,
          entity.territory,
        );

        replaceAggregateCalls(
          state.aggregates.territories[territoryKey],
          currentValue,
          restoredValue,
        );
      }

      const sourceValue = toNumericCalls(entity.calls);

      if (restoredValue === sourceValue) {
        delete state.edits[command.rowKey];
      } else {
        state.edits[command.rowKey] = {
          acceptedValue: restoredValue,
          status: "saved",
        };
      }

      state.history.future.pop();
      state.history.past.push(command);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitCallsEdit.pending, (state, action) => {
        const { rowKey, newValue } = action.meta.arg;

        if (!state.edits[rowKey]) {
          state.edits[rowKey] = {
            status: "pending",
          };
        }

        const edit = state.edits[rowKey];

        if (!edit) {
          return;
        }

        edit.pendingValue = newValue;
        edit.status = "pending";
        edit.requestId = action.meta.requestId;

        delete edit.error;
      })

      .addCase(submitCallsEdit.fulfilled, (state, action) => {
        const { rowKey, newValue } = action.payload;
        const edit = state.edits[rowKey];

        /*
         * A newer request may already be pending for this row.
         * Ignore responses belonging to older requests.
         */
        if (!edit || edit.requestId !== action.meta.requestId) {
          return;
        }

        const entity = state.entities[rowKey];

        if (!entity) {
          return;
        }

        const previousValue =
          edit.acceptedValue ?? toNumericCalls(entity.calls);

        if (previousValue !== newValue) {
          replaceAggregateCalls(
            state.aggregates.regions[entity.region],
            previousValue,
            newValue,
          );

          const territoryKey = createTerritoryRowKey(
            entity.region,
            entity.territory,
          );

          replaceAggregateCalls(
            state.aggregates.territories[territoryKey],
            previousValue,
            newValue,
          );

          state.history.past.push({
            commandId: action.meta.requestId,
            rowKey,
            previousValue,
            nextValue: newValue,
          });

          state.history.future = [];
        }

        edit.acceptedValue = newValue;
        edit.status = "saved";

        delete edit.pendingValue;
        delete edit.requestId;
        delete edit.error;
      })

      .addCase(submitCallsEdit.rejected, (state, action) => {
        const { rowKey } = action.meta.arg;
        const edit = state.edits[rowKey];

        /*
         * Ignore stale failures as well as stale successes.
         */
        if (!edit || edit.requestId !== action.meta.requestId) {
          return;
        }

        edit.status = "rejected";
        edit.error = action.payload ?? "Calls validation failed";

        delete edit.pendingValue;
        delete edit.requestId;
      });
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
  undoLastEdit,
  redoLastEdit,
} = explorerSlice.actions;

export default explorerSlice.reducer;
