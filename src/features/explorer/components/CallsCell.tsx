import { useState, type KeyboardEvent } from "react";
import type { CustomCellRendererProps } from "ag-grid-react";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import type { HcpEntity } from "../../../domain/hcp";
import type { ExplorerDisplayRow } from "../utils/displayRows";
import { submitCallsEdit } from "../utils/callsEditing";
import { getDisplayedCalls } from "../utils/callsValues";
import type { CallsEditState } from "../state/explorerTypes";

export function CallsCell({
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

  const displayedValue =
    data?.rowType === "hcp"
      ? getDisplayedCalls(data, edit)
      : null;

  const displayedText =
    displayedValue === null
      ? ""
      : String(displayedValue);

  if (!data || data.rowType !== "hcp") {
    return null;
  }

  return (
    <CallsCellEditor
      key={`${data.rowKey}:${displayedText}:${edit?.status ?? ""}:${edit?.error ?? ""}`}
      data={data}
      edit={edit}
      displayedValue={displayedValue}
      displayedText={displayedText}
    />
  );
}

interface CallsCellEditorProps {
  data: HcpEntity;
  edit: CallsEditState | undefined;
  displayedValue: number | null;
  displayedText: string;
}

function CallsCellEditor({
  data,
  edit,
  displayedValue,
  displayedText,
}: CallsCellEditorProps) {
  const dispatch = useAppDispatch();
  const statusId = `calls-status-${data.rowKey}`;

  const [draft, setDraft] =
    useState(displayedText);

  const [localError, setLocalError] =
    useState<string | null>(null);

  const hasDraftChange = draft !== displayedText;

  const commitDraft = () => {
    const normalizedDraft = draft.trim();

    if (normalizedDraft === "") {
      setLocalError("Calls is required");
      return;
    }

    const newValue = Number(normalizedDraft);

    if (
      !Number.isFinite(newValue) ||
      !Number.isInteger(newValue) ||
      newValue < 0
    ) {
      setLocalError(
        "Calls must be a non-negative whole number",
      );
      return;
    }

    setLocalError(null);

    if (newValue === displayedValue) {
      setDraft(displayedText);
      return;
    }

    void dispatch(
      submitCallsEdit({
        rowKey: data.rowKey,
        newValue,
      }),
    );
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(displayedText);
      setLocalError(null);
    }
  };

  const errorMessage =
    localError ??
    (edit?.status === "rejected"
      ? edit.error
      : undefined);

  const statusMessage =
    errorMessage ??
    (hasDraftChange
      ? "Unsaved Calls value"
      : edit?.status === "pending"
        ? "Validating Calls"
        : edit?.status === "saved"
          ? "Calls saved"
          : undefined);

  const indicator =
    errorMessage
      ? "!"
      : edit?.status === "pending"
        ? "…"
        : edit?.status === "saved"
          ? "✓"
          : null;

  return (
    <div
      className={[
        "calls-cell",
        edit?.status === "pending"
          ? "calls-cell--pending"
          : "",
        errorMessage
          ? "calls-cell--rejected"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={statusMessage}
    >
      <input
        className="calls-cell__input"
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={draft}
        disabled={edit?.status === "pending"}
        onChange={(event) => {
          setDraft(event.target.value);
          setLocalError(null);
        }}
        onKeyDown={handleKeyDown}
        onClick={(event) =>
          event.stopPropagation()
        }
        aria-label={`Calls for ${data.name}`}
        aria-invalid={Boolean(errorMessage)}
        aria-busy={edit?.status === "pending"}
        aria-describedby={statusMessage ? statusId : undefined}
      />

      {hasDraftChange ? (
        <button
          type="button"
          className="calls-cell__save"
          onClick={(event) => {
            event.stopPropagation();
            commitDraft();
          }}
          aria-label={`Save Calls for ${data.name}`}
          title="Save Calls"
        >
          ✓
        </button>
      ) : (
        indicator && (
          <span
            className={[
              "calls-cell__indicator",
              edit?.status === "saved" && !errorMessage
                ? "calls-cell__indicator--saved"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            {indicator}
          </span>
        )
      )}

      {statusMessage && (
        <span
          id={statusId}
          className="calls-cell__status"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </span>
      )}
    </div>
  );
}