import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home">
      <h1>LARP Character Manager</h1>
      <p>
        Build a ruleset, then build characters against it. The rules engine
        enforces costs, prerequisites and archetype gating so a sheet cannot
        drift out of legality.
      </p>
      <div className="actions">
        <Link to="/projects" className="button button-primary">
          Open Projects
        </Link>
      </div>
    </div>
  );
}
