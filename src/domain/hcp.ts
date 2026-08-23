import type { HcpRecord } from "../provided/data-generator";

export type HcpRowKey = `hcp:${number}`;

export interface HcpEntity extends HcpRecord {
  rowKey: HcpRowKey;
  sourceIndex: number;
}

export interface DataQualityReport {
  totalRecords: number;
  duplicateIdValues: number;
  duplicateRows: number;
  missingSpecialties: number;
  callsStoredAsStrings: number;
  invalidCalls: number;
  callsAboveValidatorCap: number;
  zeroTrx: number;
}

export function createHcpEntities(records: HcpRecord[]): HcpEntity[] {
  return records.map((record, sourceIndex) => ({
    ...record,
    rowKey: `hcp:${sourceIndex}`,
    sourceIndex,
  }));
}

export function toNumericCalls(value: number | string): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function calculateCpi(
  calls: number | string,
  trx: number,
): number | null {
  const numericCalls = toNumericCalls(calls);

  if (numericCalls === null || !Number.isFinite(trx) || trx <= 0) {
    return null;
  }

  return (numericCalls / trx) * 100;
}

export function auditRows(records: HcpRecord[]): DataQualityReport {
  const idCounts = new Map<string, number>();

  let missingSpecialties = 0;
  let callsStoredAsStrings = 0;
  let invalidCalls = 0;
  let callsAboveValidatorCap = 0;
  let zeroTrx = 0;

  for (const record of records) {
    idCounts.set(record.id, (idCounts.get(record.id) ?? 0) + 1);

    if (record.specialty === null) {
      missingSpecialties += 1;
    }

    if (typeof record.calls === "string") {
      callsStoredAsStrings += 1;
    }

    const numericCalls = toNumericCalls(record.calls);

    if (numericCalls === null) {
      invalidCalls += 1;
    } else if (numericCalls > 60) {
      callsAboveValidatorCap += 1;
    }

    if (record.trx === 0) {
      zeroTrx += 1;
    }
  }

  const duplicateCounts = [...idCounts.values()].filter((count) => count > 1);

  return {
    totalRecords: records.length,
    duplicateIdValues: duplicateCounts.length,
    duplicateRows: duplicateCounts.reduce(
      (total, count) => total + count - 1,
      0,
    ),
    missingSpecialties,
    callsStoredAsStrings,
    invalidCalls,
    callsAboveValidatorCap,
    zeroTrx,
  };
}
