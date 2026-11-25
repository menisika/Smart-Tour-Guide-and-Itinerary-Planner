# syntax=docker/dockerfile:1

# One image for everything that runs on the server (ADR-0002, ADR-0003):
# the API with the public web inside it, the worker, the batch jobs and the
# migrations are entry points of this image.
#
#   docker run <image>                 # the API (default)
#   docker run <image> worker
#   docker run <image> job <name>
#   docker run <image> migrate
#
# Debian, not Alpine: the entailment model of ADR-0013 runs under ONNX Runtime,
# whose Node.js binding is built against glibc.

ARG NODE_VERSION=26.13.1
ARG PNPM_VERSION=12.15.0

# ── build ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-trixie-slim AS build
ARG PNPM_VERSION

# HUSKY=0: the image build has no git repository to put hooks into.
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    EXPO_NO_TELEMETRY=1 \
    HUSKY=0

RUN npm install --global pnpm@${PNPM_VERSION}

WORKDIR /repo

# Download dependencies from the lockfile alone, so that this layer is reused
# until the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch

COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline

# Shared packages and the API → `dist`.
RUN pnpm build

# The public web: client files and the server build that renders pages.
RUN pnpm --filter @promenade/mobile export:web

# The API with its production dependencies only, workspace packages included.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @promenade/api deploy --prod /out/api

# ── run ──────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-trixie-slim AS runtime

ENV NODE_ENV=production \
    PORT=8080 \
    PUBLIC_WEB_DIR=/app/public-web \
    RECORDINGS_DIR=/app/recordings

WORKDIR /app

COPY --from=build --chown=node:node /out/api ./
COPY --from=build --chown=node:node /repo/apps/mobile/dist ./public-web

USER node
EXPOSE 8080

ENTRYPOINT ["node", "dist/entrypoint.js"]
CMD ["api"]
