---
name: remotion-core
description: "Core Remotion framework knowledge for programmatic video generation. Use when working with .tsx/.ts video components, creating Remotion compositions, or when the user mentions 'video', 'remotion', 'composition', 'useCurrentFrame', 'programmatic video', or 'react video'."
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
---

# Remotion Core Framework

## Fundamental Principles

Remotion creates videos using React components. Every frame is a pure function of time.

### The Golden Rules

1. **Deterministic Rendering**: Same input -> Same output, every time
2. **Frame-Based Animation**: Use `useCurrentFrame()` not `setTimeout`
3. **No Side Effects**: No `useEffect` with `setState` in render path
4. **Controlled Randomness**: Use `random(seed)` not `Math.random()`
5. **Pure Components**: Output depends only on props and frame number

## Essential Imports

```typescript
// Core hooks
import {
  useCurrentFrame,      // Returns current frame number (0-indexed)
  useVideoConfig,       // Returns {fps, durationInFrames, width, height, id}
  AbsoluteFill,         // Full-screen container component
  Composition,          // Video definition component
  Sequence,             // Time-shift wrapper
  Series,               // Sequential composition
  staticFile,           // Reference public/ folder
  interpolate,          // Map ranges
  spring,               // Physics animation
  random,               // Deterministic random
  Easing                // Easing functions
} from 'remotion';

// Media
import { Video, Audio, Img } from '@remotion/media';
```

## Component Template

```tsx
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  interpolate,
  spring,
  Easing
} from 'remotion';

// Define props interface
interface MyVideoProps {
  titleText: string;
  titleColor?: string;
  backgroundColor?: string;
}

// Component implementation
export const MyVideo: React.FC<MyVideoProps> = ({
  titleText,
  titleColor = '#000000',
  backgroundColor = '#ffffff'
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Animation: Fade in over first 30 frames
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp'
  });

  // Animation: Spring scale
  const scale = spring({
    fps,
    frame,
    config: {
      damping: 200,  // No bounce, smooth
      stiffness: 100,
      mass: 1
    }
  });

  // Animation: Slide in with easing
  const translateX = interpolate(frame, [0, 30], [-100, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad)
  });

  return (
    <AbsoluteFill style={{
      backgroundColor,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        opacity,
        transform: `translateX(${translateX}px) scale(${scale})`,
        color: titleColor,
        fontSize: Math.min(width, height) * 0.08,
        fontWeight: 'bold',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center'
      }}>
        {titleText}
      </div>
    </AbsoluteFill>
  );
};
```

## Root Component (Composition Registration)

```tsx
// Root.tsx
import React from 'react';
import { Composition } from 'remotion';
import { MyVideo } from './MyVideo';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="MyVideo"
        component={MyVideo}
        durationInFrames={120}     // 4 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: 'Hello World',
          titleColor: '#000000',
          backgroundColor: '#ffffff'
        }}
      />
    </>
  );
};
```

## Entry Point

```tsx
// index.tsx
import { registerRoot } from 'remotion';
import { Root } from './Root';

registerRoot(Root);
```

## Animation Patterns

### Fade In/Out

```tsx
const opacity = interpolate(
  frame,
  [0, 20, durationInFrames - 20, durationInFrames],
  [0, 1, 1, 0],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
);
```

### Slide From Direction

```tsx
// From left
const translateX = interpolate(frame, [0, 30], [-width, 0], {
  extrapolateRight: 'clamp',
  easing: Easing.out(Easing.cubic)
});

// From bottom
const translateY = interpolate(frame, [0, 30], [height, 0], {
  extrapolateRight: 'clamp',
  easing: Easing.out(Easing.cubic)
});
```

### Scale Animation

```tsx
const scale = interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: 'clamp',
  easing: Easing.elastic(1.2)  // Bouncy
});

// Or with spring
const scale = spring({ fps, frame, config: { damping: 200 } });
```

### Rotation

```tsx
const rotation = interpolate(frame, [0, 60], [0, 360], {
  extrapolateRight: 'clamp'
});

// Usage
<div style={{ transform: `rotate(${rotation}deg)` }} />
```

### Staggered Children

```tsx
const words = titleText.split(' ');

return (
  <div>
    {words.map((word, i) => {
      // Each word animates 5 frames after the previous
      const wordFrame = frame - i * 5;
      const opacity = interpolate(wordFrame, [0, 15], [0, 1], {
        extrapolateRight: 'clamp'
      });
      const translateY = interpolate(wordFrame, [0, 15], [30, 0], {
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.quad)
      });

      return (
        <span
          key={i}
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            display: 'inline-block',
            marginRight: '0.3em'
          }}
        >
          {word}
        </span>
      );
    })}
  </div>
);
```

## Sequence Component

Time-shift any component:

```tsx
import { Sequence } from 'remotion';

// Appears at frame 30, lasts 60 frames
<Sequence from={30} durationInFrames={60}>
  <MyComponent />
</Sequence>

// Negative from - starts immediately but cut off
<Sequence from={-10} durationInFrames={60}>
  {/* Starts 10 frames into the animation */}
</Sequence>
```

## Series Component

Chain components sequentially:

```tsx
import { Series } from 'remotion';

<Series>
  <Series.Sequence durationInFrames={30}>
    <Scene1 />
  </Series.Sequence>
  <Series.Sequence durationInFrames={45}>
    <Scene2 />
  </Series.Sequence>
  <Series.Sequence durationInFrames={30}>
    <Scene3 />
  </Series.Sequence>
</Series>
```

## Media Components

```tsx
import { Video, Audio, Img } from '@remotion/media';
import { staticFile } from 'remotion';

// Remote URL
<Video src="https://example.com/video.mp4" />

// Local file from public/ folder
<Video src={staticFile('my-video.mp4')} />

// With trimming
<Video
  src={staticFile('video.mp4')}
  startFrom={30}      // Start at frame 30 of source
  endAt={150}         // End at frame 150 of source
/>

// Audio with volume control
<Audio
  src={staticFile('music.mp3')}
  volume={0.5}
  startFrom={0}
  endAt={300}
/>

// Image
<Img src={staticFile('image.png')} style={{ width: '100%' }} />
```

## Dynamic Props with Zod Schemas

Use Zod schemas for type-safe props with visual editing support in Remotion Studio.

### Schema Definition

```tsx
import { z } from 'zod';

export const myVideoSchema = z.object({
  titleText: z.string().default('Hello World'),
  titleColor: z.string().default('#000000'),
  backgroundColor: z.string().default('#ffffff'),
  logoUrl: z.string().optional(),
  duration: z.number().min(1).max(60).default(10),
});

type MyVideoProps = z.infer<typeof myVideoSchema>;

export const MyVideo: React.FC<MyVideoProps> = ({ titleText, titleColor, backgroundColor }) => {
  const frame = useCurrentFrame();
  // ... component implementation
};
```

### calculateMetadata for Data-Driven Videos

Use `calculateMetadata` to fetch data and compute duration/props dynamically:

```tsx
import { Composition, CalculateMetadataFunction } from 'remotion';
import { myVideoSchema } from './MyVideo';

const calculateMetadata: CalculateMetadataFunction<z.infer<typeof myVideoSchema>> = async ({
  props,
  abortSignal,
}) => {
  // Fetch data to determine video parameters
  const data = await fetch(`https://api.example.com/video/${props.titleText}`, {
    signal: abortSignal,
  }).then((res) => res.json());

  return {
    durationInFrames: Math.ceil(data.duration * 30), // Dynamic duration
    fps: 30,
    props: {
      ...props,
      titleText: data.title,       // Override props with fetched data
      logoUrl: data.logoUrl,
    },
  };
};

// In Root.tsx
<Composition
  id="MyVideo"
  component={MyVideo}
  durationInFrames={300}           // Placeholder, overridden by calculateMetadata
  fps={30}
  width={1920}
  height={1080}
  schema={myVideoSchema}
  calculateMetadata={calculateMetadata}
  defaultProps={{
    titleText: 'Default Title',
    titleColor: '#000000',
    backgroundColor: '#ffffff',
    duration: 10,
  }}
/>
```

### Template Pattern with Schema

For reusable video templates driven by JSON/CSV data:

```tsx
export const templateSchema = z.object({
  slides: z.array(z.object({
    title: z.string(),
    body: z.string(),
    imageUrl: z.string().optional(),
    durationSeconds: z.number().default(3),
  })),
  brandColor: z.string().default('#0066ff'),
  musicUrl: z.string().optional(),
});

const calculateSlideshowMetadata: CalculateMetadataFunction<
  z.infer<typeof templateSchema>
> = async ({ props }) => {
  const totalFrames = props.slides.reduce(
    (sum, slide) => sum + slide.durationSeconds * 30,
    0
  );
  return { durationInFrames: totalFrames };
};
```

## Common Mistakes to Avoid

1. `Math.random()` -> Use `random('seed')` from remotion
2. `useEffect(() => setState(...))` -> Calculate directly from frame
3. `setTimeout` / `setInterval` -> Use frame-based timing
4. `Date.now()` -> Use frame number
5. Async data fetching in component -> Use `delayRender()` / `continueRender()`

## Best Practices

1. Use TypeScript for type safety
2. Extract reusable components
3. Use `AbsoluteFill` for full-screen layouts
4. Layer with multiple `AbsoluteFill` components
5. Test with `npm run dev` frequently
6. Use `spring` for natural motion
7. Use `interpolate` with `extrapolate: 'clamp'` to prevent overflow
8. Define props with Zod schemas for Studio editing support
9. Use `calculateMetadata` for data-driven duration and props
