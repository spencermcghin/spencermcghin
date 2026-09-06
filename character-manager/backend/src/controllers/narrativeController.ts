import type { Request, Response } from 'express';
import { emptyNarrativeMap, type NarrativeMap } from '../../../shared/narrative-schema';
import { hubs, indexMap, orphans, validateMap } from '../../../shared/narrative';
import { canEditRuleset, canViewProject } from '../auth/permissions';
import { viewerFor } from '../auth/viewer';
import { getStore } from '../db';

/**
 * The narrative map for a project.
 *
 * Read by anyone in the project, written by staff -- the same split as the
 * rules. A map is one document, fetched and saved whole, because it is
 * edited as a whole: moving a connection is two edits that must not be
 * separable.
 */

async function loadProject(req: Request, res: Response) {
  const rulesetId = req.params.rulesetId;
  const owned = await getStore().getRuleset(rulesetId);
  if (!owned) {
    res.status(404).json({ message: 'Ruleset not found' });
    return null;
  }
  const viewer = await viewerFor(req, rulesetId);
  if (!canViewProject(viewer)) {
    // Same 404 as an unknown id, so project ids cannot be probed.
    res.status(404).json({ message: 'Ruleset not found' });
    return null;
  }
  return { ruleset: owned.value, viewer, rulesetId };
}

export async function getNarrative(req: Request, res: Response) {
  const project = await loadProject(req, res);
  if (!project) return;

  const stored = await getStore().getNarrative(project.rulesetId);
  const map = stored ?? emptyNarrativeMap(project.rulesetId);
  const idx = indexMap(map);

  res.json({
    map,
    // Derived server-side so a client cannot disagree about what is broken.
    issues: validateMap(map, project.ruleset),
    orphans: orphans(idx).map((e) => e.id),
    hubs: hubs(idx)
      .slice(0, 8)
      .filter((h) => h.degree > 0)
      .map((h) => ({ id: h.entity.id, name: h.entity.name, degree: h.degree })),
    canEdit: canEditRuleset(project.viewer),
  });
}

export async function saveNarrative(req: Request, res: Response) {
  const project = await loadProject(req, res);
  if (!project) return;

  if (!canEditRuleset(project.viewer)) {
    return res.status(403).json({ message: 'Only project staff can edit the story map.' });
  }

  const incoming = req.body as NarrativeMap;
  if (!incoming || !Array.isArray(incoming.entities) || !Array.isArray(incoming.relations)) {
    return res.status(400).json({ message: 'That is not a narrative map.' });
  }

  // The path is authoritative for which project this belongs to; a body that
  // claimed another project would move content between games.
  const saved = await getStore().putNarrative({
    ...incoming,
    rulesetId: project.rulesetId,
    updatedAt: new Date().toISOString(),
  });

  res.json(saved);
}
