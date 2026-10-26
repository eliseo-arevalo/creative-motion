# @eliseo-arevalo/character-kit

Rigged 2D characters for Remotion: flat SVG, hierarchical bones, swappable skins, a pose and gesture
library with springy transitions, mixable facial expressions, auto blink and look-at, and Rhubarb lip-sync.
Brand-agnostic: brand specs and palettes live in the consuming app.

```
src/
  Character.tsx   <Character/>: the whole rig, evaluated per frame
  rig.ts          canvas (800×1500, ground y=1440), joints, 2-bone IK (solveArm), forward kinematics
  poses.ts        POSES (rest, wave, point, think, scratch, celebrate, give, phone, …, crossedArms, wagNo, handshake)
  clips.ts        CLIPS: pose + additive motion layer (idle, wave, point, think, scratch, sigh, celebrate, …)
  arm.ts          effector-space arm moves: paths round the shoulder / face, contacts (blendEffector)
  roll.ts         forearm roll: palm / edge / back (handRoll, NATIVE_ROLL, FACE_ROLL)
  props.tsx       phoneProp: a phone for holdL / holdR that turns with the hand
  pairs.ts        two-character moves: shakeHands, handshakeGap, handshakePose
  timeline.ts     key evaluation, anticipation + overshoot spring, per-bone delays (overlap)
  face.ts         expressions (mixable), blink schedule, look-at
  visemes.ts      Rhubarb visemes A–H/X → mouth shapes; parseRhubarb, visemeAt
  presets.ts      ADULT / CHILD proportions, skin tones, basePalette, DEMO_CHARACTER
  parts/          Hand, Mouth, Head (+hair, accessories), Body (torso, top, skirt/pants, apron), Limbs
scripts/lipsync.sh  wav → Rhubarb JSON or a TS module of MouthCue[]
```

Consume it like motion-kit: `"@eliseo-arevalo/character-kit": "file:../../../creative-motion/packages/character-kit"`
(plus a tsconfig `paths` entry to `src/index.ts`). Remotion's bundler resolves react/remotion for it.

> Render tip: Remotion's bundle cache may not notice edits in a `file:` package. Use `--bundle-cache=false`
> when iterating on the kit.

## Conventions

- Angles in degrees. A bone at 0 hangs straight down; positive rotates **outward** (away from the body).
  The left arm/leg is mirrored, so poses are symmetric by default.
- `elbow` and `wrist` are relative to the parent bone. `lean` positive tips the top of the body to screen right.
- `upper` (0–1) shortens the upper arm: use it as foreshortening when the elbow comes toward camera (phone, chin).
- `handDir` sets the hand direction in torso space after IK (0 = down, 180 = up, + outward).
- `reach` places the wrist with IK at an anchor (`chin`, `cheek`, `ear`, `headTop`, `chest`, `pocket`, `hip`,
  `front`, `torso` = hip centre) plus `dx/dy` in hand lengths; `bend: 1 | -1` picks the elbow side.
- `face: "palm" | "edge" | "back"` (or `roll` in degrees, 0 / 90 / 180) says which side of the hand faces
  the camera. Unset = the shape's own drawing, exactly as before.

## Create a character

```tsx
import { ADULT, basePalette, type CharacterSpec } from "@eliseo-arevalo/character-kit";

export const VECINA: CharacterSpec = {
  name: "Vecina",
  palette: basePalette("brown"), // light | tan | brown | deep, plus ink/mouth/etc.
  proportions: { ...ADULT, hipHalf: 96 },
  head: { shape: "oval", nose: "button", lashes: true },
  hair: { kind: "curly", color: "#3A2A22", shade: "#55402F" },
  top: { kind: "blouse", color: "#3C6FB6", shade: "#2C5287", sleeve: "short" },
  bottom: { kind: "skirt", color: "#2E3A4A", shade: "#1E2733" },
  apron: { kind: "waist", color: "#E8B84A", shade: "#B8881E", outline: "#1E2A24", pocket: "#F7E4B0" },
  shoes: { color: "#1E2A24" },
  accessories: [{ kind: "earrings", color: "#E8B84A" }],
};

<Character spec={VECINA} shadow />;
```

Every part is a prop: swap `hair.kind` (bun, lowBun, short, curly, bob, `long` = loose past the shoulders,
`ponytail`), `top.kind` (tee, blouse, polo, `shirt` = button-up with collar, `blazer` = jacket with lapels over
a collared shirt; `inner` = shirt colour under the blazer, `tie` = optional tie colour),
`bottom.kind` (skirt, pants, shorts), `apron` (bib, waist or none), `accessories` (glasses, earrings, cap,
pencil, necklace, mustache) and the palette. `CHILD` proportions give a kid from the same parts.

## Animate: track, face, look

```tsx
<Character
  spec={VECINA}
  track={[{ at: 0, clip: "idle" }, { at: 30, clip: "wave" }, { at: 90, clip: "think" }]}
  face={[{ at: 0, mix: "neutral" }, { at: 30, mix: "happy" }, { at: 90, mix: { thinking: 0.7, worried: 0.3 } }]}
  look={[{ at: 0, target: "camera" }, { at: 100, target: { x: 700, y: 600 } }]}
  holdR={() => <rect x={-20} y={-40} width={40} height={74} rx={8} fill="#111" />}
/>
```

Moves into each key use anticipation then a spring with overshoot; torso, shoulders, elbows, head, hands
and wrists start a frame or two apart (overlap), and the apron, bow and hair lag behind the body's velocity
(follow-through). Breathing, weight shift and blinks run on their own; `seed` decorrelates characters.

## Create a pose

A `Pose` is a full skeleton. Start from `REST` and override:

```ts
import { REST, type Pose } from "@eliseo-arevalo/character-kit";

export const SHRUG: Pose = {
  ...REST,
  shrug: 1,
  head: 6,
  armL: { shoulder: 18, elbow: 70, wrist: 20, hand: "open" },
  armR: { shoulder: 18, elbow: 70, wrist: 20, hand: "open" },
};
// Use it inline: track={[{ at: 0, pose: SHRUG }]}
```

Hand shapes: `relaxed` (side-on, for rest), `open` (palm), `flat` (back of the hand, fingers together:
cheek, chest), `point`, `fist`, `hold` (wrapping grip), `pinch` (thumb + index), `count1`, `count2`, `count3`.
Every shape is the same model (palm + four three-point fingers + thumb), so a change of shape between two
keys **morphs** finger by finger instead of popping. `<Hand shape from mix />` draws any blend. `shake`
is the handshake grip (edge-on, thumb up).

### Palm, back, edge (forearm roll)

Each shape is drawn from one side (`NATIVE_ROLL`: `open` / `hold` / `count*` palm, `flat` / `fist` / `point` /
`pinch` back, `relaxed` / `shake` edge). An arm's `face` (or `roll`) turns the forearm: the hand narrows to
~30 % through its edge and flips there, so palm ↔ back is a roll, not a pop; edge-on drawings only narrow a
little. Rolls follow the forearm a few frames late (wrist trail). In poses: wave = `palm`, point = `back`/`edge`,
cheek = `back`. Layers can add `roll` too (`ArmDelta.roll`), and `dx` / `dy` (hand lengths, x outward, y down)
to move the wrist target: taps, presses, pumps. `handRoll(shape, from, mix, roll)` gives `{ sx, view }`
(`sx` = horizontal scale of the drawing, negative = other face); no roll ⇒ `{ sx: 1, view: 1 }`.

### Holding things

`holdL` / `holdR` draw in hand space, with the origin at the grip slot, while the hand's dominant shape is
`hold` or `pinch`. Centre the object on the origin; the fingers are drawn over it, so they wrap it:

```tsx
const PHONE: HoldRender = ({ worldAngle, shape }) => (
  <g transform={`rotate(${-worldAngle})`}>            {/* keep it upright on screen */}
    <rect x={-22} y={-42} width={44} height={84} rx={8} fill="#222" />
  </g>
);
```

`shape` tells you which grip is showing (`hold` = phone, notebook, box; `pinch` = bill, coin, card).
`view` (−1…1) says which way the object faces: 1 its front to the camera, −1 turned toward the character.

`phoneProp(look?)` is a ready phone that uses it: screen when shown to the camera, back + camera + lit edge
when the character looks at it, the case side in 3/4. `PhoneLook`: `body`, `screen`, `back`, `detail`,
`content` (your UI in a 40 × 74 box), `upright`, `glow` (tap flash).

```tsx
<Character spec={ANA} track={[{ at: 0, clip: "phoneTap" }]} holdR={phoneProp()} />          // looking + tapping
<Character spec={ANA} track={[{ at: 0, clip: "phoneTapShow" }]} holdL={phoneProp({ upright: true })} /> // to camera
```

`forward(spec, pose).armR.point(x, y)` gives the canvas position of a point in hand-model space (82-px hand,
roll applied), e.g. the index tip `point(16, 80)` of a `point` hand.

## Create a gesture (clip)

A clip is a pose plus an additive layer `(t, fps) => PoseDelta`, where `t` is frames since the key:

```ts
import { POSES, type Clip } from "@eliseo-arevalo/character-kit";

export const NOD: Clip = {
  pose: POSES.rest,
  antic: 0.05,
  layer: (t) => ({ head: Math.sin(t / 4) * 6 * Math.max(0, 1 - t / 40) }),
};
// track={[{ at: 20, clip: NOD }]}  (or add it to your own clip table and use names)
```

Layers fade in over 6 frames and out over 8 when the next key starts.

A clip can be a short sequence of poses with `steps` (frames since the key), sharing one layer:

```ts
answerPhone: {
  pose: POSES.phonePocket,                    // hand at the pocket, phone in a grip
  steps: [
    { at: 12, pose: POSES.phoneLook },        // phone up in front of the chest
    { at: 30, pose: POSES.phone },            // at the ear: elbow down and out, head tilted
    { at: 112, pose: POSES.phoneLook },
    { at: 130, pose: POSES.phoneDown },
  ],
  layer: (t) => ({ head: talkNods(t) }),
}
```

## Arms: IK, limits, paths, contacts

Arms with a `reach` (a body / head anchor) are solved with two-bone IK; every arm, solved or not, is then
clamped to `ARM_LIMITS`:

| joint    | range                                                          |
| -------- | -------------------------------------------------------------- |
| shoulder | −80° … 190° (0 = down, + = outward / up)                       |
| elbow    | folds one way only, up to 152°, ≤ 8° hyperextension            |
| wrist    | −95° … 95°                                                     |

- **No stretching**: the wrist target is clamped to `[dMin, upper + fore]` (`dMin` = full elbow fold).
- **Pole**: `pole: [u, v]` (shoulder space, u outward, v down) picks which way the elbow points; the default
  is out and down. The elbow never flips to the other side mid-move.
- **Bend direction** (`bendSign`): taken from each key. When two keys fold opposite ways (e.g. phone in
  front of the chest → at the ear) the elbow swings *toward the camera* over ~8 frames: it slides onto the
  shoulder→wrist line while both bones foreshorten (`upper`, `fore`), instead of popping to the mirror pose.
- **Paths**: hands travel on arcs (quadratic Bézier), not straight lines. Paths bow away from the shoulder
  (no fully-folded pass), around the outside of the head (chin → top of the head), and come up to the face
  from below / outside. Overshoot runs along the end tangent, never into the face.
- **Contacts** (`cheek`, `chin`, `ear`, `headTop`, …): the hand may only enter the head oval near the
  anchor it is landing on or leaving; the palm turns to the face before landing and leaves before turning.
- **Timing**: arm moves are a spring (`ARM_FEEL`, light anticipation `ARM_ANTIC`) whose pace depends on the
  distance (`armPace`: short adjustments quick, long reaches slower, landing on / leaving the face a bit
  slower); the shoulder and elbow follow the core by 1–2 frames, the hand shape by 3, the hand's direction and
  roll trail the forearm (≈2 frames, never more than 28°). Leaving a face contact the hand lifts off before it
  turns. Through an elbow fold change the arm passes "elbow to camera" (foreshortened), never a flip.
- **Path choice**: the bow round the shoulder / face is decided once per move on its two key poses
  (`blendEffector(p, side, body, from, to, t, keys?: MoveKeys, off?)`), so the path never changes side mid-move.
- **Layering**: in a 3/4 turn the far arm crossfades between behind and in front of the torso / face
  (`armFrontAt`, averaged over past frames), so it never flickers.

### Test

`npm test` runs `test/features.test.mjs` (roll: identity when unset, one flip through the edge with
continuous width; phone view look vs show; fingertip contact and lift at `PHONE_TAPS`; crossed arms crossing
the midline; wag oscillation; handshake grips meeting with pumps in sync) and `test/rig.test.mjs`: every ordered pair of clips (adult and child) plus each clip from idle
in full, frame by frame, checking joint ranges, inverted elbows, stretching, hand / forearm / elbow inside
the head (except at the contact), wrist pops, elbow flips and layer flicker. It must report 0 violations.

## 3/4 turns

```tsx
<Character spec={TENDERA} turn={[{ at: 0, yaw: 0 }, { at: 20, yaw: 1 }, { at: 60, yaw: -0.5 }]} />
```

`yaw` −1 … 1 (±1 = three-quarter view to screen left / right). The head leads with a spring; the body follows
3 frames later at 75% (the far shoulder narrows and its arm goes behind the torso, a side plane appears,
apron and necklace slide toward the turn). Features compress on the far side, the near ear stays, the far
ear tucks away.

**Hair cap (v7).** Every hair kind draws a cap that follows the skull in 3/4 (crown, temples and nape
stay covered at any `yaw`); only the intentional skin strip under the fringe/hairline shows. The parts
are exported as `Head`, `HairBehind` and `hairCapPath(p, hair, yaw)` for custom heads.
Check: `test/hair.test.mjs` rasterizes every hair kind (adult + child, round + other head shapes) at
yaws −1.1 … 1.1 and fails on skin pixels above the hairline.

## Gestures

Clips: `idle`, `wave`, `point`, `think`, `phone`, `give`, `celebrate`, `scratch`, `deadpan`, `sigh`,
`akimbo`, plus `count` (counts 1-2-3 on the fingers), `pointPhone` (phone in the left hand, right index
taps it), `cheek` (flat hand on the cheek, wrist tap), `shrug` and `answerPhone` (pocket → look → ear →
talk → lower; hold a `PHONE` in `holdR`).

New: `phoneTap` (looking at the phone in the right hand, screen toward the character; the left index taps it:
approach, contact, rebound, and the phone dips at each contact, `PHONE_TAPS` / `tapCurve` / `tapRecoil`),
`phoneTapShow` (phone held up to the camera in the left hand, the right index taps it), `crossedArms` (with a
small "hmph"), `refuse` (arms crossed, head shakes "no"), `wagNo` (finger wag "no, no"), `handshake` (three
pumps then hold). Expressions add `angry`. Poses: `phoneCheck`, `phoneShow`, `crossedArms`, `wagNo`, `handshake`.

### Handshake between two characters

```tsx
const hs = shakeHands(ANA, MARIO);           // same grip height for both, same pump in pixels
const gap = hs.gap;                          // distance between their canvas centres
<g transform={`translate(${-gap / 2} 0)`}><Character spec={ANA} track={[{ at: 0, clip: hs.a }]} /></g>
<g transform={`translate(${800 + gap / 2} 0) scale(-1 1)`}><Character spec={MARIO} track={[{ at: 0, clip: hs.b }]} /></g>
```

Start both clips on the same frame: the pumps are in sync. `handshakeGap(a, b)` is `shakeHands(a, b).gap`;
`handshakePose(spec, gripY?)` is the pose with the grip at a canvas height.

Long hair and ponytails hang behind the body: `<Character/>` draws them itself (`HairBehind` is exported
for custom compositions).

## Lip-sync

Rhubarb (1.14, `~/.local/bin/rhubarb` on the box) turns a wav into mouth cues. The script uses the
language-independent phonetic recognizer, so Spanish works:

```bash
bash packages/character-kit/scripts/lipsync.sh vo.wav src/characters/lipsync/vo.ts vo   # TS module
bash packages/character-kit/scripts/lipsync.sh vo.wav vo.json                            # raw JSON
TEXT=vo.txt bash packages/character-kit/scripts/lipsync.sh vo.wav vo.json                # with transcript
```

Then align the cues with the audio frame:

```tsx
import { vo } from "./lipsync/vo";

<Sequence from={40}><Audio src={staticFile("vo.wav")} /></Sequence>
<Character spec={VECINA} speech={[{ from: 40, cues: vo }]} />
```

Visemes A–H and X map to mouth shapes (open, wide, round, teeth, tongue, bite, pressed) with a short
crossfade. While talking, the mouth comes from the viseme and the rest of the face from the expression.
For JSON, `parseRhubarb(json)` gives the same `MouthCue[]`.

### Spanish from ElevenLabs timestamps (preferred)

If the VO comes from ElevenLabs `/with-timestamps`, keep its `alignment` (characters + start/end seconds)
and map letters to visemes directly; it is exact and costs nothing extra:

```ts
import { cuesFromAlignment } from "@eliseo-arevalo/character-kit";
import alignment from "./vo.alignment.json";

const cues = cuesFromAlignment(alignment, { offset: 0 }); // MouthCue[]
```

Spanish rules: a→D, e→C, i/y→B, o→E, u→F, m/b/p/v→A (closed), f→G, l/n/ñ/d/t→H, other consonants take
the neighbouring vowel's shape; `h` and the `u` of que/qui/gue/gui are silent; commas, periods and pauses
≥ 0.12 s close the mouth (X). Use Rhubarb when there is no alignment (recorded voice).

## Legs, feet, walk and weight

The lower body is a small 3D-ish rig (x, up, z toward camera, foreshortened by `LEGS.depth`):
two-bone IK legs whose knee always bends toward the foot's forward vector (never backward),
feet with heel / ball / toe pivots and toe flex, and planted feet that stay locked to the world.
The body is evaluated with `evaluateBody` (which wraps `evaluatePose`); `<Character>` does it for you.

```tsx
<Character
  spec={ANA}
  track={[{ at: 0, clip: "idle" }, { at: 40, clip: "wave" }]}
  turn={[{ at: 0, yaw: 0 }, { at: 8, yaw: -1 }]}
  walk={[{ at: 10, to: -220 }, { at: 90, to: 120, cadence: 1.9 }]}
/>
```

- **`walk: WalkKey[]`** — `{ at, to, cadence?, stride?, face?, inPlace? }`. Walks the hips to `Pose.x = to`
  (added to the track's own x) with a planned gait: contact (heel strike, hips down) → down → passing
  (hips up) → toe off, one foot always on the ground, arms swinging against the legs, a slight lean and
  shoulder counter-rotation. `face` (default true) turns 3/4 toward the walk and back; `inPlace` keeps
  the body at x and returns the travelled distance via `walkOffset` so a parent can move the layer
  (feet stay locked to the world). Deterministic: the plan only depends on the keys (`feetPlanOf`).
- **Walk v7 (natural gait, Williams / Blair)** — the hips ride an arc (lowest ~2 frames after each heel
  strike, highest at passing) with soft knees (the stance knee never locks); the pelvis twists with the
  legs and the shoulders counter-rotate; the head overlaps with a small nod; elbows are loose and the
  forearm / hand trail the upper arm; the body speeds up and slows within each step; a walk starts with
  an anticipation (weight onto the support foot, hips dip) and stops with a small overshoot that settles.
  Hair, ponytail and a skirt (hem flare + swing) follow the twist a few frames late. Steps vary a little
  (timing ±1 f, length ±4%, lift / bob / arm ±8–12%) and each `<Character seed>` walks a little
  differently; children bounce more. Deterministic for the same keys and seed.
- **New optional WalkKey fields** — `chain: true` turns round mid-walk without stopping (the new leg
  starts where the previous one would have closed, turning through the front); `bounce` (default 1)
  scales the hip bob; `arms` (default 1) scales the arm swing (0 = arms still, e.g. carrying something).
- **`Pose.weight`** (optional, −1 … 1) — contrapposto: hips over the weighted foot, that hip up, the free
  knee flexes, shoulders counter-tilt. Poses without it behave as before; `idle` now drifts it slightly.
- **Turns and pose changes** shuffle the feet: one foot, then the other (no hop), pivoting on the ball.
- **Torso**: breathing with a few % squash/stretch on contact, follow-through from fast arm swings
  (±1.5°), a curved shirt hem and the pants drawn inside it (no hard seam at the waist).
- **Shoes**: sole + upper + collar from the foot outline; they point where the body points in 3/4. A welt
  line and a toe cap give front-view shoes a readable sole and toe (v7).

Lower-level API: `LEGS` (tuning), `legLength`, `footOf`, `planFeet`, `footAt`, `solveLower`, `solveLeg`,
`toScreen`, `walkOffset`, `walkingAt` (now also returns `mix`, the blended walk direction), `gaitAt(plan, frame)`
(gait phase 0 = heel strike … 1, plus that step's `amp` / `arm`), `yawsAt`, `evaluateBody` (`opts.seed`),
`feetPlanOf(..., seed?)`, `planFeet(..., seed?)`, and the `LegView` / `Shoe` / `Bottom` (`stride?`, `swing?`) parts.

Checks: `test/legs.test.mjs` (feet never slide, knees never invert, legs never stretch, soles never below
the ground, gait phases, arm swing never over the torso, contrapposto, 3/4 stagger, in-place lock) and the
rig check (`checkLegs` over every clip transition, walks and turns), and `test/gait.test.mjs` (hip arc,
soft stance knee, anticipation, stop settle, step / seed variation, chained turn, loose arms, skirt swing,
back-compat).

## Limitations

- Walks are straight lines on the ground plane (no stairs, no running); a mid-walk turn is a reversal
  (`chain`), not a curved path. There is no lateral body sway in x (it would read as a limp in the 3/4
  cheat); the sway is carried by pelvis roll / counter-tilt and twist. The stop still ends with a small
  pivot shuffle as the body turns back to camera. Front-view shoes are flat-shaded (welt + toe cap only).

No full profile (3/4 is the most), the body turn is a 2D cheat (good to ±1, not beyond), IK is 2D
(depth is faked with foreshortening: the `upper` / `fore` factors and the elbow-toward-camera swing), hands are cartoon four-finger hands with no per-finger
posing beyond the shape library, and Rhubarb is approximate for Spanish (use alignment when possible).
