/**
 * Layered SVG character. Every visual state is a prop, so the avatar is a pure
 * function of user data: look (customisation), gear (satisfied items), mood
 * (badge progress), cast (household + pets with coverage) and environment.
 *
 * Layers, back to front: environment -> cast (behind) -> backpack -> body ->
 * clothing gear -> head -> hand-held gear -> cast (front) -> effects.
 */
import type { AvatarLook } from '@/engine/types';

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
  look: AvatarLook;
  gear: string[];
  mood: Mood;
  environment: Environment;
  cast?: CastMember[];
  /** Dim gear + mood when readiness has decayed. */
  decayed?: boolean;
  className?: string;
  animate?: boolean;
}

export const SKIN_TONES: Record<string, string> = {
  light: '#f2d2b6', medium: '#d9a679', tan: '#b87a4b', deep: '#74462a',
};
export const HAIR_STYLES = ['short', 'long', 'curly', 'bun', 'none'] as const;
export const BODY_TYPES = ['slim', 'average', 'broad'] as const;
const HAIR = '#2a2320';
const SHIRT = '#4f6b3a';
const SHIRT_DARK = '#3d5330';
const TROUSERS = '#2f3b44';

function bodyWidth(body: string): number {
  return body === 'slim' ? 44 : body === 'broad' ? 60 : 52;
}

// --------------------------------------------------------------------------
// Environment
// --------------------------------------------------------------------------
function Room({ env }: { env: Environment }) {
  const stocked = env !== 'bare';
  const fortified = env === 'fortified';
  return (
    <g>
      <rect x="0" y="0" width="320" height="200" fill="var(--surface-2)" />
      <rect x="0" y="200" width="320" height="60" fill="var(--surface-3)" />
      {/* window */}
      <rect x="226" y="30" width="70" height="60" rx="4" fill={fortified ? '#2b3540' : '#3a4b5c'} />
      <rect x="230" y="34" width="62" height="52" rx="2" fill={fortified ? '#1c2630' : '#5f7d99'} />
      {fortified && (
        <g stroke="#c9b48a" strokeWidth="3" opacity=".9">
          <line x1="232" y1="36" x2="290" y2="84" />
          <line x1="290" y1="36" x2="232" y2="84" />
        </g>
      )}
      {/* shelf */}
      <rect x="24" y="96" width="96" height="6" rx="2" fill="#6b5237" />
      <rect x="24" y="140" width="96" height="6" rx="2" fill="#6b5237" />
      {stocked && (
        <g>
          {/* water bottles */}
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${30 + i * 16} 70)`}>
              <rect x="0" y="6" width="11" height="20" rx="3" fill="#6fa8dc" />
              <rect x="3" y="0" width="5" height="7" rx="1" fill="#3d6f9e" />
            </g>
          ))}
          {/* cans */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={82 + i * 9} y="82" width="8" height="14" rx="1.5" fill={i % 2 ? '#c94c3b' : '#d9a441'} />
          ))}
          {/* boxes on lower shelf */}
          <rect x="30" y="118" width="26" height="22" rx="2" fill="#a8763e" />
          <rect x="60" y="124" width="20" height="16" rx="2" fill="#8c6238" />
          <rect x="86" y="114" width="28" height="26" rx="2" fill="#b98b52" />
        </g>
      )}
      {fortified && (
        <g>
          {/* radio on shelf */}
          <rect x="88" y="116" width="26" height="14" rx="2" fill="#2d3238" />
          <circle cx="96" cy="123" r="4" fill="#c9c9c9" />
          <line x1="110" y1="116" x2="116" y2="104" stroke="#c9c9c9" strokeWidth="1.5" />
          {/* warm lamp glow */}
          <circle cx="160" cy="24" r="60" fill="var(--amber)" opacity=".08" className="anim-flicker" />
          <rect x="154" y="6" width="12" height="12" rx="2" fill="#f3d27a" />
        </g>
      )}
      {/* rug */}
      <ellipse cx="160" cy="236" rx="110" ry="14" fill={stocked ? '#5a4a3a' : '#3d4147'} opacity=".7" />
    </g>
  );
}

// --------------------------------------------------------------------------
// Character
// --------------------------------------------------------------------------
function Face({ mood, skin }: { mood: Mood; skin: string }) {
  const browTilt = mood === 'uneasy' ? 8 : mood === 'confident' ? -3 : 0;
  return (
    <g>
      <circle cx="160" cy="84" r="30" fill={skin} />
      {/* ears */}
      <circle cx="131" cy="86" r="5" fill={skin} />
      <circle cx="189" cy="86" r="5" fill={skin} />
      {/* eyes */}
      <g className="anim-blink">
        <ellipse cx="149" cy="84" rx="3.2" ry="4" fill="#1e1a17" />
        <ellipse cx="171" cy="84" rx="3.2" ry="4" fill="#1e1a17" />
      </g>
      {/* brows */}
      <line x1="143" y1={74 + browTilt / 2} x2="154" y2={74 - browTilt / 2} stroke="#1e1a17" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="166" y1={74 - browTilt / 2} x2="177" y2={74 + browTilt / 2} stroke="#1e1a17" strokeWidth="2.4" strokeLinecap="round" />
      {/* mouth */}
      {mood === 'confident' && <path d="M150 96 Q160 106 170 96" stroke="#1e1a17" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
      {mood === 'neutral' && <line x1="152" y1="98" x2="168" y2="98" stroke="#1e1a17" strokeWidth="2.4" strokeLinecap="round" />}
      {mood === 'uneasy' && <path d="M151 100 Q156 95 160 100 Q164 105 169 100" stroke="#1e1a17" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
      {/* cheeks */}
      {mood === 'confident' && (
        <g opacity=".35" fill="#e0785a">
          <circle cx="142" cy="93" r="4" />
          <circle cx="178" cy="93" r="4" />
        </g>
      )}
    </g>
  );
}

function Hair({ style }: { style: string }) {
  switch (style) {
    case 'short':
      return <path d="M131 80 Q132 52 160 52 Q188 52 189 80 Q182 62 160 62 Q138 62 131 80Z" fill={HAIR} />;
    case 'long':
      return (
        <g fill={HAIR}>
          <path d="M131 80 Q132 52 160 52 Q188 52 189 80 Q182 62 160 62 Q138 62 131 80Z" />
          <path d="M131 78 Q126 100 132 120 L142 120 Q136 100 140 84Z" />
          <path d="M189 78 Q194 100 188 120 L178 120 Q184 100 180 84Z" />
        </g>
      );
    case 'curly':
      return (
        <g fill={HAIR}>
          <circle cx="140" cy="62" r="11" /><circle cx="152" cy="54" r="12" /><circle cx="166" cy="53" r="12" />
          <circle cx="180" cy="61" r="11" /><circle cx="133" cy="76" r="8" /><circle cx="187" cy="76" r="8" />
        </g>
      );
    case 'bun':
      return (
        <g fill={HAIR}>
          <path d="M131 80 Q132 52 160 52 Q188 52 189 80 Q182 62 160 62 Q138 62 131 80Z" />
          <circle cx="160" cy="50" r="9" />
        </g>
      );
    default:
      return null;
  }
}

function Body({ look, gear }: { look: AvatarLook; gear: Set<string> }) {
  const w = bodyWidth(look.body);
  const x = 160 - w / 2;
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES.medium;
  return (
    <g>
      {/* legs */}
      <rect x={160 - w / 2 + 6} y="176" width={w / 2 - 8} height="46" rx="6" fill={TROUSERS} />
      <rect x={160 + 2} y="176" width={w / 2 - 8} height="46" rx="6" fill={TROUSERS} />
      {/* shoes or boots */}
      {gear.has('boots') ? (
        <g fill="#5a3b21">
          <rect x={160 - w / 2 + 3} y="206" width={w / 2 - 3} height="20" rx="5" />
          <rect x={160} y="206" width={w / 2 - 3} height="20" rx="5" />
          <rect x={160 - w / 2 + 3} y="216" width={w / 2 - 3} height="6" fill="#3d2816" />
          <rect x={160} y="216" width={w / 2 - 3} height="6" fill="#3d2816" />
        </g>
      ) : (
        <g fill="#2a2a2a">
          <rect x={160 - w / 2 + 4} y="216" width={w / 2 - 5} height="10" rx="4" />
          <rect x={160 + 1} y="216" width={w / 2 - 5} height="10" rx="4" />
        </g>
      )}
      {/* torso */}
      <rect x={x} y="112" width={w} height="70" rx="14" fill={SHIRT} />
      <rect x={x} y="112" width={w} height="16" rx="8" fill={SHIRT_DARK} opacity=".5" />
      {/* arms */}
      <rect x={x - 14} y="118" width="14" height="52" rx="7" fill={SHIRT} />
      <rect x={x + w} y="118" width="14" height="52" rx="7" fill={SHIRT} />
      {/* hands */}
      <circle cx={x - 7} cy="172" r="7" fill={skin} />
      <circle cx={x + w + 7} cy="172" r="7" fill={skin} />
      {/* neck */}
      <rect x="152" y="104" width="16" height="12" fill={skin} />
      {/* blanket / scarf */}
      {gear.has('blanket') && (
        <path d={`M${x - 2} 116 Q160 132 ${x + w + 2} 116 L${x + w + 2} 126 Q160 142 ${x - 2} 126Z`} fill="#b5473d" />
      )}
      {/* documents in chest pocket */}
      {gear.has('documents') && <rect x={x + w - 18} y="134" width="12" height="15" rx="1.5" fill="#f1e9d2" stroke="#c9b48a" />}
      {/* first aid pouch on belt */}
      {gear.has('firstaid') && (
        <g transform={`translate(${x + 4} 170)`}>
          <rect width="16" height="13" rx="2" fill="#d94c3d" />
          <rect x="6.5" y="2.5" width="3" height="8" fill="#fff" />
          <rect x="4" y="5" width="8" height="3" fill="#fff" />
        </g>
      )}
      {/* water bottle on hip */}
      {gear.has('water') && (
        <g transform={`translate(${x + w - 6} 160)`}>
          <rect width="10" height="24" rx="3" fill="#6fa8dc" />
          <rect x="2.5" y="-5" width="5" height="6" rx="1" fill="#3d6f9e" />
        </g>
      )}
      {/* powerbank in pocket */}
      {gear.has('powerbank') && <rect x={x + 6} y="150" width="9" height="16" rx="2" fill="#1f2326" stroke="#8fa35f" />}
    </g>
  );
}

function Backpack({ look }: { look: AvatarLook }) {
  const w = bodyWidth(look.body);
  return (
    <g transform={`translate(${160 - w / 2 - 10} 108)`}>
      <rect width={w + 20} height="64" rx="16" fill="#8a5a2b" />
      <rect x="6" y="8" width={w + 8} height="20" rx="8" fill="#a8763e" />
      <rect x={w / 2 + 2} y="28" width="16" height="22" rx="4" fill="#6b4520" />
    </g>
  );
}

function Handheld({ look, gear }: { look: AvatarLook; gear: Set<string> }) {
  const w = bodyWidth(look.body);
  const x = 160 - w / 2;
  return (
    <g>
      {gear.has('torch') && (
        <g transform={`translate(${x - 12} 158) rotate(-20)`}>
          <rect width="10" height="26" rx="3" fill="#2d3238" />
          <rect x="-2" y="-6" width="14" height="8" rx="2" fill="#4a5058" />
          <path d="M-2 -6 L-14 -22 L24 -22 L12 -6Z" fill="#f3d27a" opacity=".45" />
        </g>
      )}
      {gear.has('radio') && (
        <g transform={`translate(${x + w + 1} 150)`}>
          <rect width="18" height="22" rx="3" fill="#2d3238" />
          <circle cx="9" cy="12" r="5" fill="#c9c9c9" />
          <line x1="15" y1="0" x2="20" y2="-12" stroke="#c9c9c9" strokeWidth="1.5" />
        </g>
      )}
    </g>
  );
}

// --------------------------------------------------------------------------
// Cast
// --------------------------------------------------------------------------
function MiniPerson({ variant, covered, x }: { variant: string; covered: boolean; x: number }) {
  const h = variant === 'infant' ? 22 : variant === 'child' ? 34 : variant === 'teen' ? 44 : 52;
  const y = 222 - h;
  const skin = '#d9a679';
  const shirt = covered ? '#5f7040' : '#6c7278';
  return (
    <g opacity={covered ? 1 : 0.55} transform={`translate(${x} 0)`}>
      <rect x="-9" y={y + h * 0.36} width="18" height={h * 0.64} rx="6" fill={shirt} />
      <circle cx="0" cy={y + h * 0.2} r={h * 0.2} fill={skin} />
      <path d={`M${-h * 0.2} ${y + h * 0.18} Q0 ${y - h * 0.02} ${h * 0.2} ${y + h * 0.18}`} fill={HAIR} />
      {covered ? (
        <g transform={`translate(8 ${y - 4})`}>
          <circle r="6" fill="var(--green)" />
          <path d="M-3 0 L-1 2.5 L3.5 -2.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g transform={`translate(8 ${y - 4})`}>
          <circle r="6" fill="var(--amber)" />
          <text x="0" y="2.6" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1a1208">!</text>
        </g>
      )}
    </g>
  );
}

function MiniPet({ variant, covered, x }: { variant: string; covered: boolean; x: number }) {
  const body = covered ? '#a8763e' : '#7a7a7a';
  return (
    <g opacity={covered ? 1 : 0.55} transform={`translate(${x} 0)`}>
      {variant === 'cat' ? (
        <g fill={body}>
          <ellipse cx="0" cy="210" rx="13" ry="8" />
          <circle cx="-11" cy="202" r="7" />
          <path d="M-16 198 L-15 190 L-11 196Z" /><path d="M-6 198 L-7 190 L-11 196Z" />
          <path d="M12 208 Q22 200 16 194" stroke={body} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      ) : variant === 'dog' ? (
        <g fill={body}>
          <rect x="-14" y="200" width="28" height="14" rx="6" />
          <circle cx="-14" cy="199" r="8" />
          <ellipse cx="-20" cy="200" rx="3" ry="6" />
          <rect x="-11" y="212" width="5" height="10" rx="2" /><rect x="6" y="212" width="5" height="10" rx="2" />
          <path d="M14 204 Q22 198 20 192" stroke={body} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g fill={body}>
          <ellipse cx="0" cy="212" rx="9" ry="7" />
          <circle cx="-7" cy="207" r="5" />
          <ellipse cx="-9" cy="200" rx="2" ry="5" /><ellipse cx="-4" cy="200" rx="2" ry="5" />
        </g>
      )}
      {covered ? (
        <g transform="translate(12 194)">
          <circle r="6" fill="var(--green)" />
          <path d="M-3 0 L-1 2.5 L3.5 -2.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g transform="translate(12 194)">
          <circle r="6" fill="var(--amber)" />
          <text x="0" y="2.6" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1a1208">!</text>
        </g>
      )}
    </g>
  );
}

// --------------------------------------------------------------------------
// Composite
// --------------------------------------------------------------------------
export function Avatar({ look, gear, mood, environment, cast = [], decayed, className, animate = true }: AvatarProps) {
  const g = new Set(gear);
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES.medium;
  const people = cast.filter((c) => c.kind === 'person');
  const pets = cast.filter((c) => c.kind === 'pet');
  const moodClass = !animate ? '' : mood === 'uneasy' ? 'anim-fidget' : 'anim-breathe';

  // Spread people to the left, pets to the right, leaving the character centred.
  const leftSlots = people.map((_, i) => 96 - i * 30).filter((x) => x > 20);
  const rightSlots = pets.map((_, i) => 232 + i * 34).filter((x) => x < 305);

  return (
    <svg viewBox="0 0 320 260" className={className} role="img" aria-label="Your avatar" style={{ display: 'block' }}>
      <Room env={environment} />
      {people.map((p, i) => leftSlots[i] !== undefined && <MiniPerson key={p.id} variant={p.variant} covered={p.covered} x={leftSlots[i]} />)}
      {pets.map((p, i) => rightSlots[i] !== undefined && <MiniPet key={p.id} variant={p.variant} covered={p.covered} x={rightSlots[i]} />)}
      <g className={moodClass} opacity={decayed ? 0.85 : 1}>
        {g.has('backpack') && <Backpack look={look} />}
        <Body look={look} gear={g} />
        <Face mood={mood} skin={skin} />
        <Hair style={look.hair} />
        <Handheld look={look} gear={g} />
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
