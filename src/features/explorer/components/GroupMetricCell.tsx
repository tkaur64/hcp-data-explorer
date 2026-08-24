import type { CustomCellRendererProps } from "ag-grid-react";
import { calculateCpi } from "../../../domain/hcp";
import { useAppSelector } from "../../../app/hooks";
import type { ExplorerDisplayRow } from "../utils/displayRows";

export type GroupMetric =
  | "calls"
  | "trx"
  | "nrx"
  | "hcpCount"
  | "cpi";

type GroupMetricCellProps =
  CustomCellRendererProps<ExplorerDisplayRow> & {
    metric: GroupMetric;
  };

const metricLabels: Record<GroupMetric, string> = {
  calls: "Calls",
  trx: "TRx",
  nrx: "NRx",
  hcpCount: "HCP count",
  cpi: "CPI",
};

export function GroupMetricCell({
  data,
  metric,
}: GroupMetricCellProps) {
  const aggregate = useAppSelector((state) => {
    if (data?.rowType === "region") {
      return state.explorer.aggregates.regions[
        data.region
      ];
    }

    if (data?.rowType === "territory") {
      return state.explorer.aggregates.territories[
        data.rowKey
      ];
    }

    return undefined;
  });

  if (!aggregate) {
    return null;
  }

  if (metric === "cpi") {
    const cpi = calculateCpi(
      aggregate.calls,
      aggregate.trx,
    );

    return (
      <span
        className="group-metric"
        aria-label={`${metricLabels[metric]} ${cpi === null ? "undefined" : cpi.toFixed(2)
          }`}
      >
        {cpi === null ? "-" : `${cpi.toFixed(2)}%`}
      </span>
    );
  }

  const value = aggregate[metric];

  return (
    <span
      className="group-metric"
      aria-label={`${metricLabels[metric]} ${value}`}
    >
      {value.toLocaleString()}
    </span>
  );
}