import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CharacterSheet from './pages/CharacterSheet';
import SignIn from './pages/SignIn';
import JoinProject from './pages/JoinProject';
import AdminUsers from './pages/AdminUsers';
import RulesetEditor from './pages/RulesetEditor';
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
  return <Link to="/admin">Accounts</Link>;
}

function Shell() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand">LARP Character Manager</Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/projects">Projects</Link>
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
        <p>&copy; 2026 LARP Character Manager</p>
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
