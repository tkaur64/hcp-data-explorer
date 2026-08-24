import type { CustomHeaderProps } from "ag-grid-react";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import type { ExplorerDisplayRow } from "../utils/displayRows";
import { cycleSort } from "../state/explorerSlice";
import type { SortColumn } from "../state/explorerTypes";

type SortableHeaderProps = CustomHeaderProps<ExplorerDisplayRow> & {
  sortColumn: SortColumn;
};

export function SortableHeader({
  displayName,
  sortColumn,
}: SortableHeaderProps) {
  const dispatch = useAppDispatch();

  const activeSort = useAppSelector(
    (state) => state.explorer.view.sort,
  );

  const direction =
    activeSort?.column === sortColumn
      ? activeSort.direction
      : null;

  const icon =
    direction === "asc"
      ? "↑"
      : direction === "desc"
        ? "↓"
        : "↕";

  const nextDirection =
    direction === null
      ? "ascending"
      : direction === "asc"
        ? "descending"
        : "unsorted";

  return (
    <button
      type="button"
      className={`sortable-header ${direction ? "sortable-header--active" : ""
        }`}
      onClick={() => dispatch(cycleSort(sortColumn))}
      aria-label={`${displayName}. Currently ${direction ?? "unsorted"
        }. Set ${nextDirection}.`}
      title={`Sort ${nextDirection}`}
    >
      <span>{displayName}</span>

      <span
        className="sortable-header__icon"
        aria-hidden="true"
      >
        {icon}
      </span>
    </button>
  );
}