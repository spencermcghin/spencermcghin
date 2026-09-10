import { Link } from 'react-router-dom';
import Ornament from '../components/Ornament';
import { useAuth } from '../auth/useAuth';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="home">
      <p className="home-eyebrow">For live-action games</p>
      <h1>Larpworks</h1>

      <p>Your game's rules, characters, story and players, all in one place.</p>

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
