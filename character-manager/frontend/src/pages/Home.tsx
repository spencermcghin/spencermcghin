import { Link } from 'react-router-dom';
import Ornament from '../components/Ornament';
import { useAuth } from '../auth/useAuth';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="home">
      <p className="home-eyebrow">Rules engine &amp; character forge</p>
      <h1>LARP Character Manager</h1>

      <p className="lede">
        Build a ruleset, then build characters against it. The engine enforces
        costs, prerequisites and archetype gating, so a sheet cannot quietly
        drift out of legality.
      </p>

      <Ornament />

      <div className="actions">
        {loading ? null : user ? (
          <Link to="/projects" className="button button-primary">
            Open Projects
          </Link>
        ) : (
          <>
            <Link to="/signin" className="button button-primary">
              Create an account
            </Link>
            <Link to="/signin" className="button">
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
