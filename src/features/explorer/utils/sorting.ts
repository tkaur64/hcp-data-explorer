import { calculateCpi, type HcpEntity } from "../../../domain/hcp";
import type {
  Aggregate,
  SortColumn,
  SortDirection,
  SortState,
} from "../state/explorerTypes";
import type { HcpRowKey } from "../../../domain/hcp";
import { getAcceptedCalls } from "./callsValues";
import type { CallsEditState } from "../state/explorerTypes";

type CallsEdits = Partial<Record<HcpRowKey, CallsEditState>>;

const textCollator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

const numericSortColumns: ReadonlySet<SortColumn> = new Set([
  "hcpCount",
  "calls",
  "trx",
  "nrx",
  "cpi",
]);

export function isNumericSortColumn(column: SortColumn): boolean {
  return numericSortColumns.has(column);
}

function compareNullable<T>(
  first: T | null | undefined,
  second: T | null | undefined,
  direction: SortDirection,
  compareValues: (left: T, right: T) => number,
): number {
  const firstIsMissing = first === null || first === undefined;
  const secondIsMissing = second === null || second === undefined;

  if (firstIsMissing && secondIsMissing) {
    return 0;
  }

  // Missing and invalid values always remain last,
  // regardless of the selected direction.
  if (firstIsMissing) {
    return 1;
  }

  if (secondIsMissing) {
    return -1;
  }

  const result = compareValues(first, second);

  return direction === "asc" ? result : -result;
}

export function compareTextValues(
  first: string | null | undefined,
  second: string | null | undefined,
  direction: SortDirection,
): number {
  return compareNullable(first, second, direction, (left, right) =>
    textCollator.compare(left, right),
  );
}

export function compareNumberValues(
  first: number | null | undefined,
  second: number | null | undefined,
  direction: SortDirection,
): number {
  return compareNullable(
    first,
    second,
    direction,
    (left, right) => left - right,
  );
}

function getAggregateMetric(
  aggregate: Aggregate | undefined,
  column: SortColumn,
): number | null {
  if (!aggregate) {
    return null;
  }

  switch (column) {
    case "hcpCount":
      return aggregate.hcpCount;

    case "calls":
      return aggregate.calls;

    case "trx":
      return aggregate.trx;

    case "nrx":
      return aggregate.nrx;

    case "cpi":
      return calculateCpi(aggregate.calls, aggregate.trx);

    default:
      return null;
  }
}

export function compareAggregateValues(
  first: Aggregate | undefined,
  second: Aggregate | undefined,
  column: SortColumn,
  direction: SortDirection,
): number {
  return compareNumberValues(
    getAggregateMetric(first, column),
    getAggregateMetric(second, column),
    direction,
  );
}

export function compareHcpRecords(
  first: HcpEntity,
  second: HcpEntity,
  sort: SortState,
  edits: CallsEdits,
): number {
  let result = 0;

  switch (sort.column) {
    case "id":
      result = compareTextValues(first.id, second.id, sort.direction);
      break;

    case "name":
      result = compareTextValues(first.name, second.name, sort.direction);
      break;

    case "specialty":
      result = compareTextValues(
        first.specialty,
        second.specialty,
        sort.direction,
      );
      break;

    case "region":
      result = compareTextValues(first.region, second.region, sort.direction);
      break;

    case "territory":
      result = compareTextValues(
        first.territory,
        second.territory,
        sort.direction,
      );
      break;

    case "calls":
      result = compareNumberValues(
        getAcceptedCalls(first, edits[first.rowKey]),
        getAcceptedCalls(second, edits[second.rowKey]),
        sort.direction,
      );
      break;

    case "trx":
      result = compareNumberValues(first.trx, second.trx, sort.direction);
      break;

    case "nrx":
      result = compareNumberValues(first.nrx, second.nrx, sort.direction);
      break;

    case "cpi": {
      const firstCalls = getAcceptedCalls(first, edits[first.rowKey]);

      const secondCalls = getAcceptedCalls(second, edits[second.rowKey]);

      result = compareNumberValues(
        firstCalls === null ? null : calculateCpi(firstCalls, first.trx),
        secondCalls === null ? null : calculateCpi(secondCalls, second.trx),
        sort.direction,
      );

      break;
    }

    case "hcpCount":
      // HCP count only applies to group rows.
      result = 0;
      break;
  }

  if (result !== 0) {
    return result;
  }

  // Deterministic tie-breaker that preserves source order.
  return first.sourceIndex - second.sourceIndex;
}
