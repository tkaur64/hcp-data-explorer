import {
  useEffect,
  useState,
} from "react";
import {
  useAppDispatch,
  useAppSelector,
} from "../../../app/hooks";
import {
  selectDisplayRows,
  selectRegionNames,
} from "../explorerSelectors";
import {
  setRegionFilter,
  setSearchQuery,
} from "../explorerSlice";
import "./ExplorerToolbar.css";

export function ExplorerToolbar() {
  const dispatch = useAppDispatch();

  const regions = useAppSelector(selectRegionNames);
  const displayRows = useAppSelector(selectDisplayRows);

  const storedQuery = useAppSelector(
    (state) => state.explorer.view.searchQuery,
  );

  const regionFilter = useAppSelector(
    (state) => state.explorer.view.regionFilter,
  );

  const [searchTerm, setSearchTerm] =
    useState(storedQuery);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      dispatch(setSearchQuery(searchTerm));
    }, 150);

    return () => window.clearTimeout(timer);
  }, [dispatch, searchTerm]);

  const visibleHcpCount = displayRows.reduce(
    (count, row) =>
      row.rowType === "hcp" ? count + 1 : count,
    0,
  );

  return (
    <section
      className="explorer-toolbar"
      aria-label="Grid search and filters"
    >
      <label className="toolbar-field toolbar-field--search">
        <span>Search name or HCP ID</span>

        <div className="search-control">
          <input
            type="search"
            value={searchTerm}
            placeholder="Search providers..."
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />

          {searchTerm && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchTerm("")}
            >
              Clear
            </button>
          )}
        </div>
      </label>

      <label className="toolbar-field">
        <span>Region</span>

        <select
          value={regionFilter ?? ""}
          onChange={(event) =>
            dispatch(
              setRegionFilter(
                event.target.value || null,
              ),
            )
          }
        >
          <option value="">All regions</option>

          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </label>

      <p
        className="toolbar-result"
        aria-live="polite"
      >
        {visibleHcpCount.toLocaleString()} matching HCPs
      </p>
    </section>
  );
}