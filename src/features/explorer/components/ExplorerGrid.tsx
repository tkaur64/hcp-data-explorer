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
import {
  calculateCpi,
  toNumericCalls,
} from "../../../domain/hcp";
import { useAppSelector } from "../../../app/hooks";
import type { ExplorerDisplayRow } from "../displayRows";
import type { TenantTheme } from "../../../provided/theme-config";
import { selectDisplayRows } from "../explorerSelectors";
import { GroupLabelCell } from "./GroupLabelCell";
import { GroupMetricCell } from "./GroupMetricCell";
import { SortableHeader } from "../SortableHeader";
import { CallsCell } from "./CallsCell";
import { CpiCell } from "./CpiCell";
import type { SortColumn } from "../explorerTypes";

import "./ExplorerGrid.css";

const communityModules = [AllCommunityModule];

interface ExplorerGridProps {
  tenantTheme: TenantTheme;
}

function sortableHeader(sortColumn: SortColumn) {
  return {
    headerComponent: SortableHeader,
    headerComponentParams: {
      sortColumn,
    },
  };
}

function formatNumber(value: unknown): string {
  return typeof value === "number"
    ? value.toLocaleString()
    : "";
}

export function ExplorerGrid({
  tenantTheme,
}: ExplorerGridProps) {
  const displayRows = useAppSelector(selectDisplayRows);

  const gridTheme = useMemo(
    () =>
      themeQuartz.withParams({
        accentColor: tenantTheme.primary,
        backgroundColor: tenantTheme.background,
        foregroundColor: tenantTheme.text,
        textColor: tenantTheme.text,
        chromeBackgroundColor: tenantTheme.surface,
        headerTextColor: tenantTheme.text,
        borderRadius: tenantTheme.radius,
      }),
    [
      tenantTheme.primary,
      tenantTheme.background,
      tenantTheme.surface,
      tenantTheme.text,
      tenantTheme.radius,
    ],
  );

  const columnDefs = useMemo<
    ColDef<ExplorerDisplayRow>[]
  >(
    () => [
      {
        colId: "provider",
        headerName: "Provider / Group",
        flex: 2,
        minWidth: 230,
        cellRenderer: GroupLabelCell,
        ...sortableHeader("name"),
      },
      {
        colId: "id",
        headerName: "HCP ID",
        flex: 1.15,
        minWidth: 135,
        ...sortableHeader("id"),
        valueGetter: ({ data }) =>
          data?.rowType === "hcp" ? data.id : "",
      },
      {
        colId: "specialty",
        headerName: "Specialty",
        ...sortableHeader("specialty"),
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
        ...sortableHeader("region"),
        flex: 0.9,
        minWidth: 110,
        valueGetter: ({ data }) =>
          data?.rowType === "hcp" ? data.region : "",
      },
      {
        colId: "territory",
        headerName: "Territory",
        ...sortableHeader("territory"),
        flex: 1.2,
        minWidth: 150,
        valueGetter: ({ data }) =>
          data?.rowType === "hcp"
            ? data.territory
            : "",
      },
      {
        colId: "hcpCount",
        headerName: "HCPs",
        ...sortableHeader("hcpCount"),
        flex: 0.7,
        minWidth: 85,
        type: "numericColumn",
        valueGetter: () => null,
        cellRendererSelector: ({ data }) =>
          data && data.rowType !== "hcp"
            ? {
              component: GroupMetricCell,
              params: {
                metric: "hcpCount",
              },
            }
            : undefined,
      },
      {
        colId: "calls",
        ...sortableHeader("calls"),
        headerName: "Calls",
        flex: 0.75,
        minWidth: 120,
        type: "numericColumn",
        valueGetter: ({ data }) => {
          if (data?.rowType !== "hcp") {
            return null;
          }

          return toNumericCalls(data.calls);
        },
        valueFormatter: ({ data, value }) => {
          if (data?.rowType !== "hcp") {
            return "";
          }

          return value === null
            ? "Invalid"
            : formatNumber(value);
        },
        cellRendererSelector: ({ data }) => {
          if (!data) {
            return undefined;
          }

          if (data.rowType === "hcp") {
            return {
              component: CallsCell,
            };
          }

          return {
            component: GroupMetricCell,
            params: {
              metric: "calls",
            },
          };
        },
      },
      {
        colId: "trx",
        headerName: "TRx",
        ...sortableHeader("trx"),
        flex: 0.75,
        minWidth: 90,
        type: "numericColumn",
        valueGetter: ({ data }) =>
          data?.rowType === "hcp" ? data.trx : null,
        valueFormatter: ({ value }) =>
          formatNumber(value),
        cellRendererSelector: ({ data }) =>
          data && data.rowType !== "hcp"
            ? {
              component: GroupMetricCell,
              params: {
                metric: "trx",
              },
            }
            : undefined,
      },
      {
        colId: "nrx",
        headerName: "NRx",
        ...sortableHeader("nrx"),

        flex: 0.75,
        minWidth: 90,
        type: "numericColumn",
        valueGetter: ({ data }) =>
          data?.rowType === "hcp" ? data.nrx : null,
        valueFormatter: ({ value }) =>
          formatNumber(value),
        cellRendererSelector: ({ data }) =>
          data && data.rowType !== "hcp"
            ? {
              component: GroupMetricCell,
              params: {
                metric: "nrx",
              },
            }
            : undefined,
      },
      {
        colId: "cpi",
        headerName: "CPI",
        ...sortableHeader("cpi"),
        flex: 0.75,
        minWidth: 95,
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
        cellRendererSelector: ({ data }) => {
          if (!data) {
            return undefined;
          }

          if (data.rowType === "hcp") {
            return {
              component: CpiCell,
            };
          }

          return {
            component: GroupMetricCell,
            params: {
              metric: "cpi",
            },
          };
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
          theme={gridTheme}
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