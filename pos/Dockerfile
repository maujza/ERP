FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends git python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g @expo/ngrok@^4.1.0

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 \
    EXPO_NO_TELEMETRY=1 \
    NODE_ENV=development

EXPOSE 8081 19000 19001 19002

CMD ["sh","-c","npm run start -- --tunnel --port 8081"]
