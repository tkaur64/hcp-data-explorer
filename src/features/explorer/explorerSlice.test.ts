import { describe, expect, test } from "@jest/globals";

import { toNumericCalls, type HcpEntity } from "../../domain/hcp";
import { submitCallsEdit } from "./callsEditing";
import { createTerritoryRowKey } from "./displayRows";
import explorerReducer, { redoLastEdit, undoLastEdit } from "./explorerSlice";
import type { ExplorerState } from "./explorerTypes";

const baseState = explorerReducer(undefined, {
  type: "@@INIT",
});

function findEditableEntity(state: ExplorerState): HcpEntity {
  for (const rowKey of state.ids) {
    const entity = state.entities[rowKey];

    if (!entity) {
      continue;
    }

    const calls = toNumericCalls(entity.calls);

    if (calls !== null && calls <= 60) {
      return entity;
    }
  }

  throw new Error("Expected an editable HCP entity");
}

const entity = findEditableEntity(baseState);

const sourceCalls = toNumericCalls(entity.calls);

if (sourceCalls === null) {
  throw new Error("Expected valid source Calls");
}

const acceptedValue = sourceCalls === 20 ? 21 : 20;

const alternateValue = acceptedValue === 30 ? 31 : 30;

const territoryKey = createTerritoryRowKey(entity.region, entity.territory);

function acceptEdit(
  state: ExplorerState,
  requestId: string,
  newValue: number,
): ExplorerState {
  const args = {
    rowKey: entity.rowKey,
    newValue,
  };

  const pendingState = explorerReducer(
    state,
    submitCallsEdit.pending(requestId, args),
  );

  return explorerReducer(
    pendingState,
    submitCallsEdit.fulfilled(args, requestId, args),
  );
}

describe("explorer Calls editing", () => {
  test("applies an accepted edit using aggregate deltas", () => {
    const args = {
      rowKey: entity.rowKey,
      newValue: acceptedValue,
    };

    const initialRegionCalls =
      baseState.aggregates.regions[entity.region].calls;

    const initialTerritoryCalls =
      baseState.aggregates.territories[territoryKey]?.calls;

    expect(initialTerritoryCalls).toBeDefined();

    const pendingState = explorerReducer(
      baseState,
      submitCallsEdit.pending("accepted-request", args),
    );

    expect(pendingState.edits[entity.rowKey]).toMatchObject({
      pendingValue: acceptedValue,
      status: "pending",
      requestId: "accepted-request",
    });

    // Pending values must not change aggregates.
    expect(pendingState.aggregates.regions[entity.region].calls).toBe(
      initialRegionCalls,
    );

    const savedState = explorerReducer(
      pendingState,
      submitCallsEdit.fulfilled(args, "accepted-request", args),
    );

    const expectedDelta = acceptedValue - sourceCalls;

    expect(savedState.edits[entity.rowKey]).toMatchObject({
      acceptedValue,
      status: "saved",
    });

    expect(savedState.aggregates.regions[entity.region].calls).toBe(
      initialRegionCalls + expectedDelta,
    );

    expect(savedState.aggregates.territories[territoryKey]?.calls).toBe(
      (initialTerritoryCalls as number) + expectedDelta,
    );

    expect(savedState.history.past).toHaveLength(1);

    expect(savedState.history.past[0]).toMatchObject({
      rowKey: entity.rowKey,
      previousValue: sourceCalls,
      nextValue: acceptedValue,
    });
  });

  test("rejects an edit without changing aggregates or history", () => {
    const args = {
      rowKey: entity.rowKey,
      newValue: 61,
    };

    const initialRegionCalls =
      baseState.aggregates.regions[entity.region].calls;

    const pendingState = explorerReducer(
      baseState,
      submitCallsEdit.pending("rejected-request", args),
    );

    const rejectedState = explorerReducer(
      pendingState,
      submitCallsEdit.rejected(
        null,
        "rejected-request",
        args,
        "exceeds per-HCP call cap (60)",
      ),
    );

    expect(rejectedState.edits[entity.rowKey]).toMatchObject({
      status: "rejected",
      error: "exceeds per-HCP call cap (60)",
    });

    expect(rejectedState.edits[entity.rowKey]?.pendingValue).toBeUndefined();

    expect(rejectedState.aggregates.regions[entity.region].calls).toBe(
      initialRegionCalls,
    );

    expect(rejectedState.history.past).toHaveLength(0);
  });

  test("ignores stale validation responses", () => {
    const firstArgs = {
      rowKey: entity.rowKey,
      newValue: acceptedValue,
    };

    const latestArgs = {
      rowKey: entity.rowKey,
      newValue: alternateValue,
    };

    const firstPending = explorerReducer(
      baseState,
      submitCallsEdit.pending("older-request", firstArgs),
    );

    const latestPending = explorerReducer(
      firstPending,
      submitCallsEdit.pending("latest-request", latestArgs),
    );

    const staleResponse = explorerReducer(
      latestPending,
      submitCallsEdit.fulfilled(firstArgs, "older-request", firstArgs),
    );

    expect(staleResponse.edits[entity.rowKey]).toMatchObject({
      pendingValue: alternateValue,
      requestId: "latest-request",
      status: "pending",
    });

    expect(staleResponse.history.past).toHaveLength(0);

    const latestResponse = explorerReducer(
      staleResponse,
      submitCallsEdit.fulfilled(latestArgs, "latest-request", latestArgs),
    );

    expect(latestResponse.edits[entity.rowKey]).toMatchObject({
      acceptedValue: alternateValue,
      status: "saved",
    });

    expect(latestResponse.history.past).toHaveLength(1);
  });

  test("undoes and redoes an accepted edit", () => {
    const acceptedState = acceptEdit(
      baseState,
      "history-request",
      acceptedValue,
    );

    const undoneState = explorerReducer(acceptedState, undoLastEdit());

    expect(undoneState.edits[entity.rowKey]).toBeUndefined();

    expect(undoneState.history.past).toHaveLength(0);
    expect(undoneState.history.future).toHaveLength(1);

    expect(undoneState.aggregates.regions[entity.region].calls).toBe(
      baseState.aggregates.regions[entity.region].calls,
    );

    const redoneState = explorerReducer(undoneState, redoLastEdit());

    expect(redoneState.edits[entity.rowKey]).toMatchObject({
      acceptedValue,
      status: "saved",
    });

    expect(redoneState.history.past).toHaveLength(1);
    expect(redoneState.history.future).toHaveLength(0);
  });

  test("clears redo history after a new accepted edit", () => {
    const firstAccepted = acceptEdit(baseState, "first-command", acceptedValue);

    const undoneState = explorerReducer(firstAccepted, undoLastEdit());

    expect(undoneState.history.future).toHaveLength(1);

    const newAcceptedState = acceptEdit(
      undoneState,
      "replacement-command",
      alternateValue,
    );

    expect(newAcceptedState.history.future).toHaveLength(0);

    expect(newAcceptedState.history.past).toHaveLength(1);
  });
});
