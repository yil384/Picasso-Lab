# The Muse trader (MCP endpoint, trading floor, public order log) for trade.picasso-lab.com. Build context: agent/.
# No secret goes into the image: the keys come from deploy/.env at run time. The label lets push.sh prune our own
# dangling images and nobody else's.
FROM node:22-bookworm-slim
LABEL org.picasso-lab.app="muse-trader"
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY data ./data
COPY assets ./assets
ENV NODE_ENV=production WEB_HOST=0.0.0.0 PORT=8790 DATA_DIR=/data
EXPOSE 8790
HEALTHCHECK --interval=60s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8790/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "src/index.js"]
