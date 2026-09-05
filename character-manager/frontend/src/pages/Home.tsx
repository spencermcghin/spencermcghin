import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home">
      <h1>Live Roleplaying Character Manager</h1>
      <p>Manage your LARP characters, track their stats, skills, and inventory.</p>
      <div className="actions">
        <Link to="/characters" className="button">View Characters</Link>
        <Link to="/characters/new" className="button button-primary">Create New Character</Link>
      </div>
    </div>
  );
}
