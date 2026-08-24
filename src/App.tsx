import "./App.css";
import { useAppSelector } from "./app/hooks";
import { ExplorerGrid } from "./features/explorer/components/ExplorerGrid";
import { selectExplorerSummary } from "./features/explorer/explorerSelectors";

function App() {
  const summary = useAppSelector(selectExplorerSummary);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">
            Field intelligence
          </p>

          <h1>HCP Data Explorer</h1>

          <p className="app-header__subtitle">
            {summary.totalRecords.toLocaleString()} healthcare
            provider records
          </p>
        </div>
      </header>

      <ExplorerGrid />
    </main>
  );
}

export default App;