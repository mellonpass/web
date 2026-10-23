# Pinned to a release patched for CVE-2026-111497 (Brotli decoder RCE).
# Keep in sync with .nvmrc.
FROM node:22.23.4-alpine AS build-stage

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
COPY --from=build-stage /code/build /usr/share/nginx/html/

CMD ["nginx", "-g", "daemon off;"]
