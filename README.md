# HCP Data Explorer

A responsive React and TypeScript application for exploring, grouping, sorting, filtering and editing 50,000 healthcare-provider records.

The project uses AG Grid Community for row virtualization while implementing Region → Territory grouping and aggregates in application code, avoiding reliance on AG Grid Enterprise features.

## Features

- Displays 50,000 deterministic HCP records.
- Virtualized rendering with AG Grid Community.
- Region → Territory → HCP hierarchy.
- Expandable Region and Territory groups.
- Live Region and Territory aggregates for HCP count, Calls, TRx, NRx, and CPI.
- Three-state sorting: ascending, descending, and original source order.
- Case-insensitive search by provider name or HCP ID.
- Region filtering and debounced matching-HCP counts.
- Inline Calls editing with asynchronous validation.
- Pending, saved, rejected, and race-safe edit feedback.
- Incremental aggregate updates after accepted edits.
- Undo and Redo for accepted Calls edits.
- Runtime tenant-theme switching with per-field fallback validation.
- Responsive layouts and accessible native controls.

## Technology

- React
- TypeScript
- Vite
- Redux Toolkit
- React Redux
- AG Grid Community
- Zod
- Jest
- React Testing Library
- Babel

No AG Grid Enterprise functionality is used.

## Submission notes

Approximate time spent: **2 working days**, including implementation, testing, performance validation, and documentation.

No AG Grid Enterprise functionality is used.

## Getting started

### Prerequisites

The submission was developed and tested with:

```text
Node.js 24.19.0
npm 11.17.0
```

### Installation

```bash
npm ci
```

### Start the development server

```bash
npm run dev
```

Open the URL printed by Vite, normally:

```text
http://localhost:5173
```

### Production build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Tests

```bash
npm test -- --runInBand
```

The CI pipeline runs lint, tests and the production build for every push and pull request.

### Coverage

```bash
npm run test:coverage -- --runInBand
```

Current coverage:

| Metric     | Coverage | Enforced threshold |
| ---------- | -------: | -----------------: |
| Statements |   60.90% |                60% |
| Branches   |   49.62% |                45% |
| Functions  |   47.18% |                45% |
| Lines      |   60.46% |                60% |

The test suite currently contains 32 tests across eight suites.

The explorer grid is loaded lazily so the application shell can render before the AG Grid bundle is downloaded.

## Using the application

### Search and filtering

Search is case-insensitive and matches:

- Provider name
- HCP ID

Search input is debounced by 150 milliseconds. Matching groups are automatically expanded without changing the user’s stored manual expansion state.

The Region filter is applied before search.

The “matching HCPs” count is independent of group expansion. Collapsing a Region or Territory does not change the number of matching records.

### Sorting

Click any sortable column header to cycle through:

```text
Unsorted → Ascending → Descending → Unsorted
```

Because the grid contains synthetic Region and Territory rows, AG Grid’s native flat sorting is intentionally disabled. Sorting is performed by memoized Redux selectors so that HCP rows remain inside their correct hierarchy.

Sorting rules include:

- Text comparisons are case-insensitive.
- Calls strings are converted and sorted numerically.
- Missing or invalid values remain last in both directions.
- Duplicate values retain deterministic source order.
- Numeric columns reorder Region and Territory groups using their aggregates.
- HCP rows are sorted only within their Territory.
- Returning to the unsorted state restores source order.

### Editing Calls

Calls can be edited directly in an HCP row.

1. Enter a non-negative whole number.
2. Click the ✓ button or press Enter.
3. The cell displays a pending indicator while validation runs.
4. Accepted edits update the row, CPI and group aggregates.
5. Rejected edits restore the last accepted value and expose the validation message.
6. Press Escape before submitting to discard the draft.

The supplied validator intentionally includes variable latency and simulated service failures. A valid value may occasionally return a simulated `503`; the edit can be retried.

Values above the per-HCP cap of 60 are rejected.

### Undo and Redo

Only successfully validated edits are added to history.

Undo and Redo update:

- The displayed Calls value
- HCP CPI
- Region aggregates
- Territory aggregates
- Active sort position

Undo and Redo are temporarily disabled while any Calls validation request is pending.

A new accepted edit after Undo clears the Redo history.

### Tenant themes

Use the Tenant Theme selector in the page header to switch themes at runtime.

Theme configuration is treated as untrusted input. Every field is validated separately with Zod:

- `appName`
- `primary`
- `onPrimary`
- `background`
- `surface`
- `text`
- `radius`

An invalid field falls back to the corresponding value from `DEFAULT_THEME` without discarding other valid tenant fields.

For example, Meridian retains its valid application name and surface colour, while its invalid primary colour and radius fall back independently.

The supplied `theme-config.ts` file is not modified.

## Architecture

### Source layout

```text
src/
  app/                  Application bootstrap, store and global styles
  domain/               HCP entities and domain calculations
  features/explorer/
    components/         Grid, toolbar and cell components
    selectors/          Derived explorer state and display rows
    state/              Redux slice and explorer state types
    utils/               Aggregation, sorting, grouping and edit helpers
    tests/               Explorer unit and component tests
  infrastructure/provided/
                        Supplied generator, validator and tenant config
  theme/                Tenant theme validation and resolution
  test/                 Shared test setup
```

### Stable record identity

The supplied dataset contains duplicate HCP IDs, so the business ID cannot safely serve as a React, Redux or AG Grid row key.

Each generated record receives an internal key based on its source position:

```text
hcp:<sourceIndex>
```

The original HCP ID remains visible and searchable but is not used as internal identity.

### Composite Territory identity

Territory labels such as `T1` repeat across Regions. Territory state and aggregates therefore use a composite key:

```text
territory:<region>:<territory>
```

This prevents collisions such as:

```text
Midwest → T1
National → T1
```

Each combination has independent records, aggregate totals and expansion state.

### Normalized Redux state

HCP records are stored with Redux Toolkit’s entity adapter.

The generated source records remain immutable. Accepted and pending Calls values are stored as small per-row edit overlays.

This avoids copying or replacing all 50,000 records after an edit.

### Derived display rows

A memoized selector builds the flattened row sequence expected by AG Grid:

```text
Region
  Territory
    HCP
    HCP
  Territory
Region
```

The selector combines:

- Group index
- Expansion state
- Search
- Region filter
- Active sort
- Accepted edit overlays
- Current aggregate state

AG Grid renders this flattened sequence using virtualized Community-edition rows.

### Aggregate updates

Initial Region and Territory aggregates are built in one pass over the generated data.

After an accepted Calls edit, Undo or Redo, only two aggregates are changed:

- The record’s Region aggregate
- The record’s composite Territory aggregate

The update uses the difference between the previous and next accepted value. It does not rescan all 50,000 records.

Pending and rejected values never affect aggregates.

### Race-safe validation

Every Calls validation request receives a unique Redux Toolkit request ID.

The edit state stores the most recent request ID for each HCP row. Fulfilled or rejected responses are applied only when their request ID still matches the latest request.

A slower response from an older request cannot overwrite a newer edit.

## Performance considerations

The application is designed around the 50,000-record requirement:

- AG Grid virtualizes rendered rows.
- Source records are generated once.
- Redux entities use stable internal keys.
- Group membership is indexed in one pass.
- Selectors are memoized.
- Search is debounced.
- The footer reports the currently rendered `.ag-row` count and the most recent grid-model operation time.
- Collapsed Territory records are not copied into the display-row array.
- Aggregates use incremental deltas after edits.
- Undo and Redo store compact commands rather than state snapshots.
- Row animation is disabled to avoid unnecessary work during large sorting changes.

Representative local measurements:

- Initial JavaScript bundle after lazy-loading the grid: 291.92 kB, 91.22 kB gzip.
- Deferred AG Grid chunk: 1,117.43 kB, 310.98 kB gzip.
- Typical visible DOM count: approximately 21 rows at the captured desktop viewport.
- Typical grid-model operation time: approximately 3 ms at the captured desktop viewport.

## Data-quality observations

The deterministic 50,000-row dataset contains:

| Observation                               |  Count |
| ----------------------------------------- | -----: |
| Total records                             | 50,000 |
| Duplicate HCP ID values                   |      5 |
| Additional duplicate rows                 |      5 |
| Missing specialties                       |    515 |
| Calls stored as strings                   |    236 |
| Invalid Calls values                      |      0 |
| Existing Calls values above validator cap |      4 |
| Records with zero TRx                     |    112 |

Existing source values above the validator cap are retained as legacy source data. The cap is enforced only when a user submits an edit.

CPI is undefined when TRx is zero and is displayed as `-`.

See [ASSUMPTIONS.md](./ASSUMPTIONS.md) for the full audit and handling decisions.

## Testing strategy

Tests focus on behavior with the highest regression risk:

- Calls normalization
- CPI calculation
- Duplicate HCP identity
- Data-quality auditing
- Composite Territory indexing
- Region and Territory aggregates
- Per-field tenant-theme fallback
- Numeric and text sorting
- Missing-value ordering
- Stable duplicate ordering
- Accepted Calls edit overlays
- Pending edit behavior
- Accepted aggregate deltas
- Rejected edits
- Stale async responses
- Undo and Redo
- Redo invalidation after a new edit
- Search and duplicate-ID matching
- Expansion-independent matching counts
- Calls-cell submission and rejection behavior

The supplied random validator is mocked at the component boundary. Redux state transitions are tested deterministically by dispatching pending, fulfilled and rejected thunk actions directly.

## FR-5 bulk-edit design

Bulk editing is intentionally documented as a design extension rather than implemented in the current UI. This is consistent with the assignment treating FR-5 as a design requirement. The existing stable `rowKey` and command-history model are the foundation for it.

The additional state would be:

```ts
interface BulkOperation {
  operationId: string;
  rowKeys: HcpRowKey[];
  status: "pending" | "settled";
  results: Partial<
    Record<
      HcpRowKey,
      {
        status: "pending" | "applied" | "rejected";
        previousValue: number | null;
        nextValue: number;
        error?: string;
      }
    >
  >;
  appliedCount: number;
  rejectedCount: number;
}
```

Selection would remain in Redux and support both individual HCP rows and whole Territory groups. Selecting a Territory resolves to the stable row keys in `rowKeysByTerritory`; it does not store a second copy of the records.

The `+10% Calls` event flow would be:

1. Resolve selected HCP row keys and calculate each next whole-number Calls value from its accepted value.
2. Create one `BulkOperation` with every target marked pending.
3. Start one `validateCalls()` promise per row concurrently.
4. Apply each fulfilled result independently, updating only that row's accepted overlay and its Region/Territory aggregate deltas.
5. Store each rejection reason without changing that row's aggregate or history.
6. When all promises settle, show `N applied, M rejected` and retain the operation result for exactly one undo command.

Rows already pending from another edit are excluded from the operation and reported as rejected with a local `already pending` reason. A failed validation never contributes to the applied subset.

## FR-6 undo-at-scale design

The bulk operation would be represented by one history command containing only the applied entries:

```ts
interface BulkEditCommand {
  commandId: string;
  operationId: string;
  entries: Array<{
    rowKey: HcpRowKey;
    previousValue: number | null;
    nextValue: number;
  }>;
}
```

Undo would apply all entries as one transaction: update the accepted overlays, adjust each affected Region and Territory by its delta, move the command from `past` to `future`, and restore the prior selection state. It would not call the validator again because the command represents already accepted values. Redo would replay the same accepted values without revalidation.

If an affected row is inside a collapsed group, undo first marks its Region and Territory expanded, then asks the grid API to ensure the row is visible and focused. If the row is excluded by the active search or Region filter, the command still applies; the UI reports the result and offers a `clear filters` action rather than changing the user's filter unexpectedly.

While a bulk operation is pending, undo and redo are disabled. Late responses are ignored using the operation ID and per-row request IDs, so a stale response cannot enter the applied subset after settlement.

## Project structure

```text
src/
├── app/                      # Bootstrap, Redux store and global styles
├── domain/                   # HCP entities and domain calculations
├── features/explorer/
│   ├── components/           # Grid, toolbar and cell components
│   ├── selectors/            # Derived explorer state
│   ├── state/                # Redux slice and state types
│   ├── tests/                # Explorer tests
│   └── utils/                # Aggregation, grouping, sorting and editing
├── infrastructure/provided/  # Supplied black-box starter files
├── theme/                    # Runtime theme validation
└── test/                     # Shared test setup
```

## Additional documentation

- [ASSUMPTIONS.md](./ASSUMPTIONS.md)

## Known limitations

- Edits and history are stored in memory and reset after a page refresh.
- The validator is a supplied client-side mock rather than a persistent backend.
- Grouping is intentionally implemented in application code because AG Grid Community does not provide Enterprise row grouping.
- Aggregate values represent the complete underlying group, not only the current search matches. Search controls row visibility but does not redefine aggregate meaning.

## What I would do differently with more time

- Implement the FR-5 bulk-selection and partial-validation workflow in working code, using the documented operation and command models.
- Add automated accessibility assertions for the grid footer, keyboard focus, live validation messages, and group controls.
- Profile scrolling and selector execution with browser performance traces across several viewport sizes.
- Split the deferred AG Grid chunk further if the application needed a faster first interaction on constrained networks.

## Reviewer walkthrough

A quick verification path:

1. Search for an HCP name and confirm matching groups expand.
2. Search for a duplicated HCP ID and confirm both records appear.
3. Filter to one Region.
4. Expand a Region and Territory.
5. Cycle Calls sorting through all three states.
6. Edit Calls to a value at or below 60.
7. Confirm pending and saved feedback.
8. Confirm CPI and aggregates update after acceptance.
9. Submit 61 and confirm rejection/restoration.
10. Use Undo and Redo.
11. Switch between Default, Aurelia and Meridian themes.
12. Run the test and production-build commands.
