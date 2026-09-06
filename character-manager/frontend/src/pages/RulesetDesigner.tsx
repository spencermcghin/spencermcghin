import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { rulesetApi } from '../services/api';
import type { Ruleset } from '../../../shared/rules-schema';
import { validateRuleset } from '../../../shared/ruleset-validation';
import { prerequisiteEdges, trackPositionOf } from '../../../shared/ruleset-editor';
import './RulesetDesigner.css';

const COLUMN = 250;
const ROW = 84;

/**
 * A read-only view of the dependency graph.
 *
 * Deliberately not an editor. Measured against the real guide, only 68 of 544
 * prerequisite clauses name a different skill -- the rest are Rank gates and
 * tier ladders, neither of which is an edge between skills. A canvas that
 * edited rules would therefore hide most of them. Rules are authored in the
 * editor; this exists to answer questions a list cannot: how deep does a
 * chain run, what is orphaned, is anything circular.
 *
 * Because nothing here is edited, the layout is computed rather than stored,
 * and there is no node state to keep in step with the ruleset.
 */
function layoutFor(ruleset: Ruleset): { nodes: Node[]; edges: Edge[] } {
  const deps = new Map<string, string[]>();
  for (const trait of ruleset.traits) {
    const ids = new Set<string>();
    for (const tier of trait.tiers) {
      for (const e of prerequisiteEdges(tier.requires)) {
        // A tier requiring the tier below it is the ladder, not a
        // relationship between skills.
        if (e.traitId !== trait.id) ids.add(e.traitId);
      }
    }
    deps.set(trait.id, [...ids]);
  }

  // Depth from the deepest prerequisite, so edges generally point rightward.
  const depth = new Map<string, number>();
  const resolve = (id: string, seen: Set<string>): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    // A cycle has no meaningful depth; 0 keeps the view working on a ruleset
    // the author has temporarily broken.
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

  // Connected skills first: the ones with no edges are the least interesting
  // here and would otherwise push the graph off screen.
  const connected = new Set<string>();
  for (const [id, ds] of deps) {
    if (ds.length > 0) {
      connected.add(id);
      for (const d of ds) connected.add(d);
    }
  }

  const rowInColumn = new Map<number, number>();
  const nodes: Node[] = [];

  const place = (column: number) => {
    const row = rowInColumn.get(column) ?? 0;
    rowInColumn.set(column, row + 1);
    return { x: column * COLUMN, y: row * ROW };
  };

  for (const trait of ruleset.traits) {
    if (!connected.has(trait.id)) continue;
    const group = ruleset.traitGroups.find((g) => g.id === trait.groupId);
    const ranks = ruleset.tracks
      .map((t) => {
        const at = trackPositionOf(trait, t.id);
        return at === null ? null : `${t.name} ${at}`;
      })
      .filter(Boolean) as string[];

    nodes.push({
      id: trait.id,
      position: place(depth.get(trait.id) ?? 0),
      // Fixed size: React Flow hides a node until it has measured one, and
      // stating it up front avoids depending on that round trip entirely.
      width: 168,
      height: 56,
      data: {
        label: (
          <div className="rf-node-body">
            <span className="rf-node-name">{trait.name}</span>
            <span className="rf-node-meta">
              {group?.name ?? trait.groupId}
              {ranks.length > 0 && ` · ${ranks.join(' · ')}`}
            </span>
          </div>
        ),
      },
      className: 'rf-node',
    });
  }

  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const [target, sources] of deps) {
    for (const source of sources) {
      const key = `${source}->${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ id: key, source, target, className: 'rf-edge' });
    }
  }

  return { nodes, edges };
}

export default function RulesetDesigner() {
  const { id = '' } = useParams();
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Held in React Flow's own state so it receives measurement and selection
  // changes. Deriving them from a memo drops those, and a node it has not
  // measured stays invisible.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    rulesetApi
      .get(id)
      .then(setRuleset)
      .catch(() => setError('Could not load this project.'));
  }, [id]);

  useEffect(() => {
    if (!ruleset) return;
    const laid = layoutFor(ruleset);
    setNodes(laid.nodes);
    setEdges(laid.edges);
  }, [ruleset, setNodes, setEdges]);

  const issues = useMemo(() => (ruleset ? validateRuleset(ruleset) : []), [ruleset]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => setSelected(node.id),
    []
  );

  if (error) return <div className="error">{error}</div>;
  if (!ruleset) return <p className="muted">Loading…</p>;

  const trait = ruleset.traits.find((t) => t.id === selected);
  const isolated = ruleset.traits.length - nodes.length;

  return (
    <div className="designer">
      <div className="designer-head">
        <div>
          <h1>{ruleset.name}</h1>
          <p className="muted">
            {nodes.length} connected {nodes.length === 1 ? 'skill' : 'skills'} ·{' '}
            {edges.length} {edges.length === 1 ? 'dependency' : 'dependencies'}
            {isolated > 0 && ` · ${isolated} with no skill prerequisite, not shown`}
          </p>
        </div>
        <div className="actions">
          <Link to={`/projects/${id}`} className="button button-small">Back</Link>
          <Link to={`/projects/${id}/edit`} className="button button-small button-primary">
            Edit rules
          </Link>
        </div>
      </div>

      <div className="designer-body">
        <div className="designer-canvas">
          {nodes.length === 0 ? (
            <p className="designer-blank">
              No skill in this ruleset requires another skill, so there is no
              graph to draw. Rank gates and level ladders are shown in the
              editor instead.
            </p>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onPaneClick={() => setSelected(null)}
              nodesConnectable={false}
              nodesDraggable={false}
              edgesFocusable={false}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </div>

        <aside className="designer-panel">
          <section>
            <h2>Rules Check</h2>
            {issues.length === 0 ? (
              <p className="ok">This ruleset is coherent.</p>
            ) : (
              <ul className="violations">
                {issues.slice(0, 8).map((issue, i) => (
                  <li key={i} className={issue.severity === 'warning' ? 'is-warning' : ''}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2>{trait ? trait.name : 'What this shows'}</h2>
            {!trait ? (
              <p className="muted">
                Only prerequisites that name another skill can be drawn. Rank
                gates and the level ladder inside a skill are the commoner
                relationships, and both live in the editor. Select a skill to
                see its requirements.
              </p>
            ) : (
              <dl className="detail-list">
                <dt>Group</dt>
                <dd>
                  {ruleset.traitGroups.find((g) => g.id === trait.groupId)?.name ??
                    trait.groupId}
                </dd>
                {trait.summary && (
                  <>
                    <dt>Description</dt>
                    <dd>{trait.summary}</dd>
                  </>
                )}
                {trait.tiers.map((tier) => {
                  const deps = prerequisiteEdges(tier.requires).filter(
                    (e) => e.traitId !== trait.id
                  );
                  return (
                    <div key={tier.level} className="detail-tier">
                      <dt>Level {tier.level}</dt>
                      <dd>
                        {tier.cost.amount}{' '}
                        {ruleset.currencies.find((c) => c.id === tier.cost.currencyId)
                          ?.abbreviation ?? tier.cost.currencyId}
                        {deps.length > 0 && (
                          <span className="muted">
                            {' · needs '}
                            {deps
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
                  );
                })}
              </dl>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
