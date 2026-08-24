import {
  lazy,
  Suspense,
  type CSSProperties,
} from "react";

import "./App.css";
import {
  useAppDispatch,
  useAppSelector,
} from "./hooks";
import { ExplorerToolbar } from "../features/explorer/components/ExplorerToolbar";
import { selectExplorerSummary } from "../features/explorer/selectors/explorerSelectors";
import { setTenantKey } from "../features/explorer/state/explorerSlice";
import {
  resolveTenantTheme,
  TENANT_THEME_KEYS,
} from "../theme/resolveTenantTheme";

const ExplorerGrid = lazy(() =>
  import("../features/explorer/components/ExplorerGrid").then(
    ({ ExplorerGrid: grid }) => ({ default: grid }),
  ),
);

function formatTenantName(tenantKey: string): string {
  return (
    tenantKey.charAt(0).toLocaleUpperCase() +
    tenantKey.slice(1)
  );
}

function App() {
  const dispatch = useAppDispatch();
  const summary = useAppSelector(selectExplorerSummary);

  const tenantKey = useAppSelector(
    (state) => state.explorer.tenantKey,
  );

  const tenantTheme =
    resolveTenantTheme(tenantKey);

  const themeVariables = {
    "--tenant-primary": tenantTheme.primary,
    "--tenant-on-primary": tenantTheme.onPrimary,
    "--tenant-background": tenantTheme.background,
    "--tenant-surface": tenantTheme.surface,
    "--tenant-text": tenantTheme.text,
    "--tenant-radius": `${tenantTheme.radius}px`,
  } as CSSProperties;

  return (
    <main
      className="app-shell"
      style={themeVariables}
    >
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">
            Field intelligence
          </p>

          <h1>{tenantTheme.appName}</h1>

          <p className="app-header__subtitle">
            {summary.totalRecords.toLocaleString()} healthcare
            provider records
          </p>
        </div>

        <label className="tenant-switcher">
          <span>Tenant theme</span>

          <select
            value={tenantKey}
            onChange={(event) =>
              dispatch(
                setTenantKey(event.target.value),
              )
            }
          >
            <option value="default">Default</option>

            {TENANT_THEME_KEYS.map((key) => (
              <option key={key} value={key}>
                {formatTenantName(key)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <ExplorerToolbar />

      <Suspense fallback={<p className="app-loading">Loading explorer...</p>}>
        <ExplorerGrid tenantTheme={tenantTheme} />
      </Suspense>
    </main>
  );
}

export default App;