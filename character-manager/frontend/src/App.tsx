import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import CharacterList from './pages/CharacterList';
import CharacterDetail from './pages/CharacterDetail';
import CharacterForm from './pages/CharacterForm';
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
              <Link to="/characters">Characters</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/characters" element={<CharacterList />} />
            <Route path="/characters/new" element={<CharacterForm />} />
            <Route path="/characters/:id" element={<CharacterDetail />} />
            <Route path="/characters/:id/edit" element={<CharacterForm />} />
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
