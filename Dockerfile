# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci

COPY frontend ./frontend
RUN npm run build --workspace frontend


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    FORENINGSADMIN_STATE_DIR=/var/lib/foreningsadmin

WORKDIR /app

# Install only the backend runtime dependencies. The React/Vite frontend is
# already compiled in the build stage and does not need npm packages at runtime.
WORKDIR /app/backend
COPY backend/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts \
    && npm cache clean --force

WORKDIR /app
COPY backend/src ./backend/src
COPY config ./config
COPY templates ./templates
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Existing application code uses these historic project-root paths. In the
# container they point into one persistent state volume. Keeping the entire
# state on one filesystem is also important for atomic backup/restore renames.
RUN mkdir -p /var/lib/foreningsadmin/data \
             /var/lib/foreningsadmin/tokens \
             /var/lib/foreningsadmin/backups \
             /var/lib/foreningsadmin/.tmp \
             /var/lib/foreningsadmin/config \
    && ln -s /var/lib/foreningsadmin/data /app/data \
    && ln -s /var/lib/foreningsadmin/tokens /app/tokens \
    && ln -s /var/lib/foreningsadmin/backups /app/backups \
    && ln -s /var/lib/foreningsadmin/.tmp /app/.tmp \
    && ln -s /var/lib/foreningsadmin/config/board.json /app/config/board.json \
    && chown -R node:node /var/lib/foreningsadmin

VOLUME ["/var/lib/foreningsadmin"]

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "backend/src/server.mjs"]
