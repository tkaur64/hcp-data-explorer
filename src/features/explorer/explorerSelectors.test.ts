import { describe, expect, test } from "@jest/globals";

import type { RootState } from "../../app/store";
import { toNumericCalls } from "../../domain/hcp";
import { createTerritoryRowKey } from "./displayRows";
import { selectDisplayRows, selectMatchingHcpCount } from "./explorerSelectors";
import explorerReducer, {
  cycleSort,
  setSearchQuery,
  toggleTerritory,
} from "./explorerSlice";
import type { ExplorerState } from "./explorerTypes";

const baseState = explorerReducer(undefined, {
  type: "@@INIT",
});

function rootState(explorer: ExplorerState): RootState {
  return {
    explorer,
  };
}

function findDuplicateId(state: ExplorerState): {
  id: string;
  count: number;
} {
  const counts = new Map<string, number>();

  for (const rowKey of state.ids) {
    const entity = state.entities[rowKey];

    if (entity) {
      counts.set(entity.id, (counts.get(entity.id) ?? 0) + 1);
    }
  }

  for (const [id, count] of counts) {
    if (count > 1) {
      return {
        id,
        count,
      };
    }
  }

  throw new Error("Expected a duplicate HCP ID");
}

describe("explorer selectors", () => {
  test("counts matches independently of expansion state", () => {
    const rows = selectDisplayRows(rootState(baseState));

    expect(rows.some((row) => row.rowType === "hcp")).toBe(false);

    expect(selectMatchingHcpCount(rootState(baseState))).toBe(50_000);
  });

  test("returns every row sharing a duplicate HCP ID", () => {
    const duplicate = findDuplicateId(baseState);

    const searchedState = explorerReducer(
      baseState,
      setSearchQuery(duplicate.id),
    );

    const matchingRows = selectDisplayRows(rootState(searchedState)).filter(
      (row) => row.rowType === "hcp",
    );

    expect(matchingRows).toHaveLength(duplicate.count);

    expect(
      matchingRows.every(
        (row) => row.rowType === "hcp" && row.id === duplicate.id,
      ),
    ).toBe(true);
  });

  test("expands only the selected Region and Territory combination", () => {
    const entity = baseState.entities[baseState.ids[0]];

    if (!entity) {
      throw new Error("Expected an HCP entity");
    }

    const territoryKey = createTerritoryRowKey(entity.region, entity.territory);

    const expandedState = explorerReducer(
      baseState,
      toggleTerritory(territoryKey),
    );

    const visibleHcps = selectDisplayRows(rootState(expandedState)).filter(
      (row) => row.rowType === "hcp",
    );

    expect(visibleHcps.length).toBeGreaterThan(0);

    expect(
      visibleHcps.every(
        (row) =>
          row.rowType === "hcp" &&
          row.region === entity.region &&
          row.territory === entity.territory,
      ),
    ).toBe(true);
  });

  test("cycles Calls sorting through ascending, descending and source order", () => {
    const entity = baseState.entities[baseState.ids[0]];

    if (!entity) {
      throw new Error("Expected an HCP entity");
    }

    const territoryKey = createTerritoryRowKey(entity.region, entity.territory);

    let state = explorerReducer(baseState, toggleTerritory(territoryKey));

    state = explorerReducer(state, cycleSort("calls"));

    const getTerritoryRows = (explorer: ExplorerState) =>
      selectDisplayRows(rootState(explorer)).filter(
        (row) =>
          row.rowType === "hcp" &&
          row.region === entity.region &&
          row.territory === entity.territory,
      );

    const ascending = getTerritoryRows(state).map((row) =>
      row.rowType === "hcp" ? toNumericCalls(row.calls) : null,
    );

    expect(ascending).toEqual(
      [...ascending].sort(
        (first, second) =>
          (first ?? Number.POSITIVE_INFINITY) -
          (second ?? Number.POSITIVE_INFINITY),
      ),
    );

    state = explorerReducer(state, cycleSort("calls"));

    const descending = getTerritoryRows(state).map((row) =>
      row.rowType === "hcp" ? toNumericCalls(row.calls) : null,
    );

    expect(descending).toEqual(
      [...descending].sort(
        (first, second) =>
          (second ?? Number.NEGATIVE_INFINITY) -
          (first ?? Number.NEGATIVE_INFINITY),
      ),
    );

    state = explorerReducer(state, cycleSort("calls"));

    const sourceIndexes = getTerritoryRows(state).map((row) =>
      row.rowType === "hcp" ? row.sourceIndex : -1,
    );

    expect(sourceIndexes).toEqual(
      [...sourceIndexes].sort((first, second) => first - second),
    );
  });
});
