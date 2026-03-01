FROM node:22-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm prisma generate
RUN pnpm build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm db:seed && pnpm start"]
