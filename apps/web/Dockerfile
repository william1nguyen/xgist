# Stage 1: Build the React app
FROM node:20-alpine AS builder

ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_CLIENT_ID
ARG VITE_BASE_URL

WORKDIR /app
COPY . /app/

RUN npm install -g npm@10.8.3

# Set the ownership of the .npm directory
RUN mkdir -p /root/.npm && chown -R 501:20 /root/.npm
RUN npm install

# Build the React app
RUN npm run build

# Stage 2: Serve the app with NGINX
FROM nginx:stable-alpine

# Copy the build output to NGINX's html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 443

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]