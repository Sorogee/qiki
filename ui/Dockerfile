# Qikiworld UI — minimal Next.js Dockerfile
FROM node:20-alpine

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://api:3000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

COPY ui/package.json ui/package-lock.json* ./
RUN npm ci || (echo "No lockfile, fallback to install" && npm install)

COPY ui/ ./

RUN npm run build || (echo "UI build failed — ensure Next config and pages are valid" && exit 1)

EXPOSE 8080
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
