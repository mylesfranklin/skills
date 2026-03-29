---
name: remotion-rendering
description: "Rendering workflows, Lambda deployment, and production pipelines for Remotion. Use when the user mentions 'render', 'deploy', 'lambda', 'export', 'build', 'bundle', 'production', 'CI/CD', or asks about rendering Remotion videos."
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Glob
---

# Remotion Rendering & Deployment

## Rendering Options

| Method | Best For | Speed | Cost |
|--------|----------|-------|------|
| Local (`npm run dev`) | Development | Instant | Free |
| Local Render | Short videos | Medium | Free |
| Lambda | Production, scale | Fast | Pay per render |

## Local Development

```bash
# Start preview server (hot reload)
npm run dev

# Preview at http://localhost:3000
```

## Local Rendering

```bash
# Basic render
npx remotion render src/index.tsx MyVideo out/video.mp4

# With custom props
npx remotion render src/index.tsx MyVideo out/video.mp4 \
  --props='{"titleText":"Custom Title"}'

# With specific codec
npx remotion render src/index.tsx MyVideo out/video.mp4 \
  --codec=h264

# Image sequence (for post-processing)
npx remotion render src/index.tsx MyVideo frames/frame-%04d.png

# Still image (first frame)
npx remotion still src/index.tsx MyVideo out/poster.png
```

### Render Options

| Option | Description |
|--------|-------------|
| `--codec=h264` | Best compatibility |
| `--codec=h265` | Better compression |
| `--codec=vp8/vp9` | Web optimized |
| `--codec=prores` | Professional editing |
| `--quality=100` | CRF quality (0-100) |
| `--concurrency=4` | Parallel frames |
| `--frame-range=0,60` | Render subset |
| `--log=verbose` | Debug output |

## Lambda Deployment

### Setup

```bash
# Install Lambda package
npm install @remotion/lambda

# Configure AWS credentials
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-east-1

# Deploy Lambda function
npx remotion lambda functions deploy

# Note the function name output
```

### Deploy Site

```bash
# Deploy your Remotion site to S3
npx remotion lambda sites create src/index.tsx --site-name=my-video-site

# Get the serve URL from output
```

### Render on Lambda

```bash
# Render via CLI
npx remotion lambda render \
  --function-name=remotion-render-4-0-441 \
  --serve-url=https://your-site.s3.amazonaws.com/index.html \
  --composition=MyVideo \
  --out-name=output.mp4
```

### Programmatic Lambda Rendering

```typescript
import {
  deploySite,
  renderMediaOnLambda,
  getFunctions,
  getRenderProgress
} from '@remotion/lambda';
import { AwsRegion } from '@remotion/lambda';

const region: AwsRegion = 'us-east-1';

// 1. Deploy site (do once per update)
async function deploy() {
  const { serveUrl, siteName } = await deploySite({
    entryPoint: './src/index.tsx',
    siteName: 'my-video-project',
    region
  });
  return serveUrl;
}

// 2. Get deployed function
async function getFunction() {
  const functions = await getFunctions({
    region,
    compatibleOnly: true
  });
  return functions[0].functionName;
}

// 3. Render video
async function render(serveUrl: string, functionName: string) {
  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: 'MyVideo',
    inputProps: {
      titleText: 'Hello from Lambda',
      titleColor: '#ff0000'
    },
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 1
  });

  console.log(`Render started: ${renderId}`);
  return { renderId, bucketName };
}

// 4. Check progress
async function checkProgress(renderId: string, bucketName: string) {
  const progress = await getRenderProgress({
    renderId,
    bucketName,
    region
  });

  if (progress.finality) {
    console.log('Render complete:', progress.outputFile);
    return progress.outputFile;
  } else {
    console.log(`Progress: ${progress.overallProgress}%`);
    return null;
  }
}
```

### Lambda Configuration

```typescript
// remotion.config.ts
import { Config } from '@remotion/cli/config';

Config.setLambdaChunkSize(128);  // MB per chunk
Config.setLambdaConcurrencyPerFunction(200);
Config.setLambdaDiskSize(2048);   // MB
Config.setLambdaMemorySize(2048); // MB
Config.setLambdaTimeout(120);     // seconds
```

## Render Configurations

### remotion.config.ts

```typescript
import { Config } from '@remotion/cli/config';

// Override webpack config
Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    module: {
      ...config.module,
      rules: [
        ...(config.module?.rules ?? []),
        // Custom loaders
      ]
    }
  };
});

// Set video config defaults
Config.setVideoConfig({
  ffmpegOverride: (args) => {
    return [
      ...args,
      '-crf', '18',  // Quality
      '-preset', 'slow'  // Compression speed
    ];
  }
});

// Logging
Config.setLogLevel('verbose');

// Browser
Config.setChromiumOpenGlRenderer('angle');
Config.setChromiumHeadlessMode(true);
```

## Production Pipeline

### Batch Rendering

```typescript
// render-batch.ts
import { renderMediaOnLambda } from '@remotion/lambda';

const videos = [
  { id: 'video-1', props: { title: 'Video 1' } },
  { id: 'video-2', props: { title: 'Video 2' } },
  { id: 'video-3', props: { title: 'Video 3' } },
];

async function renderBatch() {
  const renders = videos.map(video =>
    renderMediaOnLambda({
      region: 'us-east-1',
      functionName: 'remotion-render-4-0-441',
      serveUrl: 'https://your-site.s3.amazonaws.com/index.html',
      composition: 'MyVideo',
      inputProps: video.props,
      outName: `${video.id}.mp4`
    })
  );

  const results = await Promise.all(renders);
  console.log('All renders started:', results);
}
```

### Webhook Notifications

```typescript
const { renderId } = await renderMediaOnLambda({
  region: 'us-east-1',
  functionName: 'remotion-render-4-0-441',
  serveUrl: 'https://your-site.s3.amazonaws.com/index.html',
  composition: 'MyVideo',
  webhook: {
    url: 'https://your-api.com/webhook',
    secret: 'your-webhook-secret'
  }
});
```

## Performance Optimization

### For Faster Renders

1. **Reduce resolution** - 1080p vs 4K is 4x faster
2. **Lower frame rate** - 30fps vs 60fps is 2x faster
3. **Optimize assets** - Compress images, use appropriate video codecs
4. **Simplify animations** - Fewer elements, less complex effects
5. **Use `delayRender` sparingly** - Each delay adds to render time

### Lambda Cost Optimization

```typescript
// Use smaller chunks for shorter videos
Config.setLambdaChunkSize(64);

// Reduce memory for simple videos
Config.setLambdaMemorySize(1024);

// Shorter timeout for quick renders
Config.setLambdaTimeout(60);
```

## Error Handling

```typescript
import { renderMediaOnLambda, RenderMediaOnLambdaInput } from '@remotion/lambda';

async function safeRender(params: RenderMediaOnLambdaInput) {
  try {
    const result = await renderMediaOnLambda(params);
    return { success: true, result };
  } catch (error) {
    if (error.message.includes('TooManyRequestsException')) {
      // Retry with backoff
      await delay(5000);
      return safeRender(params);
    }
    return { success: false, error };
  }
}
```

## Environment Variables

```bash
# Required for Lambda
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# Optional
REMOTION_AWS_ACCESS_KEY_ID=      # Separate Remotion credentials
REMOTION_AWS_SECRET_ACCESS_KEY=
REMOTION_AWS_REGION=

# For local
REMOTION_CHROMIUM_HEADLESS=true
REMOTION_LOG_LEVEL=verbose
```

## CI/CD Integration

```yaml
# .github/workflows/render.yml
name: Render Video

on:
  push:
    branches: [main]

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET }}
          aws-region: us-east-1

      - name: Deploy site
        run: npx remotion lambda sites create src/index.tsx --site-name=prod

      - name: Render video
        run: npx remotion lambda render --function-name=remotion-render-4-0-441 --serve-url=${{ steps.deploy.outputs.serveUrl }} --composition=MyVideo
```

## Best Practices

1. **Test locally first** - Use `npm run dev` before Lambda
2. **Version your sites** - Include version in site name
3. **Monitor costs** - Set up AWS billing alerts
4. **Use input props** - Parametrize instead of hardcoding
5. **Cache assets** - Use S3/CloudFront for media
6. **Handle errors gracefully** - Implement retries
7. **Log everything** - Use verbose mode for debugging
