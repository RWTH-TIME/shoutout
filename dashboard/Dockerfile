FROM node:22.17.1-alpine AS installer

WORKDIR /app

COPY package.json ./

RUN npm install


FROM node:22.17.1-alpine AS builder

WORKDIR /app

COPY . .

COPY --from=installer /app/node_modules ./node_modules

RUN npx prisma generate && npm run build


FROM node:22.17.1-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://admin:admin@postgres:5432/postgres?schema=public

ENV PORT=80

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 80

CMD ["sh", "-c", "npx prisma migrate deploy && npm start -- -p $PORT"]

