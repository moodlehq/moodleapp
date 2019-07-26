# This image is based on the fat node 11 image.
# We require fat images as neither alpine, or slim, include git binaries.
FROM node:11

# Port 8100 for ionic dev server.
EXPOSE 8100

# Port 35729 is the live-reload server.
EXPOSE 35729

# Port 53703 is the Chrome dev logger port.
EXPOSE 53703

WORKDIR /app

COPY . /app

# Install npm libraries.
RUN npm install && rm -rf /root/.npm

# Run gulp before starting.
RUN npx gulp

# Provide a Healthcheck command for easier use in CI.
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s CMD curl -f http://localhost:8100 || exit 1

CMD ["npm", "run", "ionic:serve"]
