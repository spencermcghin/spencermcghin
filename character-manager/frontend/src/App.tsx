import { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CharacterSheet from './pages/CharacterSheet';
import SignIn from './pages/SignIn';
import JoinProject from './pages/JoinProject';
import AdminUsers from './pages/AdminUsers';
import RulesetEditor from './pages/RulesetEditor';
import StoryMap from './pages/StoryMap';
import ProjectCharacters from './pages/ProjectCharacters';
import ThemeSwitcher from './components/ThemeSwitcher';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { useAuth } from './auth/useAuth';
import './App.css';

function NavAuth() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (!user) {
    return <Link to="/signin">Sign in</Link>;
  }

  return (
    <div className="nav-user">
      <span className="nav-user-name" title={user.email}>
        {user.displayName}
      </span>
      <button
        className="nav-signout"
        onClick={async () => {
          await logout();
          navigate('/');
        }}
      >
        Sign out
      </button>
    </div>
  );
}

/** The accounts page is only meaningful to app admins, so it is only offered
 *  to them. The API enforces the restriction regardless. */
function NavAdmin() {
  const { user } = useAuth();
  if (user?.appRole !== 'admin') return null;
  return <NavLink to="/admin">Accounts</NavLink>;
}

function Shell() {
  /* On a phone the links collapse behind a toggle; navigating anywhere
     closes the menu again, so it never lingers over the new page. */
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setNavOpen(false), [location.pathname]);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand">Larpworks</Link>
          <button
            className="nav-toggle"
            aria-expanded={navOpen}
            aria-label={navOpen ? 'Close the menu' : 'Open the menu'}
            onClick={() => setNavOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`nav-links ${navOpen ? 'is-open' : ''}`}>
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/projects">Projects</NavLink>
            <NavAdmin />
            <NavAuth />
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route
            path="/projects"
            element={
              <RequireAuth>
                <Projects />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <RequireAuth>
                <ProjectDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:id/edit"
            element={
              <RequireAuth>
                <RulesetEditor />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:id/story"
            element={
              <RequireAuth>
                <StoryMap />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:id/story/:entryId"
            element={
              <RequireAuth>
                <StoryMap />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:id/characters"
            element={
              <RequireAuth>
                <ProjectCharacters />
              </RequireAuth>
            }
          />
          <Route
            path="/join/:token"
            element={
              <RequireAuth>
                <JoinProject />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminUsers />
              </RequireAuth>
            }
          />
          <Route
            path="/characters/:id"
            element={
              <RequireAuth>
                <CharacterSheet />
              </RequireAuth>
            }
          />
          {/* Without this, an unknown path renders the chrome around nothing
              and looks like the app broke. Bookmarks outlive pages. */}
          <Route
            path="*"
            element={
              <div className="empty-state">
                <p>There is nothing at this address.</p>
                <Link to="/projects" className="button button-primary">
                  Go to Projects
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="footer">
        <p>&copy; 2026 Larpworks</p>
      </footer>

      <ThemeSwitcher />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </Router>
  );
}
