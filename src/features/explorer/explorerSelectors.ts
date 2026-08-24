import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
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
