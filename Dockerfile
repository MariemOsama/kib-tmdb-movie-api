FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
  && find dist -maxdepth 4 -type f | sort \
  && (test -f dist/main.js || test -f dist/src/main.js)

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
COPY package.json ./

EXPOSE 8080
CMD ["sh", "-c", "if [ -f dist/main.js ]; then node dist/main.js; elif [ -f dist/src/main.js ]; then node dist/src/main.js; else echo 'Cannot find compiled main.js'; find dist -maxdepth 4 -type f | sort; exit 1; fi"]
