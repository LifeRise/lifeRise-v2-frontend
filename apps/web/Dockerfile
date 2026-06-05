# LifeRise — Next.js Production Dockerfile
# Place this file at apps/web/Dockerfile after the monorepo migration.
#
# Build-time env vars (NEXT_PUBLIC_*) are baked into the JS bundle;
# they must be supplied as --build-arg or via docker-compose.yml `args`.
#
# Usage (standalone):
#   docker build \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.liferise.com \
#     -t liferise/web:latest .
#   docker run -p 3000:3000 liferise/web:latest

# ── Deps stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Builder stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public env vars (baked into the JS bundle by Next.js)
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_VENDOR_API_URL=http://localhost:8081
ARG NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8082
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_VENDOR_API_URL=$NEXT_PUBLIC_VENDOR_API_URL
ENV NEXT_PUBLIC_ADMIN_API_URL=$NEXT_PUBLIC_ADMIN_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Runner stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copy only the standalone output produced by `output: 'standalone'` in next.config.ts
# NOTE: Add `output: 'standalone'` to next.config.ts before building.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
