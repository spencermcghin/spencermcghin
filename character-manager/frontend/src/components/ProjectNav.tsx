import { NavLink } from 'react-router-dom';
import './ProjectNav.css';

/**
 * The project's own navigation, present on every screen inside a project.
 *
 * Before this, the only way between a project's tools was the button row on
 * the overview page -- Rules to Story meant Back and in again, and no screen
 * said where you were. A persistent tab bar is that missing wayfinding.
 *
 * NavLink stamps `.active` on the current tab; `end` keeps Overview from
 * claiming every deeper path.
 */
export default function ProjectNav({ id }: { id: string }) {
  return (
    <nav className="project-nav" aria-label="Project sections">
      <NavLink to={`/projects/${id}`} end>
        Overview
      </NavLink>
      <NavLink to={`/projects/${id}/story`}>Story</NavLink>
      <NavLink to={`/projects/${id}/edit`}>Rules</NavLink>
    </nav>
  );
}
