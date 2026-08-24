import type { CustomCellRendererProps } from "ag-grid-react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import type { ExplorerDisplayRow } from "../displayRows";
import {
  toggleRegion,
  toggleTerritory,
} from "../explorerSlice";

export function GroupLabelCell({
  data,
}: CustomCellRendererProps<ExplorerDisplayRow>) {
  const dispatch = useAppDispatch();

  const expanded = useAppSelector((state) => {
    if (data?.rowType === "region") {
      return Boolean(
        state.explorer.view.expandedRegions[data.region],
      );
    }

    if (data?.rowType === "territory") {
      return Boolean(
        state.explorer.view.expandedTerritories[
        data.territory
        ],
      );
    }

    return false;
  });

  if (!data) {
    return null;
  }

  if (data.rowType === "hcp") {
    return <span className="hcp-name">{data.name}</span>;
  }

  const isRegion = data.rowType === "region";

  const label = isRegion
    ? data.region
    : data.territory.replace(`${data.region} / `, "");

  const accessibleLabel = isRegion
    ? `${expanded ? "Collapse" : "Expand"} region ${data.region}`
    : `${expanded ? "Collapse" : "Expand"} territory ${data.territory}`;

  function handleToggle() {
    if (data?.rowType === "region") {
      dispatch(toggleRegion(data.region));
    } else if (data?.rowType === "territory") {
      dispatch(toggleTerritory(data.territory));
    }
  }

  return (
    <button
      type="button"
      className={`group-label ${isRegion
          ? "group-label--region"
          : "group-label--territory"
        }`}
      aria-expanded={expanded}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        handleToggle();
      }}
    >
      <span className="group-label__icon" aria-hidden="true">
        {expanded ? "▾" : "▸"}
      </span>

      <span>{label}</span>
    </button>
  );
}