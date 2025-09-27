FROM node:22.19-alpine AS build
WORKDIR /app

# Install dependencies and build the project
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Final image
FROM node:22.19-alpine

RUN apk add --no-cache maven curl

WORKDIR /app
COPY --from=build /app/dist/src ./sapcommerce-sbom-gen/
COPY --from=build /app/node_modules ./node_modules
COPY package.json starter.sh /app/

RUN ln -s /app/starter.sh /bin/sapcommerce-sbom-gen

USER node
WORKDIR /source
CMD ["sapcommerce-sbom-gen"]
