import { useMemo } from "react";
import {
  AllCommunityModule,
  themeQuartz,
  type ColDef,
} from "ag-grid-community";
import {
  AgGridProvider,
  AgGridReact,
} from "ag-grid-react";
import { calculateCpi, toNumericCalls } from "../../../domain/hcp";
import { useAppSelector } from "../../../app/hooks";
import type { ExplorerDisplayRow } from "../displayRows";
import { selectDisplayRows } from "../explorerSelectors";
import { GroupLabelCell } from "./GroupLabelCell";
import "./ExplorerGrid.css";

const communityModules = [AllCommunityModule];

function formatNumber(value: unknown): string {
  return typeof value === "number"
    ? value.toLocaleString()
    : "";
}

export function ExplorerGrid() {
  const displayRows = useAppSelector(selectDisplayRows);

  const columnDefs = useMemo<
    ColDef<ExplorerDisplayRow>[]
  >(
    () => [
      {
        colId: "provider",
        headerName: "Provider / Group",
        flex: 2,
        width: 250,
        minWidth: 230,
        cellRenderer: GroupLabelCell,
      },
      {
        colId: "id",
        flex: 1.15,
        headerName: "HCP ID",
        width: 145,
        minWidth: 135,
        valueGetter: ({ data }) =>
          data?.rowType === "hcp" ? data.id : "",
      },
      {
        colId: "specialty",
        headerName: "Specialty",
        width: 155,
        flex: 1.2,
        minWidth: 145,
        valueGetter: ({ data }) =>
          data?.rowType === "hcp"
            ? (data.specialty ?? "Not provided")
            : "",
      },
      {
        colId: "region",
        headerName: "Region",
        width: 125,
        flex: 0.9,
        minWidth: 110,
        valueGetter: ({ data }) =>
          data?.rowType === "hcp" ? data.region : "",
      },
      {
        colId: "territory",
        headerName: "Territory",
        width: 155,
        flex: 1.2,
        minWidth: 150,
        valueGetter: ({ data }) =>
          data?.rowType === "hcp"
            ? data.territory
            : "",
      },
      {
        colId: "calls",
        headerName: "Calls",
        width: 105,
        flex: 0.75,
        minWidth: 90,
        type: "numericColumn",
        valueGetter: ({ data }) => {
          if (data?.rowType !== "hcp") {
            return "";
          }

          return toNumericCalls(data.calls);
        },
        valueFormatter: ({ value }) =>
          value === null ? "Invalid" : formatNumber(value),
      },
      {
        colId: "trx",
        headerName: "TRx",
        width: 105,
        flex: 0.75,
        minWidth: 90,
        type: "numericColumn",
        valueGetter: ({ data }) =>
          data?.rowType === "hcp" ? data.trx : null,
        valueFormatter: ({ value }) =>
          formatNumber(value),
      },
      {
        colId: "nrx",
        headerName: "NRx",
        width: 105,
        flex: 0.75,
        minWidth: 90,
        type: "numericColumn",
        valueGetter: ({ data }) =>
          data?.rowType === "hcp" ? data.nrx : null,
        valueFormatter: ({ value }) =>
          formatNumber(value),
      },
      {
        colId: "cpi",
        headerName: "CPI",
        width: 110,
        flex: 0.75,
        minWidth: 90,
        type: "numericColumn",
        valueGetter: ({ data }) =>
          data?.rowType === "hcp"
            ? calculateCpi(data.calls, data.trx)
            : null,
        valueFormatter: ({ data, value }) => {
          if (data?.rowType !== "hcp") {
            return "";
          }

          return typeof value === "number"
            ? `${value.toFixed(2)}%`
            : "-";
        },
      },
    ],
    [],
  );

  const defaultColDef = useMemo<
    ColDef<ExplorerDisplayRow>
  >(
    () => ({
      sortable: false,
      resizable: true,
      suppressMovable: true,
    }),
    [],
  );

  return (
    <section
      className="explorer-grid"
      aria-label="HCP data explorer grid"
    >
      <AgGridProvider modules={communityModules}>
        <AgGridReact<ExplorerDisplayRow>
          theme={themeQuartz}
          rowData={displayRows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={({ data }) => data.rowKey}
          getRowClass={({ data }) =>
            data
              ? `explorer-row explorer-row--${data.rowType}`
              : undefined
          }
          rowHeight={40}
          headerHeight={44}
          animateRows={false}
          suppressDragLeaveHidesColumns
        />
      </AgGridProvider>
    </section>
  );
}