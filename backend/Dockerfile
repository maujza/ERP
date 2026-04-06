FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

FROM deps AS builder

WORKDIR /app

COPY . .

ENV NODE_ENV=production \
    CI=1 \
    PORT=9000 \
    DATABASE_URL=postgres://medusa:medusa@db:5432/medusa?sslmode=disable \
    STORE_CORS=http://localhost:7358,http://127.0.0.1:7358,http://localhost:8081,http://127.0.0.1:8081,http://localhost:9000,http://127.0.0.1:9000,http://pione:7358,http://pione:8081,http://pione:9000 \
    ADMIN_CORS=http://localhost:8081,http://127.0.0.1:8081,http://localhost:9000,http://127.0.0.1:9000,http://pione:8081,http://pione:9000 \
    AUTH_CORS=http://localhost:7358,http://127.0.0.1:7358,http://localhost:8081,http://127.0.0.1:8081,http://localhost:9000,http://127.0.0.1:9000,http://pione:7358,http://pione:8081,http://pione:9000 \
    JWT_SECRET=build-time-jwt-secret \
    COOKIE_SECRET=build-time-cookie-secret \
    MEDUSA_FORCE_INSECURE_COOKIES=true \
    MEDUSA_ADMIN_EMAIL=admin@aurelia.com \
    MEDUSA_ADMIN_PASSWORD=build-time-password \
    MEDUSA_ADMIN_URL=http://localhost:9000 \
    SENDGRID_API_KEY= \
    SENDGRID_FROM=no-reply@aurelia.com

RUN node ./scripts/patch-dashboard-i18n.mjs \
  && npm run build \
  && mkdir -p /app/public \
  && rm -rf /app/public/admin \
  && cp -R /app/.medusa/server/public/admin /app/public/admin

FROM node:20-bookworm-slim AS prod-deps

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /root/.npm /root/.npm
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps --prefer-offline --no-audit --progress=false

FROM node:20-bookworm-slim AS runner

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.medusa/server/medusa-config.js ./medusa-config.js
COPY --from=builder /app/.medusa/server/instrumentation.js ./instrumentation.js
COPY --from=builder /app/.medusa ./.medusa
COPY --from=builder /app/public ./public
COPY --from=builder /app/.medusa/server/src ./src

EXPOSE 9000

CMD ["npm", "run", "start"]
