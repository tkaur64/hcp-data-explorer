import { toNumericCalls } from "../../../domain/hcp";
import type { HcpEntity } from "../../../domain/hcp";
import type { Aggregate, ExplorerAggregates } from "../state/explorerTypes";
import { createTerritoryRowKey } from "./displayRows";

function createEmptyAggregate(): Aggregate {
  return {
    calls: 0,
    trx: 0,
    nrx: 0,
    hcpCount: 0,
    invalidCallsCount: 0,
  };
}

function addRecordToAggregate(aggregate: Aggregate, record: HcpEntity): void {
  const numericCalls = toNumericCalls(record.calls);

  aggregate.hcpCount += 1;
  aggregate.trx += record.trx;
  aggregate.nrx += record.nrx;

  if (numericCalls === null) {
    aggregate.invalidCallsCount += 1;
  } else {
    aggregate.calls += numericCalls;
  }
}

export function buildAggregates(records: HcpEntity[]): ExplorerAggregates {
  const aggregates: ExplorerAggregates = {
    regions: {},
    territories: {},
  };

  for (const record of records) {
    const regionAggregate =
      aggregates.regions[record.region] ??
      (aggregates.regions[record.region] = createEmptyAggregate());

    const territoryKey = createTerritoryRowKey(record.region, record.territory);

    const territoryAggregate =
      aggregates.territories[territoryKey] ??
      (aggregates.territories[territoryKey] = createEmptyAggregate());
    addRecordToAggregate(regionAggregate, record);
    addRecordToAggregate(territoryAggregate, record);
  }

  return aggregates;
}
