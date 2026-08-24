import type { CustomCellRendererProps } from "ag-grid-react";

import { useAppSelector } from "../../../app/hooks";
import { calculateCpi } from "../../../domain/hcp";
import type { ExplorerDisplayRow } from "../utils/displayRows";
import { getAcceptedCalls } from "../utils/callsValues";

export function CpiCell({
  data,
}: CustomCellRendererProps<ExplorerDisplayRow>) {
  const rowKey =
    data?.rowType === "hcp"
      ? data.rowKey
      : null;

  const edit = useAppSelector((state) =>
    rowKey
      ? state.explorer.edits[rowKey]
      : undefined,
  );

  if (!data || data.rowType !== "hcp") {
    return null;
  }

  const acceptedCalls = getAcceptedCalls(
    data,
    edit,
  );

  const cpi =
    acceptedCalls === null
      ? null
      : calculateCpi(
        acceptedCalls,
        data.trx,
      );

  return (
    <span
      className="hcp-cpi"
      aria-label={
        cpi === null
          ? "CPI undefined"
          : `CPI ${cpi.toFixed(2)} percent`
      }
    >
      {cpi === null
        ? "-"
        : `${cpi.toFixed(2)}%`}
    </span>
  );
}