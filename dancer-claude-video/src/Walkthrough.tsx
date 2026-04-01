import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { Video } from "@remotion/media";

const BG = "#0f1019";
const ORANGE = "#f97316";
const BLUE = "#38bdf8";
const GREEN = "#4ade80";
const PURPLE = "#bc8cff";
const GRAY = "#888";
const TEXT = "#e0e0e0";
const SUBTEXT = "#a0a0a0";

type NodeDef = {
  emoji: string;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const RUNTIME_NODES: NodeDef[] = [
  { emoji: "\u{1F3B5}", label: "Upload Song", color: ORANGE, x: 80, y: 180, w: 200, h: 80 },
  { emoji: "\u{1F442}", label: "Hear the Music", color: ORANGE, x: 360, y: 180, w: 220, h: 80 },
  { emoji: "\u{1F3B2}", label: "Pick a Move", color: BLUE, x: 660, y: 180, w: 220, h: 80 },
  { emoji: "\u{1F483}", label: "Dance", color: BLUE, x: 960, y: 180, w: 200, h: 80 },
  { emoji: "\u{1F3AC}", label: "Render", color: GRAY, x: 1240, y: 180, w: 180, h: 80 },
];

const LEARNING_NODES: NodeDef[] = [
  { emoji: "\u{1F4F9}", label: "YouTube Video", color: GREEN, x: 80, y: 180, w: 210, h: 80 },
  { emoji: "\u{1F441}\uFE0F", label: "Watch Dancer", color: GREEN, x: 370, y: 180, w: 220, h: 80 },
  { emoji: "\u{1F9D1}\u200D\u{1F4BB}", label: "Extract Poses", color: GREEN, x: 670, y: 180, w: 220, h: 80 },
  { emoji: "\u{1F4BE}", label: "Save Choreography", color: GREEN, x: 970, y: 180, w: 250, h: 80 },
];

const MINING_NODES: NodeDef[] = [
  { emoji: "\u{1F9E9}", label: "Find Patterns", color: PURPLE, x: 80, y: 180, w: 220, h: 80 },
  { emoji: "\u{1F9D1}", label: "Human Picks", color: PURPLE, x: 380, y: 180, w: 210, h: 80 },
  { emoji: "\u{1F517}", label: "Fuse to Skeleton", color: PURPLE, x: 670, y: 180, w: 250, h: 80 },
  { emoji: "\u{1F4DA}", label: "Add to Library", color: BLUE, x: 1000, y: 180, w: 220, h: 80 },
];

// ─── Typewriter — 3 frames per char (slower, more readable) ─
const CHAR_FRAMES = 3;
const CURSOR_BLINK = 16;

const getTypedText = (frame: number, text: string): string => {
  const chars = Math.min(text.length, Math.floor(frame / CHAR_FRAMES));
  return text.slice(0, chars);
};

const Cursor: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(
    frame % CURSOR_BLINK,
    [0, CURSOR_BLINK / 2, CURSOR_BLINK],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <span style={{ opacity }}>{"\u258C"}</span>;
};

const TypewriterText: React.FC<{
  text: string;
  startFrame: number;
  color?: string;
  fontSize?: number;
}> = ({ text, startFrame, color = SUBTEXT, fontSize = 30 }) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - startFrame);
  const typed = getTypedText(localFrame, text);

  return (
    <div
      style={{
        position: "absolute",
        top: "65%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "75%",
        textAlign: "center",
        fontSize,
        fontWeight: 400,
        color,
        lineHeight: 1.7,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <span>{typed}</span>
      <Cursor frame={localFrame} />
    </div>
  );
};

// ─── Diagram components ──────────────────────────────

const DiagramNode: React.FC<{ node: NodeDef; progress: number }> = ({ node, progress }) => {
  const scale = interpolate(progress, [0, 1], [0.5, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", left: node.x, top: node.y, width: node.w, height: node.h,
      borderRadius: 16, border: `2px solid ${node.color}`, background: `${node.color}10`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      transform: `scale(${scale})`, opacity,
    }}>
      <span style={{ fontSize: 28 }}>{node.emoji}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: node.color, marginTop: 4 }}>{node.label}</span>
    </div>
  );
};

const Arrow: React.FC<{ fromX: number; toX: number; y: number; color: string; progress: number }> = ({ fromX, toX, y, color, progress }) => {
  const width = (toX - fromX) * interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(progress, [0, 1], [0, 0.6], { extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", left: fromX, top: y, width, height: 3, background: color, opacity, borderRadius: 2 }} />;
};

const SectionLabel: React.FC<{ text: string; color: string; progress: number }> = ({ text, color, progress }) => {
  const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", left: 80, top: 130, fontSize: 14, fontWeight: 700,
      letterSpacing: 3, color, opacity, textTransform: "uppercase",
    }}>
      {text}
    </div>
  );
};

// ─── Title Card ──────────────────────────────────────
const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleScale = spring({ frame, fps, config: { damping: 200 } });
  const taglineOpacity = interpolate(frame, [1 * fps, 2.5 * fps], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, transform: `scale(${titleScale})`, letterSpacing: 2 }}>
        Dancer Claude
      </div>
      <div style={{ fontSize: 24, color: SUBTEXT, marginTop: 16, opacity: taglineOpacity, letterSpacing: 1 }}>
        A stick figure that dances to music — three ways
      </div>
    </AbsoluteFill>
  );
};

// ─── Explainer Scene ─────────────────────────────────
const ExplainerScene: React.FC<{
  nodes: NodeDef[];
  sectionLabel: string;
  sectionColor: string;
  description: string;
}> = ({ nodes, sectionLabel, sectionColor, description }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const staggerDelay = 0.5 * fps;
  const diagramDone = nodes.length * staggerDelay + 0.5 * fps;
  const textStart = diagramDone + 0.3 * fps;

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <SectionLabel text={sectionLabel} color={sectionColor}
        progress={spring({ frame, fps, config: { damping: 200 } })} />
      {nodes.slice(0, -1).map((node, i) => {
        const next = nodes[i + 1];
        return <Arrow key={`a${i}`} fromX={node.x + node.w} toX={next.x} y={node.y + node.h / 2}
          color={sectionColor} progress={spring({ frame, fps, delay: (i + 0.5) * staggerDelay, config: { damping: 200 } })} />;
      })}
      {nodes.map((node, i) => (
        <DiagramNode key={node.label} node={node}
          progress={spring({ frame, fps, delay: i * staggerDelay, config: { damping: 15, stiffness: 200 } })} />
      ))}
      <TypewriterText text={description} startFrame={textStart} />
    </AbsoluteFill>
  );
};

// ─── Demo Clip — very gentle transition ──────────────
const DemoClip: React.FC<{
  videoSrc: string;
  label: string;
  labelColor: string;
  durationInFrames: number;
}> = ({ videoSrc, label, labelColor, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Super gentle fades — 1s in, 3s out
  const vis = interpolate(frame, [0, 1 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const visOut = interpolate(frame, [durationInFrames - 3 * fps, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const audioVolume = (f: number) => {
    const vIn = interpolate(f, [0, 1 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const vOut = interpolate(f, [durationInFrames - 3 * fps, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return Math.min(vIn, vOut);
  };

  return (
    <AbsoluteFill style={{ background: BG, opacity: Math.min(vis, visOut) }}>
      <Video src={staticFile(videoSrc)} style={{ width: 1920, height: 1080, objectFit: "contain" }} volume={audioVolume} />
      <div style={{
        position: "absolute", top: 30, left: 40, background: `${BG}cc`,
        padding: "8px 20px", borderRadius: 8, border: `1px solid ${labelColor}40`,
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: labelColor, fontFamily: "'DM Sans', system-ui" }}>{label}</span>
      </div>
    </AbsoluteFill>
  );
};

// ─── Fusion Reveal ───────────────────────────────────
const FusionReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const runtimeNodes: NodeDef[] = [
    { emoji: "\u{1F3B5}", label: "Song", color: ORANGE, x: 120, y: 140, w: 140, h: 60 },
    { emoji: "\u{1F442}", label: "Ears", color: ORANGE, x: 320, y: 140, w: 140, h: 60 },
    { emoji: "\u{1F3B2}", label: "Pick Move", color: BLUE, x: 520, y: 140, w: 160, h: 60 },
    { emoji: "\u{1F483}", label: "Dance", color: BLUE, x: 740, y: 140, w: 140, h: 60 },
    { emoji: "\u{1F3AC}", label: "Render", color: GRAY, x: 940, y: 140, w: 140, h: 60 },
  ];
  const learningNodes: NodeDef[] = [
    { emoji: "\u{1F4F9}", label: "YouTube", color: GREEN, x: 120, y: 480, w: 140, h: 60 },
    { emoji: "\u{1F441}\uFE0F", label: "Eyes", color: GREEN, x: 320, y: 480, w: 140, h: 60 },
    { emoji: "\u{1F9E9}", label: "Patterns", color: PURPLE, x: 520, y: 480, w: 160, h: 60 },
    { emoji: "\u{1F9D1}", label: "Human", color: PURPLE, x: 740, y: 480, w: 140, h: 60 },
    { emoji: "\u{1F517}", label: "Fuse", color: PURPLE, x: 940, y: 480, w: 140, h: 60 },
  ];

  const row1P = spring({ frame, fps, config: { damping: 200 } });
  const row2P = spring({ frame, fps, delay: 1.5 * fps, config: { damping: 200 } });
  const connP = spring({ frame, fps, delay: 3 * fps, config: { damping: 200 } });
  const textStart = 4 * fps;

  const renderRow = (nodes: NodeDef[], opacity: number, arrowColor: string) => (
    <>
      {nodes.map((n) => (
        <div key={n.label} style={{
          position: "absolute", left: n.x, top: n.y, width: n.w, height: n.h,
          borderRadius: 12, border: `1.5px solid ${n.color}`, background: `${n.color}10`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity,
        }}>
          <span style={{ fontSize: 20 }}>{n.emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: n.color, marginTop: 2 }}>{n.label}</span>
        </div>
      ))}
      {nodes.slice(0, -1).map((n, i) => (
        <div key={`a${n.label}`} style={{
          position: "absolute", left: n.x + n.w, top: n.y + n.h / 2,
          width: nodes[i + 1].x - n.x - n.w, height: 2,
          background: arrowColor, opacity: opacity * 0.4, borderRadius: 1,
        }} />
      ))}
    </>
  );

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ position: "absolute", left: 120, top: 100, fontSize: 13, fontWeight: 700,
        letterSpacing: 3, color: ORANGE, opacity: row1P, textTransform: "uppercase" }}>Runtime</div>
      {renderRow(runtimeNodes, row1P, ORANGE)}

      <div style={{ position: "absolute", left: 120, top: 440, fontSize: 13, fontWeight: 700,
        letterSpacing: 3, color: GREEN, opacity: row2P, textTransform: "uppercase" }}>Learning</div>
      {renderRow(learningNodes, row2P, GREEN)}

      {/* Connection */}
      <div style={{
        position: "absolute", left: 590, top: 210, width: 3, height: 260,
        background: `linear-gradient(to top, ${PURPLE}, ${BLUE})`,
        opacity: connP * 0.7, borderRadius: 2,
      }} />
      <div style={{
        position: "absolute", left: 610, top: 320, fontSize: 22, fontWeight: 700,
        color: PURPLE, opacity: connP, letterSpacing: 3,
      }}>FUSION</div>

      <TypewriterText
        text="A biased coin flip decides: learnt move or freestyle? Joint angles are the invariant that bridges both worlds."
        startFrame={textStart}
        fontSize={26}
      />
    </AbsoluteFill>
  );
};

// ─── Outro ───────────────────────────────────────────
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 200 } });
  const ghOp = interpolate(frame, [1 * fps, 2.5 * fps], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT, transform: `scale(${scale})` }}>Dancer Claude</div>
      <div style={{ fontSize: 22, color: SUBTEXT, marginTop: 16, opacity: ghOp }}>github.com/VivekKarmarkar/dancer-claude</div>
    </AbsoluteFill>
  );
};

// ─── Main Composition ────────────────────────────────
// Timing math (CHAR_FRAMES=3, fps=30):
//   Freestyle text: 209 chars * 3/30 = 20.9s typing + 4s diagram + 5s breathing = 30s
//   Learnt Dance:   181 chars * 3/30 = 18.1s + 4s + 5s = 27s → use 25s
//   Learnt Move:    209 chars * 3/30 = 20.9s + 4s + 5s = 30s
//   Fusion:         110 chars * 3/30 = 11.0s + 5s + 5s = 21s → use 18s
//
// Title(6) + FreestyleExp(28) + FreestyleDemo(20) + LearntDanceExp(24) + LearntDanceDemo(9)
// + LearntMoveExp(28) + LearntMoveDemo(6) + FusionExp(18) + FusionDemo(15) + Outro(6) = 160s

const FPS = 30;
const T = (s: number) => Math.round(s * FPS);

export const Walkthrough: React.FC = () => {
  const { fps } = useVideoConfig();

  let t = 0;
  const title_start = t;          t += T(6);
  const free_exp_start = t;       const free_exp_dur = T(28);  t += free_exp_dur;
  const free_demo_start = t;      const free_demo_dur = T(20); t += free_demo_dur;
  const learn_exp_start = t;      const learn_exp_dur = T(24); t += learn_exp_dur;
  const learn_demo_start = t;     const learn_demo_dur = T(9); t += learn_demo_dur;
  const mine_exp_start = t;       const mine_exp_dur = T(28);  t += mine_exp_dur;
  const mine_demo_start = t;      const mine_demo_dur = T(6);  t += mine_demo_dur;
  const fuse_exp_start = t;       const fuse_exp_dur = T(18);  t += fuse_exp_dur;
  const fuse_demo_start = t;      const fuse_demo_dur = T(15); t += fuse_demo_dur;
  const outro_start = t;          t += T(6);

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Sequence from={title_start} durationInFrames={T(6)} premountFor={fps}>
        <TitleCard />
      </Sequence>

      <Sequence from={free_exp_start} durationInFrames={free_exp_dur} premountFor={fps}>
        <ExplainerScene nodes={RUNTIME_NODES} sectionLabel="Freestyle Mode" sectionColor={ORANGE}
          description="Upload any song. The Ears analyze the waveform in real time. The Body picks a move from 23 in its vocabulary, matching the energy level. Groove bounce, spring easing, and layered movement make it feel natural." />
      </Sequence>

      <Sequence from={free_demo_start} durationInFrames={free_demo_dur} premountFor={fps}>
        <DemoClip videoSrc="freestyle.mp4" label="Freestyle" labelColor={ORANGE} durationInFrames={free_demo_dur} />
      </Sequence>

      <Sequence from={learn_exp_start} durationInFrames={learn_exp_dur} premountFor={fps}>
        <ExplainerScene nodes={LEARNING_NODES} sectionLabel="Learnt Mode — Songs" sectionColor={GREEN}
          description="Download a YouTube dance video. Computer vision extracts 13-joint poses at 15fps. The full choreography is saved and the stick figure replays the exact dance in sync with the music." />
      </Sequence>

      <Sequence from={learn_demo_start} durationInFrames={learn_demo_dur} premountFor={fps}>
        <DemoClip videoSrc="leant_dance.mp4" label="Learnt Dance" labelColor={GREEN} durationInFrames={learn_demo_dur} />
      </Sequence>

      <Sequence from={mine_exp_start} durationInFrames={mine_exp_dur} premountFor={fps}>
        <ExplainerScene nodes={MINING_NODES} sectionLabel="Learnt Mode — Moves" sectionColor={PURPLE}
          description="Dictionary learning finds recurring patterns in choreographies. A human reviews animated previews and picks the real dance moves. Selected atoms are fused onto the freestyle skeleton using angle decomposition." />
      </Sequence>

      <Sequence from={mine_demo_start} durationInFrames={mine_demo_dur} premountFor={fps}>
        <DemoClip videoSrc="learnt_move.mp4" label="Learnt Move" labelColor={PURPLE} durationInFrames={mine_demo_dur} />
      </Sequence>

      <Sequence from={fuse_exp_start} durationInFrames={fuse_exp_dur} premountFor={fps}>
        <FusionReveal />
      </Sequence>

      <Sequence from={fuse_demo_start} durationInFrames={fuse_demo_dur} premountFor={fps}>
        <DemoClip videoSrc="fusion.mp4" label="Fusion" labelColor={PURPLE} durationInFrames={fuse_demo_dur} />
      </Sequence>

      <Sequence from={outro_start} durationInFrames={T(6)} premountFor={fps}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
