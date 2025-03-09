FROM node:alpine AS build-stage

WORKDIR /code

# use ARG later to dynamically specify workspace build
# on ci/cd actions.
COPY package*.json ./

RUN npm ci

# .env.production is created on ci/cd actions.
COPY .env.production .

COPY . .

RUN npm run build

FROM nginx:alpine

WORKDIR /code

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /code/node_modules/build /usr/share/nginx/html/

CMD ["nginx", "-g", "daemon off;"]
