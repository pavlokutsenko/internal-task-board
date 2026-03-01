FROM node:22-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG BUILD_DATABASE_URL="postgresql://taskboard:taskboard@localhost:5432/taskboard?schema=public"
ENV DATABASE_URL=${BUILD_DATABASE_URL}

RUN pnpm prisma generate
RUN pnpm build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma migrate deploy && if [ \"${RUN_DB_SEED:-false}\" = \"true\" ]; then pnpm db:seed; fi && pnpm start"]
