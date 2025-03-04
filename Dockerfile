FROM node:22-alpine AS build-stage

WORKDIR /code

COPY apps/web ./apps/web
COPY package*.json ./

RUN npm ci -w apps/web
RUN npm i -w apps/web

# .env.production is created on ci/cd actions.
COPY .env.production ./apps/web

RUN npm run build -w apps/web

FROM scratch

WORKDIR /code

COPY --from=build-stage /code/node_modules/web/build .

CMD ["bash"]