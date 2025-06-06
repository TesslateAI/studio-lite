# ----------- Stage 1: Build -----------
FROM node:20.19.2-bullseye-slim AS build
# TODO: Replace with exact SHA256 digest for deterministic builds
# e.g. FROM node:20.19.2-bullseye-slim@sha256:<digest> AS build

WORKDIR /usr/src/app

# Copy only package files first for better caching
COPY package.json pnpm-lock.yaml* .

# Install dependencies (including dev for build)
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Type check and build (fail on type errors)
RUN pnpm build

# ----------- Stage 2: Production -----------
FROM node:20.19.2-bullseye-slim AS runner
# TODO: Replace with exact SHA256 digest for deterministic builds
# e.g. FROM node:20.19.2-bullseye-slim@sha256:<digest> AS runner

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy only production node_modules and built output from build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/.next ./.next
COPY --from=build /usr/src/app/public ./public
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/next.config.js ./next.config.js
COPY --from=build /usr/src/app/.env* ./

# Drop privileges: run as non-root user
USER node

# Harden container: drop all capabilities, no new privileges, read-only root, tmpfs for /tmp
# (Set these at runtime: see README for recommended docker run flags)

ENTRYPOINT ["dumb-init", "node"]
CMD [".next/standalone/server.js"] 