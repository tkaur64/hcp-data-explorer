import type { HcpEntity } from "../../../domain/hcp";

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

export function matchesHcpSearch(
  entity: HcpEntity,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return (
    entity.name.toLocaleLowerCase().includes(normalizedQuery) ||
    entity.id.toLocaleLowerCase().includes(normalizedQuery)
  );
}
