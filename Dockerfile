FROM node:alpine AS build-stage

WORKDIR /code

# use ARG later to dynamically specify workspace build
# on ci/cd actions.
COPY ./web ./web
COPY package*.json ./

RUN npm ci -w ./web
RUN npm i -w ./web

# .env.production is created on ci/cd actions.
COPY .env.production ./web

RUN npm run build -w ./web

FROM nginx:alpine

WORKDIR /code

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /code/node_modules/web/build /usr/share/nginx/html/

CMD ["nginx", "-g", "daemon off;"]
