FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

CMD ["npm", "run", "start"]
