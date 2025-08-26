# Qikiworld server (free-mode) — minimal Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY server/package.json server/package-lock.json* ./
RUN npm ci || (echo "No lockfile, fallback to install" && npm install)

# Prisma needs schema at generate time
COPY server/prisma ./prisma
RUN npx prisma generate || true

# Copy source and build
COPY server/ ./
RUN npm run build || (echo "Build failed — ensure tsconfig and sources are valid" && exit 1)

EXPOSE 4000
ENV NODE_ENV=production
ENV FREE_MODE=true
ENV DISABLE_REDIS=true
ENV DISABLE_OPENSEARCH=true
ENV UPLOAD_DIR=/app/var/uploads

CMD ["node", "dist/index.js"]
