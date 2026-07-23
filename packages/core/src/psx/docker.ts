/**
 * #297 — PSX Docker Optimization.
 *
 * Multi-stage Docker build for PledgeStack with Rust native addons.
 * Produces minimal final image with only .node addons + JS, targeting <15MB.
 *
 * Stages:
 * 1. rust-builder — Compiles Rust addons with cargo, LTO, strip
 * 2. js-builder  — Installs Node deps, builds JS with PledgePack
 * 3. runtime     — Minimal Node.js image with only .node + JS bundles
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerBuildConfig {
  /** Node.js version for runtime (default: 22-slim) */
  nodeVersion?: string;
  /** Rust toolchain version (default: stable) */
  rustVersion?: string;
  /** Base image for runtime (default: node:22-slim) */
  baseImage?: string;
  /** Whether to use Alpine (smaller, but musl libc) */
  useAlpine?: boolean;
  /** Target platform (default: linux/amd64) */
  platform?: string;
  /** Additional cargo features to enable */
  cargoFeatures?: string[];
  /** Whether to strip debug symbols (default: true) */
  strip?: boolean;
  /** Whether to enable LTO (default: true) */
  lto?: boolean;
  /** App entry point (default: dist/server/index.js) */
  entryPoint?: string;
  /** Exposed port (default: 3000) */
  port?: number;
  /** Health check path (default: /api/health) */
  healthCheckPath?: string;
}

// ---------------------------------------------------------------------------
// Dockerfile generation
// ---------------------------------------------------------------------------

/**
 * Generates an optimized multi-stage Dockerfile for PledgeStack with Rust addons.
 */
export function generateDockerfile(config: DockerBuildConfig = {}): string {
  const nodeVersion = config.nodeVersion ?? '22';
  const rustVersion = config.rustVersion ?? 'stable';
  const baseImage = config.baseImage ?? (config.useAlpine ? `node:${nodeVersion}-alpine` : `node:${nodeVersion}-slim`);
  const platform = config.platform ?? 'linux/amd64';
  const features = config.cargoFeatures?.length ? `--features ${config.cargoFeatures.join(',')}` : '';
  const entryPoint = config.entryPoint ?? 'dist/server/index.js';
  const port = config.port ?? 3000;
  const healthCheckPath = config.healthCheckPath ?? '/api/health';
  const builderImage = config.useAlpine ? `node:${nodeVersion}-alpine` : `node:${nodeVersion}-slim`;

  return `# syntax=docker/dockerfile:1.6
# PledgeStack optimized Docker build with Rust native addons
# Multi-stage: rust-builder → js-builder → runtime (<15MB target)

# =============================================================================
# Stage 1: Rust Builder — Compile native addons with LTO and strip
# =============================================================================
FROM --platform=${platform} ${builderImage} AS rust-builder

${config.useAlpine ? `RUN apk add --no-cache curl ca-certificates build-base pkgconfig openssl-dev` : `RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates build-essential pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*`}

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${rustVersion}
ENV PATH="/root/.cargo/bin:$PATH"
ENV CARGO_TARGET_DIR=/cargo-target

# Cache cargo registry
WORKDIR /build
COPY packages/core/native/Cargo.toml packages/core/native/Cargo.lock* ./
${config.useAlpine ? `RUN echo '[target.x86_64-unknown-linux-musl]' >> /root/.cargo/config.toml && echo 'linker = "cc"' >> /root/.cargo/config.toml` : ''}

# Pre-build dependencies (cached layer)
RUN cargo build --release ${features} || true

# Copy source and build
COPY packages/core/native/ ./
RUN cargo build --release ${features}

# Strip debug symbols
${config.strip !== false ? `RUN strip target/release/*.so 2>/dev/null || true` : ''}

# =============================================================================
# Stage 2: JS Builder — Install deps and build JS bundles
# =============================================================================
FROM --platform=${platform} ${builderImage} AS js-builder

${config.useAlpine ? `RUN apk add --no-cache libc6-compat` : ''}

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy lockfile and package.json first for cache
COPY pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY pledge.config.ts ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY . .

# Build the project
RUN pnpm -r build

# Copy Rust addons from rust-builder
COPY --from=rust-builder /build/target/release/*.so ./packages/core/native/ 2>/dev/null || true
COPY --from=rust-builder /cargo-target/release/*.so ./packages/core/native/ 2>/dev/null || true

# Prune dev dependencies
RUN pnpm prune --prod

# =============================================================================
# Stage 3: Runtime — Minimal image with only production artifacts
# =============================================================================
FROM --platform=${platform} ${baseImage} AS runtime

${config.useAlpine ? `RUN apk add --no-cache libc6-compat openssl` : `RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*`}

WORKDIR /app

# Create non-root user
RUN groupadd -r pledgestack && useradd -r -g pledgestack pledgestack \\
    ${config.useAlpine ? '' : '&& mkdir -p /app && chown -R pledgestack:pledgestack /app'}

# Copy only production artifacts
COPY --from=js-builder --chown=pledgestack:pledgestack /app/dist ./dist
COPY --from=js-builder --chown=pledgestack:pledgestack /app/node_modules ./node_modules
COPY --from=js-builder --chown=pledgestack:pledgestack /app/package.json ./package.json
COPY --from=js-builder --chown=pledgestack:pledgestack /app/packages/core/native/*.so ./packages/core/native/ 2>/dev/null || true
COPY --from=js-builder --chown=pledgestack:pledgestack /app/packages/core/native/*.node ./packages/core/native/ 2>/dev/null || true
COPY --from=js-builder --chown=pledgestack:pledgestack /app/pledge.config.ts ./
COPY --from=js-builder --chown=pledgestack:pledgestack /app/public ./public

USER pledgestack

EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD node -e "fetch('http://localhost:${port}${healthCheckPath}').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

CMD ["node", "${entryPoint}"]
`;
}

// ---------------------------------------------------------------------------
// .dockerignore generation
// ---------------------------------------------------------------------------

/**
 * Generates a .dockerignore file optimized for PledgeStack.
 */
export function generateDockerignore(): string {
  return `# Version control
.git
.gitignore

# Dependencies (will be installed in builder)
node_modules
**/node_modules

# Build artifacts
.pledge
.pledge-cache
dist
**/dist
target
**/target

# Rust build cache
cargo-target
.cargo

# Development files
*.md
docs/
examples/
playground/
storybook/
.vscode/
.idea/

# Test files
**/*.test.ts
**/*.test.tsx
**/*.spec.ts
**/*.spec.tsx
**/__tests__/
coverage/
**/coverage/

# Environment files (secrets should not be in image)
.env
.env.*
!.env.production

# Misc
*.log
.DS_Store
Thumbs.db
README.md
CHANGELOG.md
LICENSE
`;
}

// ---------------------------------------------------------------------------
// Docker Compose generation
// ---------------------------------------------------------------------------

/**
 * Generates a docker-compose.yml for development with hot reload.
 */
export function generateDockerCompose(config: DockerBuildConfig = {}): string {
  const port = config.port ?? 3000;

  return `version: '3.9'

services:
  pledgestack:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    ports:
      - "\${PORT:-${port}}:${port}"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - REDIS_URL=\${REDIS_URL:-redis://redis:6379}
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:${port}/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped

volumes:
  redis-data:
`;
}

// ---------------------------------------------------------------------------
// File writing helpers
// ---------------------------------------------------------------------------

/**
 * Writes Dockerfile, .dockerignore, and docker-compose.yml to a project.
 */
export function writeDockerFiles(
  projectRoot: string,
  config: DockerBuildConfig = {},
): { dockerfile: string; dockerignore: string; dockerCompose: string } {
  const dockerfile = generateDockerfile(config);
  const dockerignore = generateDockerignore();
  const dockerCompose = generateDockerCompose(config);

  writeFileSync(join(projectRoot, 'Dockerfile'), dockerfile, 'utf-8');
  writeFileSync(join(projectRoot, '.dockerignore'), dockerignore, 'utf-8');
  writeFileSync(join(projectRoot, 'docker-compose.yml'), dockerCompose, 'utf-8');

  return { dockerfile, dockerignore, dockerCompose };
}

/**
 * Estimates the final Docker image size based on config.
 */
export function estimateImageSize(config: DockerBuildConfig = {}): { sizeMB: number; breakdown: Record<string, number> } {
  const useAlpine = config.useAlpine ?? false;
  const breakdown: Record<string, number> = {};

  // Base image
  breakdown['base-image'] = useAlpine ? 50 : 120;

  // Node.js runtime
  breakdown['node-runtime'] = 15;

  // JS bundles (typical PledgeStack app)
  breakdown['js-bundles'] = 5;

  // node_modules (production only)
  breakdown['node_modules'] = 8;

  // Rust addons (.node files, stripped)
  breakdown['rust-addons'] = 3;

  // OpenSSL
  breakdown['openssl'] = useAlpine ? 2 : 5;

  // Misc (public assets, config)
  breakdown['misc'] = 1;

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return { sizeMB: total, breakdown };
}
