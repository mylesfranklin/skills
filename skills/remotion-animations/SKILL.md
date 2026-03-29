---
name: remotion-animations
description: "Advanced animation patterns, transitions, and effects for Remotion. Use when the user mentions 'animate', 'transition', 'spring', 'easing', 'effect', 'motion', 'interpolate', 'keyframe', or asks about Remotion animation techniques."
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
---

# Remotion Animation Patterns

## Spring Physics

Springs create natural, physics-based motion.

### Spring Configurations

```typescript
import { spring } from 'remotion';

// Smooth, no bounce (subtle reveals)
const smooth = spring({
  fps,
  frame,
  config: { damping: 200 }
});

// Snappy, minimal bounce (UI elements)
const snappy = spring({
  fps,
  frame,
  config: { damping: 20, stiffness: 200 }
});

// Bouncy entrance (playful animations)
const bouncy = spring({
  fps,
  frame,
  config: { damping: 8 }
});

// Heavy, slow, small bounce
const heavy = spring({
  fps,
  frame,
  config: { damping: 15, stiffness: 80, mass: 2 }
});
```

### Spring with Delay

```tsx
const delayedSpring = spring({
  fps,
  frame: frame - 30,  // Start 30 frames later
  config: { damping: 200 }
});
```

### Spring with Duration

```tsx
const timedSpring = spring({
  fps,
  frame,
  durationInFrames: 60,  // Stretch to exactly 60 frames
  config: { damping: 200 }
});
```

## Easing Functions

```typescript
import { Easing } from 'remotion';

// Basic easing
Easing.linear
Easing.ease
Easing.quad
Easing.cubic
Easing.quart
Easing.quint
Easing.sin
Easing.expo
Easing.circ
Easing.back
Easing.elastic
Easing.bounce

// Combine with in/out/inOut
Easing.in(Easing.quad)      // Accelerate
Easing.out(Easing.quad)     // Decelerate
Easing.inOut(Easing.quad)   // Both

// Custom bezier
Easing.bezier(0.4, 0, 0.2, 1)  // Material design easing
```

## interpolate Patterns

### Basic Value Mapping

```tsx
const value = interpolate(frame, [0, 100], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp'
});
```

### Multi-Point Animation

```tsx
const value = interpolate(
  frame,
  [0, 30, 60, 90],      // Keyframe positions
  [0, 1, 1, 0],         // Values at each keyframe
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
);
```

### With Easing

```tsx
const value = interpolate(frame, [0, 60], [0, 1], {
  easing: Easing.inOut(Easing.cubic),
  extrapolateRight: 'clamp'
});
```

## Transition Series

```tsx
import { TransitionSeries } from '@remotion/transitions';
import {
  fade,
  wipe,
  flip,
  cube,
  slide
} from '@remotion/transitions';
import {
  linearTiming,
  springTiming
} from '@remotion/transitions';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <Scene1 />
  </TransitionSeries.Sequence>

  <TransitionSeries.Transition
    timing={springTiming({ config: { damping: 200 } })}
    presentation={fade()}
  />

  <TransitionSeries.Sequence durationInFrames={60}>
    <Scene2 />
  </TransitionSeries.Sequence>

  <TransitionSeries.Transition
    timing={linearTiming({ durationInFrames: 15 })}
    presentation={wipe({ direction: 'from-left' })}
  />

  <TransitionSeries.Sequence durationInFrames={60}>
    <Scene3 />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

### Available Transitions

| Transition | Options |
|------------|---------|
| `fade()` | None |
| `wipe()` | `direction: 'from-left' \| 'from-right' \| 'from-top' \| 'from-bottom'` |
| `flip()` | `direction: 'from-left' \| 'from-right'` |
| `cube()` | `direction: 'from-left' \| 'from-right'` |
| `slide()` | `direction: 'from-left' \| 'from-right'` |

## Animation Utils Package

```tsx
import {
  interpolateStyles,
  makeTransform,
  translateX,
  translateY,
  translateZ,
  rotate,
  rotateX,
  rotateY,
  rotateZ,
  scale
} from '@remotion/animation-utils';

// Animate multiple properties
const styles = interpolateStyles(
  frame,
  [0, 30, 60],
  [
    {
      opacity: 0,
      transform: makeTransform([translateY(-50), scale(0.8)])
    },
    {
      opacity: 1,
      transform: makeTransform([translateY(0), scale(1)])
    },
    {
      opacity: 0,
      transform: makeTransform([translateY(50), scale(0.8)])
    }
  ]
);

return <div style={styles}>Content</div>;
```

## Color Interpolation

```tsx
import { interpolateColors } from 'remotion';

const color = interpolateColors(
  frame,
  [0, 60],
  ['#ff0000', '#0000ff']
);

return <div style={{ backgroundColor: color }} />;
```

## Motion Blur Effect

```tsx
import { MotionBlur } from '@remotion/motion-blur';

<MotionBlur shutterAngle={180}>
  <MovingComponent />
</MotionBlur>
```

## Noise and Textures

```tsx
import { noise } from '@remotion/noise';

// Perlin noise
const n = noise(frame * 0.01);

// For visual effects
<div style={{
  transform: `translateY(${n * 20}px)`
}} />
```

## Path Animations

```tsx
import { interpolatePath } from '@remotion/paths';

const path = interpolatePath(
  frame,
  [0, 60],
  [
    'M 0 0 L 100 0 L 100 100 L 0 100 Z',
    'M 50 0 L 100 50 L 50 100 L 0 50 Z'
  ]
);

<svg>
  <path d={path} fill="red" />
</svg>
```

## Lottie Integration

```tsx
import { Lottie } from '@remotion/lottie';
import animationData from './animation.json';

<Lottie
  animationData={animationData}
  playbackRate={1}
/>
```

## Three.js (React Three Fiber)

```tsx
import { ThreeCanvas } from '@remotion/three';

<ThreeCanvas
  width={1920}
  height={1080}
>
  <ambientLight intensity={0.5} />
  <pointLight position={[10, 10, 10]} />
  <mesh rotation={[0, frame * 0.02, 0]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="hotpink" />
  </mesh>
</ThreeCanvas>
```

## Text Effects

### Character-by-Character Animation

```tsx
const text = "Hello World";
const chars = text.split('');

return (
  <div>
    {chars.map((char, i) => {
      const charFrame = frame - i * 2;
      const opacity = interpolate(charFrame, [0, 10], [0, 1], {
        extrapolateRight: 'clamp'
      });
      return (
        <span key={i} style={{ opacity }}>
          {char}
        </span>
      );
    })}
  </div>
);
```

### Typewriter Effect

```tsx
const text = "Hello World";
const charsToShow = Math.floor(interpolate(frame, [0, 60], [0, text.length]));
const visibleText = text.slice(0, charsToShow);

return <div>{visibleText}</div>;
```

## Audio Visualization

```tsx
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const audioData = useAudioData(staticFile('audio.mp3'));

if (!audioData) {
  return null;
}

const visualization = visualizeAudio({
  fps,
  frame,
  audioData,
  numberOfSamples: 10
});

return (
  <div style={{ display: 'flex', gap: 4 }}>
    {visualization.map((v, i) => (
      <div
        key={i}
        style={{
          height: `${v * 200}px`,
          width: '20px',
          backgroundColor: 'blue'
        }}
      />
    ))}
  </div>
);
```

## Scroll/Parallax Effects

```tsx
// Parallax layers
const layer1Offset = interpolate(frame, [0, 300], [0, -100]);
const layer2Offset = interpolate(frame, [0, 300], [0, -200]);
const layer3Offset = interpolate(frame, [0, 300], [0, -400]);

return (
  <AbsoluteFill>
    <div style={{ transform: `translateY(${layer1Offset}px)` }}>
      <Background />
    </div>
    <div style={{ transform: `translateY(${layer2Offset}px)` }}>
      <Midground />
    </div>
    <div style={{ transform: `translateY(${layer3Offset}px)` }}>
      <Foreground />
    </div>
  </AbsoluteFill>
);
```

## Best Practices

1. **Use spring for UI elements** - Feels more natural than linear
2. **Clamp interpolate outputs** - Prevents values from running away
3. **Combine multiple simple animations** - Rather than one complex one
4. **Test at different speeds** - Use Studio playback controls
5. **Consider performance** - Expensive effects on Lambda cost more
6. **Use pre-composed assets** - Lottie, videos for complex animations
