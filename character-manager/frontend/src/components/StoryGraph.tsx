import { useCallback, useMemo, useRef, useState } from 'react';
import type { MapIndex } from '../../../shared/narrative';
import { connectionsOf } from '../../../shared/narrative';
import type { NarrativeEntity } from '../../../shared/narrative-schema';
import './StoryGraph.css';

/**
 * The neighbourhood around one entry.
 *
 * Not the whole map. A narrative map differs from the rules in that nearly
 * every relation really is an edge between two things, so a graph is a
 * faithful picture of it -- but a faithful picture of four hundred entries is
 * a hairball that answers nothing. What answers something is the question
 * people actually ask of a graph: what is around *this*, and what is around
 * the thing beside it.
 *
 * So the subject sits in the middle, everything touching it sits on a ring,
 * and their own neighbours sit faintly beyond. Clicking any of them
 * re-centres, which is how you walk a story rather than stare at it.
 *
 * Drawn as plain SVG, including the pan and zoom. A graph library would be
 * several hundred kilobytes for a radial layout of a few dozen nodes and a
 * viewBox transform, which is arithmetic.
 */

const WIDTH = 1000;
const HEIGHT = 720;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const RING_1 = 210;
const RING_2 = 335;
/** Beyond this the outer ring stops informing and starts crowding. */
const MAX_OUTER = 18;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

interface Placed {
  entity: NarrativeEntity;
  x: number;
  y: number;
  hop: 1 | 2;
  /** Worded from the centre's point of view. Inner ring only. */
  label?: string;
  degree: number;
  r: number;
}

/**
 * Size carries how connected a thing is, so the load-bearing parts of a story
 * are the ones the eye lands on first. Square-rooted because degree has a
 * long tail: linear scaling lets one hub swallow the frame.
 */
function radiusFor(degree: number, hop: 1 | 2): number {
  const base = hop === 1 ? 17 : 10;
  return base + Math.sqrt(degree) * (hop === 1 ? 4.5 : 2.2);
}

interface View {
  x: number;
  y: number;
  scale: number;
}

const HOME: View = { x: 0, y: 0, scale: 1 };

export default function StoryGraph({
  centreId,
  idx,
  onSelect,
}: {
  centreId: string;
  idx: MapIndex;
  onSelect: (id: string) => void;
}) {
  // Hover shows a card; clicking moves. Two different questions -- "what is
  // that" and "take me there" -- and one gesture serving both would mean you
  // cannot ask the first without answering the second.
  const [peeked, setPeeked] = useState<Placed | null>(null);
  // The second ring is context, and context is sometimes in the way.
  const [showOuter, setShowOuter] = useState(true);
  const [view, setView] = useState<View>(HOME);
  const [panning, setPanning] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: View } | null>(null);

  const layout = useMemo(() => {
    const centre = idx.entities.get(centreId);
    if (!centre) return null;

    const inner: Placed[] = [];
    const seen = new Set<string>([centreId]);

    // Grouped by connection kind before placing, so like sits beside like and
    // the ring reads as a set of relationships rather than a scatter.
    const links = connectionsOf(centreId, idx)
      .filter((c) => c.other)
      .sort(
        (a, b) =>
          a.label.localeCompare(b.label) || a.other!.name.localeCompare(b.other!.name)
      );

    links.forEach((c, i) => {
      if (seen.has(c.other!.id)) return;
      seen.add(c.other!.id);
      const angle = (i / Math.max(links.length, 1)) * Math.PI * 2 - Math.PI / 2;
      // Alternating the radius staggers the labels, which is what stops
      // adjacent names overlapping once the ring gets busy.
      const ring = RING_1 + (i % 2 === 0 ? 0 : 42);
      const degree = (idx.byEntity.get(c.other!.id) ?? []).length;
      inner.push({
        entity: c.other!,
        x: CX + Math.cos(angle) * ring,
        y: CY + Math.sin(angle) * ring,
        hop: 1,
        label: c.label,
        degree,
        r: radiusFor(degree, 1),
      });
    });

    const outer: Placed[] = [];
    const edges2: { from: Placed; to: Placed }[] = [];
    for (const parent of inner) {
      const angleOf = Math.atan2(parent.y - CY, parent.x - CX);
      const kids = connectionsOf(parent.entity.id, idx)
        .filter((c) => c.other && !seen.has(c.other.id))
        .slice(0, 3);
      kids.forEach((c, k) => {
        if (outer.length >= MAX_OUTER || seen.has(c.other!.id)) return;
        seen.add(c.other!.id);
        const spread = (k - (kids.length - 1) / 2) * 0.24;
        const d = (idx.byEntity.get(c.other!.id) ?? []).length;
        const placed: Placed = {
          entity: c.other!,
          x: CX + Math.cos(angleOf + spread) * RING_2,
          y: CY + Math.sin(angleOf + spread) * RING_2,
          hop: 2,
          degree: d,
          r: radiusFor(d, 2),
        };
        outer.push(placed);
        edges2.push({ from: parent, to: placed });
      });
    }

    return { centre, inner, outer, edges2 };
  }, [centreId, idx]);

  /* ---------------- pan and zoom ---------------- */

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    setView((v) => {
      const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale * factor));
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || clientX === undefined || clientY === undefined) {
        return { ...v, scale };
      }
      // Keeps the point under the cursor still, which is what makes a wheel
      // zoom feel like magnifying rather than lurching.
      const px = ((clientX - rect.left) / rect.width) * WIDTH;
      const py = ((clientY - rect.top) / rect.height) * HEIGHT;
      const k = 1 / v.scale - 1 / scale;
      return { x: v.x + (px - CX) * k, y: v.y + (py - CY) * k, scale };
    });
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Only a drag on empty space pans; a drag starting on a node is a click.
    if ((e.target as Element).closest('.graph-node')) return;
    drag.current = { x: e.clientX, y: e.clientY, view };
    setPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((e.clientX - drag.current.x) / rect.width) * WIDTH;
    const dy = ((e.clientY - drag.current.y) / rect.height) * HEIGHT;
    setView({
      ...drag.current.view,
      x: drag.current.view.x - dx / drag.current.view.scale,
      y: drag.current.view.y - dy / drag.current.view.scale,
    });
  };

  const endDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    drag.current = null;
    setPanning(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  if (!layout) return <p className="muted">Nothing to show.</p>;
  const { centre, inner, outer, edges2 } = layout;

  const shapeOf = (e: NarrativeEntity) => idx.entityKinds.get(e.kindId)?.shape ?? 'thing';
  const w = WIDTH / view.scale;
  const h = HEIGHT / view.scale;
  const viewBox = `${CX + view.x - w / 2} ${CY + view.y - h / 2} ${w} ${h}`;
  const moved = view.x !== 0 || view.y !== 0 || view.scale !== 1;

  return (
    <div className="graph">
      <div className="graph-toolbar">
        <div className="graph-title">
          <strong>{centre.name}</strong>
          <span>
            {inner.length} direct
            {outer.length > 0 && showOuter && ` · ${outer.length} beyond`}
          </span>
        </div>

        <div className="graph-tools">
          <div className="ed-seg">
            <button
              className={!showOuter ? 'is-on' : ''}
              onClick={() => setShowOuter(false)}
              disabled={edges2.length === 0}
            >
              Neighbours
            </button>
            <button
              className={showOuter ? 'is-on' : ''}
              onClick={() => setShowOuter(true)}
              disabled={edges2.length === 0}
            >
              Two steps
            </button>
          </div>
          <div className="graph-zoom">
            <button onClick={() => zoomAt(1 / 1.25)} aria-label="Zoom out">−</button>
            <button onClick={() => zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button onClick={() => setView(HOME)} disabled={!moved}>Reset</button>
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        role="img"
        aria-label={`Connections around ${centre.name}`}
        className={`${peeked ? 'is-focused' : ''} ${panning ? 'is-panning' : ''}`}
        onWheel={(e) => zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Keyed on the centre so a re-centre fades in rather than jumping,
            which is what makes walking the graph read as movement. */}
        <g key={centreId} className="graph-scene">
          {showOuter &&
            edges2.map((e, i) => (
              <path key={`o${i}`} className="graph-edge is-far" d={curve(e.from, e.to)} />
            ))}

          {inner.map((n, i) => {
            // The label sits out near the node rather than at the midpoint:
            // every spoke passes through the hub, so midpoint labels pile up
            // exactly where the graph is busiest.
            const t = 0.66;
            const lx = CX + (n.x - CX) * t;
            const ly = CY + (n.y - CY) * t;
            const lit = peeked?.entity.id === n.entity.id;
            return (
              <g key={`e${i}`} className={`graph-spoke ${lit ? 'is-lit' : ''}`}>
                <path className="graph-edge" d={curve({ x: CX, y: CY }, n)} />
                <text className="graph-edge-label" x={lx} y={ly - 6} textAnchor="middle">
                  {n.label}
                </text>
              </g>
            );
          })}

          {showOuter &&
            outer.map((n, i) => (
              <Node key={`f${i}`} node={n} shape={shapeOf(n.entity)} onSelect={onSelect}
                    onPeek={setPeeked} lit={peeked?.entity.id === n.entity.id} />
            ))}
          {inner.map((n, i) => (
            <Node key={`n${i}`} node={n} shape={shapeOf(n.entity)} onSelect={onSelect}
                  onPeek={setPeeked} lit={peeked?.entity.id === n.entity.id} />
          ))}

          {/* Drawn last and largest: the centre is the subject, and on the
              first pass it read as one more dot among twenty-five. */}
          <g className="graph-node is-centre">
            <circle cx={CX} cy={CY} r={48} className="graph-halo" />
            <circle cx={CX} cy={CY} r={36} className={`graph-dot is-${shapeOf(centre)}`} />
            <text className="graph-centre-label" x={CX} y={CY + 64} textAnchor="middle">
              {truncate(centre.name, 34)}
            </text>
          </g>

          {peeked && <PeekCard node={peeked} idx={idx} />}
        </g>
      </svg>

      <p className="graph-legend">
        <span className="graph-key">
          <span className="graph-key-dot is-small" />
          <span className="graph-key-dot is-big" />
          size is how connected
        </span>
        <span className="muted">hover to look · click to move · drag to pan</span>
      </p>
    </div>
  );
}

/**
 * A gentle arc rather than a straight line.
 *
 * With every spoke leaving one point, straight lines make a starburst that is
 * hard to follow back to its node. A consistent slight bow separates them
 * where they leave the hub, which is where they are most crowded.
 */
function curve(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bow = 0.08;
  return `M ${from.x} ${from.y} Q ${mx - dy * bow} ${my + dx * bow} ${to.x} ${to.y}`;
}

function Node({
  node,
  shape,
  onSelect,
  onPeek,
  lit,
}: {
  node: Placed;
  shape: string;
  onSelect: (id: string) => void;
  onPeek: (node: Placed | null) => void;
  lit: boolean;
}) {
  return (
    <g
      className={`graph-node is-hop${node.hop} ${lit ? 'is-lit' : ''}`}
      onClick={() => onSelect(node.entity.id)}
      onMouseEnter={() => onPeek(node)}
      onMouseLeave={() => onPeek(null)}
      onFocus={() => onPeek(node)}
      onBlur={() => onPeek(null)}
      role="button"
      tabIndex={0}
      aria-label={`${node.entity.name}, ${node.degree} connections`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(node.entity.id);
        }
      }}
    >
      <circle cx={node.x} cy={node.y} r={node.r} className={`graph-dot is-${shape}`} />
      <text className="graph-label" x={node.x} y={node.y + node.r + 16} textAnchor="middle">
        {truncate(node.entity.name, node.hop === 1 ? 24 : 16)}
      </text>
    </g>
  );
}

/**
 * What a node is, without leaving where you are.
 *
 * Kept to what answers "should I go there": what kind of thing it is, how
 * connected, the shape of those connections, and a line of summary.
 * Everything else is one click away in the panel, which can also edit it.
 */
function PeekCard({ node, idx }: { node: Placed; idx: MapIndex }) {
  const links = connectionsOf(node.entity.id, idx);
  const byKind = new Map<string, number>();
  for (const c of links) byKind.set(c.label, (byKind.get(c.label) ?? 0) + 1);
  const top = [...byKind.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const W = 250;
  const H = 132;
  // Kept inside the frame: a card on a node near the edge would hang off it.
  const x = Math.min(Math.max(node.x - W / 2, 8), WIDTH - W - 8);
  const y = node.y > CY ? node.y - H - node.r - 14 : node.y + node.r + 18;

  return (
    <foreignObject x={x} y={y} width={W} height={H} className="graph-peek-holder">
      <div className="graph-peek">
        <strong>{node.entity.name}</strong>
        <span className="graph-peek-kind">
          {idx.entityKinds.get(node.entity.kindId)?.label ?? node.entity.kindId}
          {node.entity.status !== 'canon' && ` · ${node.entity.status}`}
          {' · '}
          {links.length} {links.length === 1 ? 'connection' : 'connections'}
        </span>
        {node.entity.summary && (
          <span className="graph-peek-summary">{truncate(node.entity.summary, 108)}</span>
        )}
        {top.length > 0 && (
          <span className="graph-peek-kinds">
            {top.map(([label, n]) => `${label} ${n}`).join(' · ')}
          </span>
        )}
      </div>
    </foreignObject>
  );
}

function truncate(s: string, at = 26): string {
  return s.length > at ? `${s.slice(0, at - 1)}…` : s;
}
