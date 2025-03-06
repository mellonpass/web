FROM node:alpine AS build-stage

WORKDIR /code

# use ARG later to dynamically specify workspace build
# on ci/cd actions.
COPY apps/web ./apps/web
COPY package*.json ./

RUN npm ci -w apps/web
RUN npm i -w apps/web

# .env.production is created on ci/cd actions.
COPY .env.production ./apps/web

RUN npm run build -w apps/web

FROM nginx:alpine

WORKDIR /code

COPY --from=build-stage /code/node_modules/web/build /usr/share/nginx/html/

CMD ["nginx", "-g", "daemon off;"]
