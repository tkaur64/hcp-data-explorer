import { toNumericCalls, type HcpEntity } from "../../domain/hcp";
import type { CallsEditState } from "./explorerTypes";

export function getAcceptedCalls(
  entity: HcpEntity,
  edit: CallsEditState | undefined,
): number | null {
  return edit?.acceptedValue ?? toNumericCalls(entity.calls);
}

export function getDisplayedCalls(
  entity: HcpEntity,
  edit: CallsEditState | undefined,
): number | null {
  return edit?.pendingValue ?? getAcceptedCalls(entity, edit);
}
