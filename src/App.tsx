import "./App.css";
import { useAppSelector } from "./app/hooks";
import {
  selectExplorerSummary,
  selectRegionNames,
} from "./features/explorer/explorerSelectors";

function App() {
  const summary = useAppSelector(selectExplorerSummary);
  const regions = useAppSelector(selectRegionNames);

  return (
    <main>
      <h1>HCP Data Explorer</h1>

      <h2>Redux state verification</h2>

      <dl>
        <dt>HCP records</dt>
        <dd>{summary.totalRecords.toLocaleString()}</dd>

        <dt>Regions</dt>
        <dd>{summary.regionCount}</dd>

        <dt>Territories</dt>
        <dd>{summary.territoryCount}</dd>

        <dt>Edited rows</dt>
        <dd>{summary.editedRowCount}</dd>
      </dl>

      <h2>Regions</h2>
      <p>{regions.join(", ")}</p>
    </main>
  );
}

export default App;