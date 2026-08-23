# Assumptions and Data-Quality Decisions

This is a living document. It records the data-quality issues discovered in the supplied deterministic dataset and the decisions made for identity, rendering, sorting, filtering, aggregation, editing, and computed values.

## 1. Supplied Files and Source Data

- `data-generator.ts`, `mock-validator.ts`, and `theme-config.ts` are treated as supplied black boxes and are not modified.
- The application uses `generateRows(42, 50000)`.
- Generated records are preserved in their original form.
- Data-quality handling is performed through derived values and edit overlays rather than by rewriting the generated records.

## 2. Stable Row Identity

The displayed HCP `id` is not unique and therefore cannot safely identify:

- AG Grid rows
- Selected records
- Cell edits
- Pending validation requests
- Undo and redo commands

Each record receives an internal key based on its original deterministic array position:

```text
hcp:<sourceIndex>
```

Examples:

```text
hcp:0
hcp:125
hcp:49999
```

The displayed HCP ID remains unchanged.

This approach is appropriate because the supplied generator is deterministic and produces records in a stable order. In a production application backed by an API, a persistent unique identifier supplied by the backend would be preferred.

## 3. Observed Data-Quality Issues

| Issue | Count |
| --- | ---: |
| Total records | 50,000 |
| Duplicate HCP ID values | 5 |
| Additional rows carrying duplicate IDs | 5 |
| Missing specialties | 515 |
| Calls stored as numeric strings | 236 |
| Non-numeric Calls values | 0 |
| Calls values above the validator cap | 4 |
| Records with TRx equal to zero | 112 |

## 4. Duplicate HCP IDs

- Duplicate IDs are displayed exactly as supplied.
- Each duplicate record remains independently editable and selectable.
- Searching for a duplicated ID returns every matching record.
- Internal `rowKey`, rather than the displayed HCP ID, is used by AG Grid and Redux.
- Sorting and filtering never change the internal identity of a record.

## 5. Missing Specialties

- A `null` specialty is displayed as `Not provided`.
- Missing specialties sort after defined specialties in both ascending and descending order.
- The original `null` value remains unchanged in source state.

## 6. Calls Stored as Strings

The `calls` field has the supplied type:

```ts
number | string
```

Finite numeric strings such as `"25"` are handled as follows:

- They are interpreted as the number `25` for sorting, aggregation, CPI, validation, and editing.
- They are rendered using the same number formatting as numeric Calls values.
- The original string remains unchanged in the immutable source record.
- Conversion occurs through one documented derived-value function.

## 7. Invalid Calls Values

The generated dataset currently contains no non-numeric Calls strings. The application nevertheless handles them defensively:

- Empty or non-numeric Calls values are treated as invalid.
- Invalid Calls values sort after valid numeric values.
- They are excluded from numeric aggregates and CPI calculations.
- The UI displays an explicit invalid-value state rather than `NaN` or `Infinity`.

## 8. Calls Above the Validator Cap

Four source records contain a Calls value of `99999`, exceeding the supplied validation cap of 60.

- These source values are not silently corrected or removed.
- They remain visible and are visually identified as source-data outliers.
- They participate in initial numeric sorting and aggregates because they are finite values present in the supplied source data.
- The validation cap applies whenever a user commits a new edit.
- An accepted edit becomes the effective displayed value without mutating the immutable source record.

## 9. CPI Calculation

CPI is calculated as:

```text
Calls / TRx * 100
```

For an individual record:

- Calls must be convertible to a finite number.
- TRx must be greater than zero.
- When either condition is not satisfied, CPI is undefined.
- Undefined CPI is displayed as `-`.
- `NaN` and `Infinity` are never rendered.

For a group:

```text
Group CPI = Sum of effective Calls / Sum of TRx * 100
```

- Group CPI is calculated from aggregate totals.
- It is not calculated by averaging individual row CPI values.
- Calls belonging to a row with zero TRx remain part of the group Calls total.
- Group CPI is undefined only when the group TRx total is zero.

## 10. Sorting Semantics

- Sorting follows the required three-state cycle: ascending, descending, and none.
- Sorting is stable.
- Equal values retain their original source order.
- Returning to `none` restores the original generated order within each territory.
- Numeric Calls strings participate in numeric rather than lexicographic sorting.
- Invalid numeric values and missing text values sort last.
- When a numeric column is sorted, region and territory groups are ordered by that column's aggregate value.
- Text comparisons are case-insensitive.
- HCP records remain inside their original region and territory groups.

## 11. Search and Region Filtering

- Search is case-insensitive.
- Search matches substrings in HCP name or displayed HCP ID.
- Leading and trailing whitespace is ignored.
- Searching temporarily expands the region and territory groups containing matching records.
- Search-driven expansion does not overwrite the user's manual expansion choices.
- Clearing the search restores the previous manual expansion state.
- The region filter is applied before search.
- A duplicated HCP ID may therefore produce multiple search results.

## 12. Calls Editing

- Only the Calls column is editable.
- An edit must be a finite, non-negative whole number before being sent to the supplied validator.
- Values above 60 are still sent to the validator so that the supplied asynchronous rejection behaviour remains observable.
- A no-op edit does not trigger validation and does not create an undo command.
- Committing an edit moves the cell through:

```text
editing -> pending -> saved or rejected
```

- A pending cell is locked against further edits.
- Other non-pending rows remain editable while validation is in progress.
- Pending values are visually distinguishable but do not affect group aggregates or CPI.
- An accepted value updates the effective value, relevant aggregates, and undo history.
- A rejected value reverts to the previous effective value and displays the rejection reason.
- Async responses carry a request identifier. A response is applied only if it still matches the current pending request for that row.
- Late or stale responses are ignored.

## 13. Undo and Redo

- Undo and redo use commands rather than full-dataset snapshots.
- A command stores the stable row key, previous effective Calls value, and next effective Calls value.
- Commands are added only after successful validation.
- Rejected and no-op edits do not enter history.
- Undo and redo are independent of the current sort, filter, and grouping state.
- Undo and redo controls are temporarily disabled while validations are pending to prevent ambiguous command ordering.
- Creating a new accepted edit after an undo clears the redo stack.

## 14. Aggregate Update Timing

- Initial aggregates are calculated from the generated source records.
- Pending edits are excluded from aggregates.
- Rejected edits do not change aggregates.
- Accepted edits update only the affected territory and region totals using the difference between the previous and accepted Calls values.
- The full 50,000-record dataset is not rescanned after every accepted edit.

## 15. Runtime Tenant Themes

- Tenant configuration is treated as untrusted input.
- Every theme field is validated independently.
- An invalid or missing field falls back to the corresponding field in `DEFAULT_THEME`.
- A bad value in one field does not cause the entire tenant theme to fall back.
- Switching tenants does not reset filters, grouping, edits, pending state, or undo history.
- Editing, pending, saved, rejected, and outlier states use more than colour alone so they remain distinguishable under every supplied tenant theme.
