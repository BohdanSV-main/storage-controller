FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN HUSKY=0 npm ci

COPY prisma ./prisma
COPY prisma7.config.ts tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts/write-version.js ./scripts/write-version.js

RUN DATABASE_URL=postgresql://build:build@localhost/build \
    ./node_modules/.bin/prisma generate --config prisma7.config.ts

ARG COMMIT_SHA
RUN test -n "$COMMIT_SHA" && COMMIT_SHA="$COMMIT_SHA" npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

USER node
EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --config prisma7.config.ts && exec node dist/index.js"]