# The Firebase Authentication emulator (ADR-0019), for the local environment.
#
# Firebase publishes the emulator as part of its command-line tools and not as
# an image, so this builds one. The Authentication emulator is written in
# JavaScript; it needs no Java, unlike the Firestore and Storage emulators.

ARG NODE_VERSION=26.13.1
FROM node:${NODE_VERSION}-trixie-slim

ARG FIREBASE_TOOLS_VERSION=15.37.0

RUN npm install --global firebase-tools@${FIREBASE_TOOLS_VERSION} \
    && npm cache clean --force

# The tools check for a newer version of themselves unless told not to.
# They report usage only for a logged-in user who agreed to it, and nobody
# logs in here (checked in the sources of firebase-tools 15.37.0).
ENV NO_UPDATE_NOTIFIER=1 \
    CI=true

USER node
WORKDIR /home/node/emulator
COPY --chown=node:node firebase.json ./

# The interface of the emulator suite is downloaded once, at build time.
RUN firebase setup:emulators:ui

# 9099 the Authentication emulator · 4000 its interface · 4400 hub · 4500 logs
EXPOSE 9099 4000 4400 4500

# A project identifier that starts with "demo-" never reaches a real project:
# the tools refuse to talk to the cloud for it.
CMD ["firebase", "emulators:start", "--only", "auth", "--project", "demo-promenade"]
