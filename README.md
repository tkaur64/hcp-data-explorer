# HCP Data Explorer

A responsive React and TypeScript application for exploring, grouping, sorting, filtering and editing 50,000 healthcare-provider records.

The project uses AG Grid Community for row virtualization while implementing Region → Territory grouping and aggregates in application code, avoiding reliance on AG Grid Enterprise features.

## Features

- Displays 50,000 deterministic HCP records.
- Virtualized rendering with AG Grid Community.
- Region → Territory → HCP hierarchy.
- Expandable Region and Territory groups.
- Live Region and Territory aggregates:
  - HCP count
  - Calls
  - TRx
  - NRx
  - CPI

- Three-state sorting:
  - Ascending
  - Descending
  - Original source order

- Case-insensitive search by provider name or HCP ID.
- Region filtering.
- Debounced search with live matching-HCP count.
- Inline Calls editing with asynchronous validation.
- Pending, saved and rejected edit feedback.
- Race-safe latest-request-wins behavior.
- Incremental aggregate updates after accepted edits.
- Undo and Redo for accepted Calls edits.
- Runtime tenant-theme switching.
- Per-field validation and fallback for untrusted theme configuration.
- Responsive layouts and accessible native controls.
- Jest and React Testing Library coverage for business logic, state transitions and editing interactions.

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
| Statements |   61.30% |                60% |
| Branches   |   48.50% |                45% |
| Functions  |   47.44% |                45% |
| Lines      |   60.86% |                60% |

The test suite currently contains 29 tests across seven suites.

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
- Collapsed Territory records are not copied into the display-row array.
- Aggregates use incremental deltas after edits.
- Undo and Redo store compact commands rather than state snapshots.
- Row animation is disabled to avoid unnecessary work during large sorting changes.

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

See [DATA_QUALITY.md](./DATA_QUALITY.md) for the full audit and handling decisions.

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

## Project structure

```text
src/
├── app/
│   ├── hooks.ts
│   └── store.ts
├── domain/
│   └── hcp.ts
├── features/
│   └── explorer/
│       ├── components/
│       ├── buildAggregates.ts
│       ├── callsEditing.ts
│       ├── callsValues.ts
│       ├── displayRows.ts
│       ├── explorerSelectors.ts
│       ├── explorerSlice.ts
│       ├── explorerTypes.ts
│       ├── groupIndex.ts
│       └── sorting.ts
├── provided/
│   ├── data-generator.ts
│   ├── mock-validator.ts
│   └── theme-config.ts
├── test/
│   └── setupTests.ts
├── theme/
│   └── resolveTenantTheme.ts
├── App.tsx
└── main.tsx
```

## Additional documentation

- [ASSUMPTIONS.md](./ASSUMPTIONS.md)
- [DATA_QUALITY.md](./DATA_QUALITY.md)

## Known limitations

- Edits and history are stored in memory and reset after a page refresh.
- The validator is a supplied client-side mock rather than a persistent backend.
- Grouping is intentionally implemented in application code because AG Grid Community does not provide Enterprise row grouping.
- Aggregate values represent the complete underlying group, not only the current search matches. Search controls row visibility but does not redefine aggregate meaning.

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
