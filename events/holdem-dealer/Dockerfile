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

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/v1/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

# node is PID 1 and handles SIGTERM itself (graceful: sockets close with 1012, data files flushed)
STOPSIGNAL SIGTERM
CMD ["node", "src/server.js"]
