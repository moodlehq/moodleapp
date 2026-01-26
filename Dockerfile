## BUILD STAGE
FROM node:24 AS build-stage

WORKDIR /app

# Update platform dependencies
RUN apt-get update && apt-get install libsecret-1-0 jq -y

# Prepare native plugin
COPY ./cordova-plugin-moodleapp/package*.json /app/cordova-plugin-moodleapp/
RUN npm ci --prefix cordova-plugin-moodleapp
COPY ./cordova-plugin-moodleapp/ /app/cordova-plugin-moodleapp/
RUN npm run prod --prefix cordova-plugin-moodleapp

# Prepare node dependencies
COPY package*.json ./
COPY patches ./patches
RUN echo "unsafe-perm=true" > ./.npmrc
RUN npm ci --no-audit

# Build source
ARG build_command="npm run build:prod"
COPY . /app
# We want emulator code in Docker images ― even for production bundles ― because they will always run in a browser environment.
RUN cp /app/src/core/features/emulator/emulator.module.ts /app/src/core/features/emulator/emulator.module.prod.ts
RUN npx gulp lang
RUN npm run lang:update-langpacks
RUN ${build_command}

# Generate SSL certificate
RUN mkdir /app/ssl
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /app/ssl/certificate.key -out /app/ssl/certificate.crt -subj="/O=Moodle"

## SERVE STAGE
FROM nginx:alpine AS serve-stage

# Copy assets & config
COPY --from=build-stage /app/www /usr/share/nginx/html
COPY --from=build-stage /app/ssl/certificate.crt /etc/ssl/certificate.crt
COPY --from=build-stage /app/ssl/certificate.key /etc/ssl/certificate.key
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 443
HEALTHCHECK --interval=10s --timeout=4s CMD curl --insecure -f https://localhost/assets/env.json || exit 1
