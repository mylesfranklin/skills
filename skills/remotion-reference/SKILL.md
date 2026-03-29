---
name: remotion-reference
description: "Analyze YouTube videos as reference for creating Remotion short-form content. Use when the user provides a YouTube URL, mentions 'reference video', 'short form', 'clip factory', 'reels', 'tiktok', 'shorts', or wants to create short clips from a video source."
argument-hint: "[youtube-url]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Remotion Reference — YouTube to Short-Form Factory

You analyze YouTube videos and produce structured briefs for generating short-form Remotion clips (Instagram Reels, TikTok, YouTube Shorts).

## Workflow

### Step 1: Extract

Run the extraction script on the provided YouTube URL:

```bash
bash ~/.claude/scripts/yt-extract.sh "$ARGUMENTS" /tmp/yt-ref
```

This produces:
- `metadata.json` — title, duration, resolution, fps, tags, description
- `source.mp4` — downloaded video (capped at 1080p)
- `keyframes/` — PNG frames at each scene change
- `scenes.txt` — timestamps of detected scene transitions

### Step 2: Analyze

Read the extracted data to build an understanding of the source video:

1. **Read `metadata.json`** — understand the video's topic, duration, resolution, fps
2. **Read `scenes.txt`** — map the scene structure and pacing
3. **View keyframes** — use the Read tool on keyframe PNGs to analyze:
   - Color palette (dominant colors per scene)
   - Typography style (if text overlays exist)
   - Composition and framing patterns
   - Motion style (static, dynamic, talking head, B-roll, etc.)
   - Branding elements (logos, lower thirds, watermarks)

4. **Calculate pacing metrics:**
   - Average scene duration (total duration / scene count)
   - Scene change frequency (fast-paced vs slow)
   - Identify "hook" moments (first 3 seconds)
   - Identify climax/highlight moments

### Step 3: Produce a Short-Form Brief

Output a structured brief for each proposed clip:

```markdown
## Reference Analysis: [Video Title]

### Source Overview
- **URL**: [url]
- **Duration**: [X:XX]
- **Resolution**: [WxH] @ [fps]fps
- **Scene Count**: [N] scenes
- **Avg Scene Duration**: [X.X]s
- **Pacing**: [fast/medium/slow]
- **Style**: [talking head / motion graphics / B-roll montage / screencast / etc.]

### Color Palette
- Primary: [hex] — used for [backgrounds/text/accents]
- Secondary: [hex]
- Accent: [hex]
- Text: [hex] on [hex] background

### Typography
- Headings: [style — bold sans-serif, etc.]
- Body: [style]
- Captions: [style — if present]

### Motion Style
- Transitions: [cuts/fades/wipes/zoom]
- Animation speed: [snappy/smooth/slow]
- Camera: [static/pan/zoom/handheld]
- Text animation: [pop-in/slide/typewriter/none]

---

### Proposed Clips

#### Clip 1: [Hook/Title]
- **Source timerange**: [MM:SS - MM:SS]
- **Target duration**: [15s / 30s / 60s]
- **Target platform**: [TikTok 9:16 / Reels 9:16 / Shorts 9:16]
- **Hook (0-3s)**: [what grabs attention]
- **Content (3-Xs)**: [core message]
- **CTA (last 3s)**: [call to action]
- **Remotion approach**:
  - Composition: [dimensions, fps, frames]
  - Key animations: [list]
  - Text overlays: [list]
  - Audio: [from source / music bed / voiceover]

#### Clip 2: [Hook/Title]
...
```

### Step 4: Generate Remotion Code

When the user approves a clip from the brief, generate production-ready Remotion code:

1. **Create the composition** with Zod schema for props (clip text, colors, timing)
2. **Use 9:16 aspect ratio** (1080x1920) for short-form by default
3. **Implement the motion style** identified in analysis using spring/interpolate
4. **Match the color palette** from the reference
5. **Include audio handling** if the clip uses source audio segments

#### Short-Form Dimensions

| Platform | Dimensions | Max Duration | FPS |
|----------|-----------|-------------|-----|
| TikTok | 1080x1920 | 60s (sweet spot: 15-30s) | 30 |
| Instagram Reels | 1080x1920 | 90s (sweet spot: 15-30s) | 30 |
| YouTube Shorts | 1080x1920 | 60s (sweet spot: 30-60s) | 30 |

#### Short-Form Component Template

```tsx
import { z } from 'zod';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  Sequence,
  Audio,
  interpolate,
  spring,
  Easing,
  staticFile,
} from 'remotion';

export const clipSchema = z.object({
  hookText: z.string(),
  bodyText: z.string(),
  ctaText: z.string(),
  brandColor: z.string().default('#0066ff'),
  backgroundColor: z.string().default('#000000'),
  textColor: z.string().default('#ffffff'),
  audioSrc: z.string().optional(),
});

type ClipProps = z.infer<typeof clipSchema>;

export const ShortClip: React.FC<ClipProps> = ({
  hookText,
  bodyText,
  ctaText,
  brandColor,
  backgroundColor,
  textColor,
  audioSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Hook section: first 3 seconds (90 frames at 30fps)
  const hookOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const hookScale = spring({ fps, frame, config: { damping: 12, stiffness: 200 } });

  // Body section: frames 90 to durationInFrames - 90
  const bodyStart = 90;
  const bodyFrame = frame - bodyStart;

  // CTA section: last 3 seconds
  const ctaStart = durationInFrames - 90;
  const ctaFrame = frame - ctaStart;
  const ctaScale = spring({
    fps,
    frame: ctaFrame,
    config: { damping: 10, stiffness: 200 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Hook */}
      <Sequence durationInFrames={90}>
        <AbsoluteFill style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 60px',
        }}>
          <div style={{
            opacity: hookOpacity,
            transform: `scale(${hookScale})`,
            color: textColor,
            fontSize: 72,
            fontWeight: 900,
            textAlign: 'center',
            lineHeight: 1.2,
          }}>
            {hookText}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Body */}
      <Sequence from={bodyStart} durationInFrames={durationInFrames - 180}>
        <AbsoluteFill style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 60px',
        }}>
          <div style={{
            opacity: interpolate(bodyFrame, [0, 15], [0, 1], {
              extrapolateRight: 'clamp',
            }),
            color: textColor,
            fontSize: 48,
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.4,
          }}>
            {bodyText}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* CTA */}
      <Sequence from={ctaStart}>
        <AbsoluteFill style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 60px',
        }}>
          <div style={{
            transform: `scale(${ctaScale})`,
            backgroundColor: brandColor,
            color: textColor,
            fontSize: 48,
            fontWeight: 800,
            padding: '24px 48px',
            borderRadius: 16,
            textAlign: 'center',
          }}>
            {ctaText}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Audio */}
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
    </AbsoluteFill>
  );
};
```

## Key Principles for Short-Form

1. **Hook in 0-3 seconds** — bold text, fast animation, high contrast
2. **One idea per clip** — don't cram multiple topics
3. **Text must be readable on mobile** — minimum 48px, high contrast
4. **Center-frame safe zone** — keep key content in middle 80% (platform UI overlays)
5. **Loop-friendly** — ending should flow back to beginning
6. **Vertical first** — 9:16, never letterboxed 16:9
7. **Captions always** — 85% of social video is watched muted
8. **Fast pacing** — scene changes every 2-4 seconds for engagement
9. **Brand consistency** — same colors, fonts, motion style across clips

## Batch Clip Factory

For producing multiple clips from one source:

```bash
# Extract once
bash ~/.claude/scripts/yt-extract.sh "https://youtube.com/watch?v=..." /tmp/yt-ref

# Then iterate: analyze → brief → approve → generate code → render
# Each clip gets its own Composition in Root.tsx with shared theme props
```

Register all clips in a single Root.tsx:

```tsx
<>
  <Composition id="clip-1-hook" component={Clip1} ... />
  <Composition id="clip-2-tips" component={Clip2} ... />
  <Composition id="clip-3-cta" component={Clip3} ... />
</>
```

Render all at once:

```bash
npx remotion render src/index.tsx clip-1-hook out/clip-1.mp4
npx remotion render src/index.tsx clip-2-tips out/clip-2.mp4
npx remotion render src/index.tsx clip-3-cta out/clip-3.mp4
```

Or batch via Lambda for speed.

## Audio Extraction

To pull audio segments from the source for clips:

```bash
# Extract audio segment (start at 10s, duration 15s)
ffmpeg -ss 10 -t 15 -i /tmp/yt-ref/source.mp4 -vn -acodec aac -q:a 2 public/clip-audio.m4a

# Extract full audio
ffmpeg -i /tmp/yt-ref/source.mp4 -vn -acodec aac -q:a 2 public/source-audio.m4a
```

## Video Segment Extraction

To pull video segments for use as backgrounds or B-roll:

```bash
# Extract video segment (start at 10s, duration 15s, crop to 9:16)
ffmpeg -ss 10 -t 15 -i /tmp/yt-ref/source.mp4 \
  -vf "crop=ih*9/16:ih,scale=1080:1920" \
  -c:v libx264 -crf 18 -preset fast \
  public/segment.mp4
```
