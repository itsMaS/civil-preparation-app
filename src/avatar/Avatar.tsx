/**
 * The household scene. A monotone silhouette stands for the user; gear
 * (satisfied items) is drawn in full colour on top of it, mood shows in the
 * posture, and household members stand beside at true relative scale.
 *
 * Everything is a pure function of user data. Layers, back to front:
 * room -> cast (people left, pets right) -> backpack -> figure -> gear.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type Mood = 'uneasy' | 'neutral' | 'confident';
export type Environment = 'bare' | 'stocked' | 'fortified';

export interface CastMember {
  id: string;
  kind: 'person' | 'pet';
  /** person: infant|child|teen|adult|senior. pet: dog|cat|small|other */
  variant: string;
  covered: boolean;
  name?: string;
}

export interface AvatarProps {
  gear: string[];
  mood: Mood;
  environment: Environment;
  cast?: CastMember[];
  /** Dim gear + mood when readiness has decayed. */
  decayed?: boolean;
  className?: string;
  animate?: boolean;
  /** Tapping the figure bounces it (and buzzes on devices that support it). */
  interactive?: boolean;
}

const FIGURE = 'var(--figure)';
const MARK = 'var(--figure-mark)';

/** Height of a person relative to an adult; head size relative to an adult head. */
const PERSON_SCALE: Record<string, { size: number; head: number }> = {
  infant: { size: 0.42, head: 1.5 },
  child: { size: 0.62, head: 1.25 },
  teen: { size: 0.86, head: 1.08 },
  adult: { size: 1, head: 1 },
  senior: { size: 0.96, head: 1 },
};

/** Floor line in scene units. Figures stand with their feet here. */
const FLOOR = 222;
/** Width of an adult figure including arms, in scene units. */
const FIGURE_W = 88;
const GAP = 8;

// --------------------------------------------------------------------------
// Environment
// --------------------------------------------------------------------------
function Room({ env, width }: { env: Environment; width: number }) {
  const stocked = env !== 'bare';
  const fortified = env === 'fortified';
  const winX = width - 94;
  return (
    <g>
      <rect x="0" y="0" width={width} height="200" fill="var(--surface-2)" />
      <rect x="0" y="200" width={width} height="60" fill="var(--surface-3)" />
      {/* skirting */}
      <rect x="0" y="196" width={width} height="4" fill="var(--border)" />
      {/* window */}
      <rect x={winX} y="30" width="70" height="60" rx="4" fill={fortified ? '#2b3540' : '#3a4b5c'} />
      <rect x={winX + 4} y="34" width="62" height="52" rx="2" fill={fortified ? '#1c2630' : '#5f7d99'} />
      {!fortified && <rect x={winX + 33} y="34" width="4" height="52" fill="#3a4b5c" />}
      {fortified && (
        <g stroke="#c9b48a" strokeWidth="3" opacity=".9">
          <line x1={winX + 6} y1="36" x2={winX + 64} y2="84" />
          <line x1={winX + 64} y1="36" x2={winX + 6} y2="84" />
        </g>
      )}
      {/* shelves */}
      <rect x="24" y="96" width="96" height="6" rx="2" fill="#6b5237" />
      <rect x="24" y="140" width="96" height="6" rx="2" fill="#6b5237" />
      {stocked && (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${30 + i * 16} 70)`}>
              <rect x="0" y="6" width="11" height="20" rx="3" fill="#6fa8dc" />
              <rect x="3" y="0" width="5" height="7" rx="1" fill="#3d6f9e" />
            </g>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={82 + i * 9} y="82" width="8" height="14" rx="1.5" fill={i % 2 ? '#c94c3b' : '#d9a441'} />
          ))}
          <rect x="30" y="118" width="26" height="22" rx="2" fill="#a8763e" />
          <rect x="60" y="124" width="20" height="16" rx="2" fill="#8c6238" />
          <rect x="86" y="114" width="28" height="26" rx="2" fill="#b98b52" />
        </g>
      )}
      {fortified && (
        <g>
          <rect x="88" y="116" width="26" height="14" rx="2" fill="#2d3238" />
          <circle cx="96" cy="123" r="4" fill="#c9c9c9" />
          <line x1="110" y1="116" x2="116" y2="104" stroke="#c9c9c9" strokeWidth="1.5" />
          <circle cx={width / 2} cy="24" r="60" fill="var(--amber)" opacity=".08" className="anim-flicker" />
          <rect x={width / 2 - 6} y="6" width="12" height="12" rx="2" fill="#f3d27a" />
        </g>
      )}
      {/* rug */}
      <ellipse cx={width / 2} cy="236" rx={Math.min(150, width / 2 - 20)} ry="14" fill={stocked ? '#5a4a3a' : '#3d4147'} opacity=".7" />
    </g>
  );
}

// --------------------------------------------------------------------------
// Silhouette figure. Local coordinates: origin between the feet, y up is negative.
// An adult is ~170 units tall. `head` scales the head for children.
// --------------------------------------------------------------------------
interface FigureProps {
  mood: Mood;
  head?: number;
  gear?: Set<string>;
  /** Draws a walking cane. */
  cane?: boolean;
  /** Face marks off for background figures keeps the focus on the user. */
  face?: boolean;
}

function Figure({ mood, head = 1, gear = new Set(), cane, face = true }: FigureProps) {
  const uneasy = mood === 'uneasy';
  const confident = mood === 'confident';

  const headR = 17 * head;
  // Posture. Uneasy: shoulders up, head down. Confident: chest out, head up.
  const shoulderY = uneasy ? -118 : confident ? -124 : -121;
  const shoulderW = uneasy ? 50 : confident ? 60 : 56;
  const waistW = 44;
  const hipY = -70;
  const headCY = shoulderY - 10 - headR + (uneasy ? 5 : confident ? -1 : 0);
  const neckTop = headCY + headR - 4;
  const footSpread = confident ? 4 : 0;

  const sx = shoulderW / 2;
  const wx = waistW / 2;
  const torso = `M${-sx + 10} ${shoulderY} L${sx - 10} ${shoulderY} Q${sx} ${shoulderY} ${sx} ${shoulderY + 10} L${wx} ${hipY} L${-wx} ${hipY} L${-sx} ${shoulderY + 10} Q${-sx} ${shoulderY} ${-sx + 10} ${shoulderY}Z`;

  // Arms as thick round-capped strokes so they read as one silhouette.
  const armY = shoulderY + 7;
  const arms = uneasy
    ? [`M${-sx + 4} ${armY} L${-sx - 4} ${armY + 26} L${wx - 6} ${hipY - 30}`, `M${sx - 4} ${armY} L${sx + 4} ${armY + 26} L${-wx + 6} ${hipY - 24}`]
    : confident
      ? [`M${-sx + 4} ${armY} L${-sx - 16} ${armY + 26} L${-wx + 2} ${hipY - 6}`, `M${sx - 4} ${armY} L${sx + 8} ${armY + 30} L${sx + 10} ${hipY + 4}`]
      : [`M${-sx + 4} ${armY} L${-sx - 6} ${armY + 30} L${-sx - 8} ${hipY + 6}`, `M${sx - 4} ${armY} L${sx + 6} ${armY + 30} L${sx + 8} ${hipY + 6}`];

  // Hand positions for hand-held gear.
  const leftHand = confident ? { x: -wx + 2, y: hipY - 6 } : uneasy ? { x: wx - 6, y: hipY - 30 } : { x: -sx - 8, y: hipY + 6 };
  const rightHand = confident ? { x: sx + 10, y: hipY + 4 } : uneasy ? { x: -wx + 6, y: hipY - 24 } : { x: sx + 8, y: hipY + 6 };

  const legW = 17;
  const eyeY = headCY - 1;
  const eyeDX = 6.5 * head;
  const mouthY = headCY + 8 * head;

  return (
    <g>
      {gear.has('backpack') && (
        <g transform={`translate(${-sx - 8} ${shoulderY + 2})`}>
          <rect width={shoulderW + 16} height="58" rx="16" fill="#8a5a2b" />
          <rect x="6" y="8" width={shoulderW + 4} height="18" rx="8" fill="#a8763e" />
        </g>
      )}
      <g fill={FIGURE}>
        {/* legs + feet */}
        <rect x={-legW - 2 - footSpread} y={hipY - 4} width={legW} height={-hipY + 4} rx="7" />
        <rect x={2 + footSpread} y={hipY - 4} width={legW} height={-hipY + 4} rx="7" />
        {gear.has('boots') ? (
          <g fill="#5a3b21">
            <rect x={-legW - 5 - footSpread} y="-16" width={legW + 5} height="16" rx="5" />
            <rect x={footSpread} y="-16" width={legW + 5} height="16" rx="5" />
            <rect x={-legW - 5 - footSpread} y="-5" width={legW + 5} height="5" fill="#3d2816" />
            <rect x={footSpread} y="-5" width={legW + 5} height="5" fill="#3d2816" />
          </g>
        ) : (
          <g>
            <rect x={-legW - 6 - footSpread} y="-8" width={legW + 6} height="8" rx="4" />
            <rect x={footSpread} y="-8" width={legW + 6} height="8" rx="4" />
          </g>
        )}
        {/* torso, neck, head */}
        <path d={torso} />
        <rect x="-6" y={neckTop} width="12" height={shoulderY - neckTop + 4} />
        <circle cx="0" cy={headCY} r={headR} />
      </g>
      {/* arms */}
      <g stroke={FIGURE} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {arms.map((d, i) => <path key={i} d={d} />)}
      </g>
      {cane && (
        <g stroke="#a8763e" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d={`M${rightHand.x + 4} ${rightHand.y - 6} Q${rightHand.x + 12} ${rightHand.y - 8} ${rightHand.x + 10} ${rightHand.y} L${rightHand.x + 10} -2`} />
        </g>
      )}
      {/* face marks */}
      {face && (
        <g fill={MARK} stroke={MARK}>
          <g className="anim-blink" stroke="none">
            <ellipse cx={-eyeDX} cy={eyeY} rx={2.2 * head} ry={2.8 * head} />
            <ellipse cx={eyeDX} cy={eyeY} rx={2.2 * head} ry={2.8 * head} />
          </g>
          {confident && <path d={`M${-5 * head} ${mouthY} Q0 ${mouthY + 5 * head} ${5 * head} ${mouthY}`} strokeWidth="2" fill="none" strokeLinecap="round" />}
          {mood === 'neutral' && <line x1={-4 * head} y1={mouthY + 1} x2={4 * head} y2={mouthY + 1} strokeWidth="2" strokeLinecap="round" />}
          {uneasy && <path d={`M${-4.5 * head} ${mouthY + 2} Q0 ${mouthY - 2} ${4.5 * head} ${mouthY + 2}`} strokeWidth="2" fill="none" strokeLinecap="round" />}
        </g>
      )}
      {/* gear on the body, in full colour */}
      {gear.has('blanket') && (
        <path d={`M${-sx - 2} ${shoulderY + 2} Q0 ${shoulderY + 18} ${sx + 2} ${shoulderY + 2} L${sx + 2} ${shoulderY + 12} Q0 ${shoulderY + 30} ${-sx - 2} ${shoulderY + 12}Z`} fill="#b5473d" />
      )}
      {gear.has('documents') && <rect x={sx - 20} y={shoulderY + 18} width="12" height="15" rx="1.5" fill="#f1e9d2" stroke="#c9b48a" />}
      {gear.has('powerbank') && <rect x={-wx + 4} y={hipY - 22} width="9" height="16" rx="2" fill="#1f2326" stroke="#8fa35f" />}
      {gear.has('firstaid') && (
        <g transform={`translate(${-wx - 4} ${hipY - 8})`}>
          <rect width="16" height="13" rx="2" fill="#d94c3d" />
          <rect x="6.5" y="2.5" width="3" height="8" fill="#fff" />
          <rect x="4" y="5" width="8" height="3" fill="#fff" />
        </g>
      )}
      {gear.has('water') && (
        <g transform={`translate(${wx - 4} ${hipY - 14})`}>
          <rect width="10" height="24" rx="3" fill="#6fa8dc" />
          <rect x="2.5" y="-5" width="5" height="6" rx="1" fill="#3d6f9e" />
        </g>
      )}
      {gear.has('torch') && (
        <g transform={`translate(${leftHand.x - 4} ${leftHand.y - 6}) rotate(-20)`}>
          <rect width="10" height="26" rx="3" fill="#2d3238" />
          <rect x="-2" y="-6" width="14" height="8" rx="2" fill="#4a5058" />
          <path d="M-2 -6 L-14 -22 L24 -22 L12 -6Z" fill="#f3d27a" opacity=".45" />
        </g>
      )}
      {gear.has('radio') && (
        <g transform={`translate(${rightHand.x - 6} ${rightHand.y - 20})`}>
          <rect width="18" height="22" rx="3" fill="#2d3238" />
          <circle cx="9" cy="12" r="5" fill="#c9c9c9" />
          <line x1="15" y1="0" x2="20" y2="-12" stroke="#c9c9c9" strokeWidth="1.5" />
        </g>
      )}
    </g>
  );
}

function CoverageMark({ covered, x, y }: { covered: boolean; x: number; y: number }) {
  return covered ? (
    <g transform={`translate(${x} ${y})`}>
      <circle r="6.5" fill="var(--green)" />
      <path d="M-3 0 L-1 2.5 L3.5 -2.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  ) : (
    <g transform={`translate(${x} ${y})`}>
      <circle r="6.5" fill="var(--amber)" />
      <text x="0" y="2.8" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1a1208">!</text>
    </g>
  );
}

function Pet({ variant, covered }: { variant: string; covered: boolean }) {
  return (
    <g opacity={covered ? 1 : 0.55} fill={FIGURE}>
      {variant === 'cat' ? (
        <g>
          <ellipse cx="0" cy="-10" rx="14" ry="9" />
          <circle cx="-12" cy="-19" r="7.5" />
          <path d="M-17 -23 L-16 -32 L-11 -25Z" /><path d="M-7 -23 L-8 -32 L-12 -25Z" />
          <path d="M13 -12 Q24 -20 18 -28" stroke={FIGURE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <rect x="-9" y="-4" width="5" height="4" rx="1.5" /><rect x="4" y="-4" width="5" height="4" rx="1.5" />
        </g>
      ) : variant === 'dog' ? (
        <g>
          <rect x="-16" y="-24" width="32" height="16" rx="7" />
          <circle cx="-16" cy="-27" r="9" />
          <ellipse cx="-23" cy="-25" rx="3.5" ry="7" />
          <rect x="-13" y="-10" width="6" height="10" rx="2" /><rect x="7" y="-10" width="6" height="10" rx="2" />
          <path d="M16 -20 Q26 -28 22 -36" stroke={FIGURE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <ellipse cx="0" cy="-8" rx="10" ry="8" />
          <circle cx="-8" cy="-14" r="5.5" />
          <ellipse cx="-10" cy="-22" rx="2.2" ry="5.5" /><ellipse cx="-5" cy="-22" rx="2.2" ry="5.5" />
        </g>
      )}
      <CoverageMark covered={covered} x={16} y={-38} />
    </g>
  );
}

// --------------------------------------------------------------------------
// Composite
// --------------------------------------------------------------------------
interface Placed { id: string; x: number; node: ReactNode }

/** Lays the cast out: people to the left of the user, pets to the right. Returns the scene width. */
function layout(cast: CastMember[]): { placed: Placed[]; width: number; offset: number } {
  const people = cast.filter((c) => c.kind === 'person');
  const pets = cast.filter((c) => c.kind === 'pet');
  const placed: Placed[] = [];
  let left = 160 - FIGURE_W / 2;
  let right = 160 + FIGURE_W / 2;
  for (const p of people) {
    const s = PERSON_SCALE[p.variant] ?? PERSON_SCALE.adult;
    const w = FIGURE_W * s.size;
    const x = left - GAP - w / 2;
    left = x - w / 2;
    placed.push({
      id: p.id, x,
      node: (
        <g opacity={p.covered ? 1 : 0.55}>
          <g transform={`translate(${x} ${FLOOR}) scale(${s.size})`}>
            <Figure mood={p.covered ? 'neutral' : 'uneasy'} head={s.head} cane={p.variant === 'senior'} />
          </g>
          <CoverageMark covered={p.covered} x={x + 16 * s.size} y={FLOOR - 172 * s.size - 6} />
        </g>
      ),
    });
  }
  for (const p of pets) {
    const w = p.variant === 'dog' ? 52 : 44;
    const x = right + GAP + w / 2;
    right = x + w / 2;
    placed.push({ id: p.id, x, node: <g transform={`translate(${x} ${FLOOR})`}><Pet variant={p.variant} covered={p.covered} /></g> });
  }
  const margin = 12;
  const minX = Math.min(left, 0) - margin;
  const maxX = Math.max(right, 320) + margin;
  const offset = left < margin ? margin - left : 0;
  const width = Math.max(320, maxX - minX);
  return { placed, width, offset };
}

export function Avatar({ gear, mood, environment, cast = [], decayed, className, animate = true, interactive = false }: AvatarProps) {
  const { t } = useTranslation();
  const g = new Set(gear);
  const [bouncing, setBouncing] = useState(false);
  const timer = useRef<number | null>(null);
  const { placed, width, offset } = layout(cast);
  const moodClass = !animate ? '' : mood === 'uneasy' ? 'anim-fidget' : 'anim-breathe';

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const tap = useCallback(() => {
    if (!interactive) return;
    try { navigator.vibrate?.(12); } catch { /* not supported */ }
    setBouncing(false);
    // Restart the animation even when tapped mid-bounce.
    requestAnimationFrame(() => {
      setBouncing(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setBouncing(false), 650);
    });
  }, [interactive]);

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); }
  };

  return (
    <svg
      viewBox={`0 0 ${width} 260`}
      className={className}
      role={interactive ? 'button' : 'img'}
      aria-label={t('avatar.label')}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? tap : undefined}
      onKeyDown={interactive ? onKey : undefined}
      style={{ display: 'block', cursor: interactive ? 'pointer' : undefined, touchAction: 'manipulation' }}
    >
      <Room env={environment} width={width} />
      <g transform={`translate(${offset} 0)`}>
        {placed.map((p) => <g key={p.id}>{p.node}</g>)}
        {/* CSS animations set `transform`, which would override an SVG transform
            attribute on the same element, so the placement lives on a parent. */}
        <g transform={`translate(160 ${FLOOR})`}>
          <g className={bouncing ? 'anim-bounce' : ''}>
            <g className={moodClass} opacity={decayed ? 0.85 : 1}>
              <Figure mood={mood} gear={g} />
            </g>
          </g>
        </g>
      </g>
      {g.has('stove') && (
        <g transform="translate(40 206)">
          <rect width="30" height="10" rx="3" fill="#2d3238" />
          <rect x="6" y="-8" width="18" height="8" rx="2" fill="#4a5058" />
          <path d="M12 -8 Q15 -18 18 -8" fill="#f3a03a" className="anim-flicker" />
        </g>
      )}
      {g.has('food') && environment === 'bare' && (
        <g transform="translate(88 82)">
          {[0, 1, 2].map((i) => <rect key={i} x={i * 9} y="0" width="8" height="14" rx="1.5" fill={i % 2 ? '#c94c3b' : '#d9a441'} />)}
        </g>
      )}
    </svg>
  );
}

export function moodFor(earned: number, total: number, decayed: boolean): Mood {
  const ratio = total === 0 ? 0 : earned / total;
  let mood: Mood = ratio === 0 ? 'uneasy' : ratio >= 0.6 ? 'confident' : 'neutral';
  if (decayed && mood === 'confident') mood = 'neutral';
  else if (decayed && mood === 'neutral') mood = 'uneasy';
  return mood;
}

export function environmentFor(earnedIds: string[]): Environment {
  if (earnedIds.includes('twoweeks') || earnedIds.includes('outage')) return 'fortified';
  if (earnedIds.includes('shelter72')) return 'stocked';
  return 'bare';
}
