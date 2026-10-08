# Picasso Lab games service (Hold'em dealer + accounts). Play money only.
# Build:  docker build -t picasso/holdem-dealer .      Run: see compose.yaml and README.md
FROM node:22-alpine

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DATA_DIR=/data

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY src ./src

# the data directory belongs to the unprivileged user; a new named volume inherits this owner and mode
RUN mkdir -p /data && chown node:node /data && chmod 700 /data
USER node
VOLUME ["/data"]
EXPOSE 8787

# unhealthy when the service does not answer, or answers that its changes are not being written (src/health.js)
HEALTHCHECK --interval=30s --timeout=12s --start-period=20s --retries=3 \
  CMD node src/health.js

# node is PID 1 and handles SIGTERM itself (graceful: sockets close with 1012, data files flushed)
STOPSIGNAL SIGTERM
CMD ["node", "src/server.js"]
