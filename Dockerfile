## BUILD STAGE
FROM node:14 as build-stage

WORKDIR /app

# Prepare node dependencies
RUN apt-get update && apt-get install libsecret-1-0 -y
COPY package*.json ./
COPY patches ./patches
RUN echo "unsafe-perm=true" > ./.npmrc
RUN npm ci --no-audit

# Build source
ARG build_command="npm run build:prod"
COPY . /app
RUN ${build_command}

## SERVE STAGE
FROM nginx:alpine as serve-stage

# Copy assets & config
COPY --from=build-stage /app/www /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK --interval=10s --timeout=4s CMD curl -f http://localhost/assets/env.json || exit 1
