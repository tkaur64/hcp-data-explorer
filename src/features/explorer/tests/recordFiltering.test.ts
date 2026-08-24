import { describe, expect, test } from "@jest/globals";

import type { HcpEntity } from "../../../domain/hcp";
import {
  matchesHcpSearch,
  normalizeSearchQuery,
} from "../utils/recordFiltering";

const entity: HcpEntity = {
  id: "HCP-001",
  name: "Anita Sharma",
  specialty: "Oncology",
  region: "Midwest",
  territory: "T1",
  calls: 10,
  trx: 20,
  nrx: 5,
  rowType: "hcp",
  rowKey: "hcp:0",
  sourceIndex: 0,
};

describe("record filtering", () => {
  test("normalizes whitespace and case", () => {
    expect(normalizeSearchQuery("  ANITA  ")).toBe("anita");
  });

  test("matches provider names and HCP IDs", () => {
    expect(matchesHcpSearch(entity, "sharma")).toBe(true);
    expect(matchesHcpSearch(entity, "001")).toBe(true);
    expect(matchesHcpSearch(entity, "cardiology")).toBe(false);
  });

  test("matches every entity when the query is empty", () => {
    expect(matchesHcpSearch(entity, "")).toBe(true);
  });
});
