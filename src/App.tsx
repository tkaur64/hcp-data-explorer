import "./App.css";
import { generateRows } from "./provided/data-generator";
import {
  auditRows,
  createHcpEntities,
} from "./domain/hcp";

const rawRecords = generateRows(42, 50000);
const hcpEntities = createHcpEntities(rawRecords);
const dataQualityReport = auditRows(rawRecords);

function App() {
  return (
    <main>
      <h1>HCP Data Explorer</h1>

      <p>Generated entities: {hcpEntities.length.toLocaleString()}</p>

      <h2>Data-quality audit</h2>

      <pre>{JSON.stringify(dataQualityReport, null, 2)}</pre>
    </main>
  );
}

export default App;