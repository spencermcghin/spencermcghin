import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { memberApi, rulesetApi } from '../services/api';
import type { Ruleset } from '../../../shared/rules-schema';
import { validateRuleset, type RulesetIssue } from '../../../shared/ruleset-validation';
import {
  addPrerequisite,
  prerequisiteEdges,
  removePrerequisite,
  setNodePosition,
} from '../../../shared/ruleset-editor';
import { useAuth } from '../auth/useAuth';
import './RulesetDesigner.css';

const COLUMN = 260;
const ROW = 96;

/**
 * Places skills left to right by how deep their prerequisites run, so an edge
 * generally points rightward and a chain reads as a chain. Used only when a
 * ruleset has no stored layout; once anything is dragged, positions win.
 */
function autoLayout(ruleset: Ruleset): Record<string, { x: number; y: number }> {
  const deps = new Map<string, string[]>();
  for (const trait of ruleset.traits) {
    const ids = new Set<string>();
    for (const tier of trait.tiers) {
      for (const e of prerequisiteEdges(tier.requires)) {
        if (e.traitId !== trait.id) ids.add(e.traitId);
      }
    }
    deps.set(trait.id, [...ids]);
  }

  const depth = new Map<string, number>();
  const resolve = (id: string, seen: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    // A cycle has no meaningful depth. Returning 0 keeps layout working on a
    // ruleset the author has temporarily broken.
    if (seen.has(id)) return 0;
    seen.add(id);
    const d = Math.max(
      0,
      ...(deps.get(id) ?? []).map((p) => (deps.has(p) ? resolve(p, seen) + 1 : 0))
    );
    seen.delete(id);
    depth.set(id, d);
    return d;
  };
  for (const id of deps.keys()) resolve(id, new Set());

  // Group order gives the vertical bands, depth gives the horizontal ones.
  const groupIndex = new Map(ruleset.traitGroups.map((g, i) => [g.id, i]));
  const rowInColumn = new Map<string, number>();
  const positions: Record<string, { x: number; y: number }> = {};

  const ordered = [...ruleset.traits].sort(
    (a, b) =>
      (groupIndex.get(a.groupId) ?? 99) - (groupIndex.get(b.groupId) ?? 99) ||
      a.name.localeCompare(b.name)
  );

  for (const trait of ordered) {
    const col = depth.get(trait.id) ?? 0;
    const row = rowInColumn.get(String(col)) ?? 0;
    rowInColumn.set(String(col), row + 1);
    positions[trait.id] = { x: col * COLUMN, y: row * ROW };
  }
  return positions;
}

export default function RulesetDesigner() {
  const { id = '' } = useParams();
  const { user } = useAuth();

  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  /** Previous rulesets, newest last. Edits are pure, so undo is just a pop. */
  const history = useRef<Ruleset[]>([]);

  useEffect(() => {
    Promise.all([rulesetApi.get(id), memberApi.list(id).catch(() => [])])
      .then(([r, members]) => {
        setRuleset(r);
        const role = members.find((m) => m.userId === user?.id)?.role;
        setCanEdit(role === 'admin' || user?.appRole === 'admin');
      })
      .catch(() => setError('Could not load this project.'));
  }, [id, user]);

  /** Applies an edit, recording the previous value so it can be undone. */
  const apply = useCallback((next: (r: Ruleset) => Ruleset) => {
    setRuleset((current) => {
      if (!current) return current;
      history.current.push(current);
      setDirty(true);
      return next(current);
    });
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (previous) {
      setRuleset(previous);
      setDirty(true);
    }
  }, []);

  const issues = useMemo<RulesetIssue[]>(
    () => (ruleset ? validateRuleset(ruleset) : []),
    [ruleset]
  );

  /** Ids the validator flagged, so the canvas can mark them. */
  const flagged = useMemo(() => {
    const set = new Set<string>();
    for (const issue of issues) if (issue.subject) set.add(issue.subject.id);
    return set;
  }, [issues]);

  const layout = useMemo(
    () => (ruleset ? { ...autoLayout(ruleset), ...(ruleset.layout ?? {}) } : {}),
    [ruleset]
  );

  const nodes: Node[] = useMemo(() => {
    if (!ruleset) return [];
    return ruleset.traits.map((trait) => {
      const group = ruleset.traitGroups.find((g) => g.id === trait.groupId);
      const cost = trait.tiers[0]?.cost;
      return {
        id: trait.id,
        position: layout[trait.id] ?? { x: 0, y: 0 },
        data: {
          label: (
            <div className="rf-node-body">
              <span className="rf-node-name">{trait.name}</span>
              <span className="rf-node-meta">
                {group?.name ?? trait.groupId}
                {trait.tiers.length > 0 && ` · ${trait.tiers.length} lv`}
                {cost && ` · ${cost.amount}`}
              </span>
              {trait.tags.length > 0 && (
                <span className="rf-node-tags">{trait.tags.join(' · ')}</span>
              )}
            </div>
          ),
        },
        className: [
          'rf-node',
          flagged.has(trait.id) ? 'is-flagged' : '',
          selected === trait.id ? 'is-selected' : '',
        ]
          .filter(Boolean)
          .join(' '),
      };
    });
  }, [ruleset, layout, flagged, selected]);

  const edges: Edge[] = useMemo(() => {
    if (!ruleset) return [];
    const out: Edge[] = [];
    const seen = new Set<string>();

    for (const trait of ruleset.traits) {
      for (const tier of trait.tiers) {
        for (const dep of prerequisiteEdges(tier.requires)) {
          // A tier requiring the tier below it is the ladder, not a
          // relationship between skills. Drawing it would put a self-loop on
          // every node on the canvas.
          if (dep.traitId === trait.id) continue;
          const key = `${dep.traitId}->${trait.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            id: key,
            source: dep.traitId,
            target: trait.id,
            label: dep.minLevel > 1 ? `${dep.minLevel}` : undefined,
            className: 'rf-edge',
          });
        }
      }
    }
    return out;
  }, [ruleset]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Only persist a drag once it finishes; recording every intermediate
      // position would fill the undo stack with a single gesture.
      for (const change of changes) {
        if (change.type === 'position' && change.dragging === false && change.position) {
          const at = change.position;
          apply((r) => setNodePosition(r, change.id, at));
        }
      }
      // Positions still need to follow the pointer during the drag.
      setRuleset((current) =>
        current
          ? {
              ...current,
              layout: Object.fromEntries(
                applyNodeChanges(changes, nodes).map((n) => [n.id, n.position])
              ),
            }
          : current
      );
    },
    [apply, nodes]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !canEdit) return;
      if (connection.source === connection.target) return;
      // An edge means "you need this before you can begin", so it attaches to
      // the first level. Per-level requirements are refined in the panel.
      const level = ruleset?.traits.find((t) => t.id === connection.target)?.tiers[0]
        ?.level;
      if (level === undefined) return;
      apply((r) => addPrerequisite(r, connection.target!, level, connection.source!, 1));
    },
    [apply, canEdit, ruleset]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (!canEdit) return;
      apply((r) => {
        let next = r;
        for (const edge of deleted) {
          const trait = next.traits.find((t) => t.id === edge.target);
          // Remove from every level, so one delete does not leave the same
          // prerequisite lingering on a higher tier.
          for (const tier of trait?.tiers ?? []) {
            next = removePrerequisite(next, edge.target, tier.level, edge.source);
          }
        }
        return next;
      });
    },
    [apply, canEdit]
  );

  const save = async () => {
    if (!ruleset) return;
    setSaving(true);
    try {
      await rulesetApi.save(ruleset);
      history.current = [];
      setDirty(false);
      setError(null);
    } catch {
      setError('Could not save. You may not have permission to edit this ruleset.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !ruleset) return <div className="error">{error}</div>;
  if (!ruleset) return <p className="muted">Loading…</p>;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const selectedTrait = ruleset.traits.find((t) => t.id === selected);

  return (
    <div className="designer">
      <div className="designer-head">
        <div>
          <h1>{ruleset.name}</h1>
          <p className="muted">
            {ruleset.traits.length} skills · {edges.length} prerequisites
            {!canEdit && ' · read only'}
          </p>
        </div>
        <div className="actions">
          <Link to={`/projects/${id}`} className="button button-small">
            Back
          </Link>
          {canEdit && (
            <>
              <button
                className="button button-small"
                onClick={undo}
                disabled={history.current.length === 0}
              >
                Undo
              </button>
              <button
                className="button button-small button-primary"
                onClick={save}
                disabled={saving || !dirty || errors.length > 0}
                title={
                  errors.length > 0
                    ? 'Fix the errors below before saving'
                    : undefined
                }
              >
                {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="designer-body">
        <div className="designer-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onNodeClick={(_, node) => setSelected(node.id)}
            onPaneClick={() => setSelected(null)}
            nodesConnectable={canEdit}
            edgesFocusable={canEdit}
            fitView
            proOptions={{ hideAttribution: false }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className="designer-panel">
          <section>
            <h2>Rules Check</h2>
            {issues.length === 0 ? (
              <p className="ok">This ruleset is coherent.</p>
            ) : (
              <ul className="violations">
                {errors.map((issue, i) => (
                  <li key={`e${i}`}>{issue.message}</li>
                ))}
                {warnings.map((issue, i) => (
                  <li key={`w${i}`} className="is-warning">
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2>{selectedTrait ? selectedTrait.name : 'Selection'}</h2>
            {!selectedTrait ? (
              <p className="muted">
                Select a skill to inspect it. Drag from one skill to another to
                make the first a prerequisite of the second; select an edge and
                press Delete to remove it.
              </p>
            ) : (
              <dl className="detail-list">
                <dt>Group</dt>
                <dd>
                  {ruleset.traitGroups.find((g) => g.id === selectedTrait.groupId)
                    ?.name ?? selectedTrait.groupId}
                </dd>
                <dt>Tags</dt>
                <dd>{selectedTrait.tags.join(', ') || '—'}</dd>
                {selectedTrait.tiers.map((tier) => (
                  <div key={tier.level} className="detail-tier">
                    <dt>Level {tier.level}</dt>
                    <dd>
                      {tier.cost.amount}{' '}
                      {ruleset.currencies.find((c) => c.id === tier.cost.currencyId)
                        ?.abbreviation ?? tier.cost.currencyId}
                      {prerequisiteEdges(tier.requires).length > 0 && (
                        <span className="muted">
                          {' '}
                          · needs{' '}
                          {prerequisiteEdges(tier.requires)
                            .map(
                              (e) =>
                                `${
                                  ruleset.traits.find((t) => t.id === e.traitId)?.name ??
                                  e.traitId
                                } ${e.minLevel}`
                            )
                            .join(', ')}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
