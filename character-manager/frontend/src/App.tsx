import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CharacterSheet from './pages/CharacterSheet';
import ThemeSwitcher from './components/ThemeSwitcher';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-brand">LARP Character Manager</Link>
            <div className="nav-links">
              <Link to="/">Home</Link>
              <Link to="/projects">Projects</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/characters/:id" element={<CharacterSheet />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>&copy; 2026 LARP Character Manager</p>
        </footer>

        <ThemeSwitcher />
      </div>
    </Router>
  );
}

export default App;
