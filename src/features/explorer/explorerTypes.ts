import type { EntityState } from "@reduxjs/toolkit";
import type { HcpEntity, HcpRowKey } from "../../domain/hcp";
import type { TerritoryRowKey } from "./displayRows";

export type SortColumn =
  | "id"
  | "name"
  | "specialty"
  | "region"
  | "territory"
  | "hcpCount"
  | "calls"
  | "trx"
  | "nrx"
  | "cpi";

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

export interface Aggregate {
  calls: number;
  trx: number;
  nrx: number;
  hcpCount: number;
  invalidCallsCount: number;
}

export type CallsEditStatus = "pending" | "saved" | "rejected";

export interface CallsEditState {
  acceptedValue?: number;
  pendingValue?: number;
  status: CallsEditStatus;
  requestId?: string;
  error?: string;
}

export interface EditCommand {
  commandId: string;
  rowKey: HcpRowKey;
  previousValue: number;
  nextValue: number;
}

export interface CommandHistory {
  past: EditCommand[];
  future: EditCommand[];
}

export interface ExplorerViewState {
  searchQuery: string;
  regionFilter: string | null;
  sort: SortState | null;
  expandedRegions: Record<string, boolean>;
  expandedTerritories: Partial<Record<TerritoryRowKey, boolean>>;
}

export interface ExplorerAggregates {
  regions: Record<string, Aggregate>;
  territories: Partial<Record<TerritoryRowKey, Aggregate>>;
}

export interface ExplorerState extends EntityState<HcpEntity, HcpRowKey> {
  edits: Partial<Record<HcpRowKey, CallsEditState>>;
  aggregates: ExplorerAggregates;
  view: ExplorerViewState;
  history: CommandHistory;
  selection: Partial<Record<HcpRowKey, true>>;
  tenantKey: string;
}
