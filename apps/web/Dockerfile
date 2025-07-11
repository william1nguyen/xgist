# Stage 1: Build the React app
FROM node:20-alpine AS builder

ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_CLIENT_ID
ARG VITE_BASE_URL

WORKDIR /app
COPY . /app/

RUN npm install -g npm@10.8.3 \
    && mkdir -p /root/.npm \
    && chown -R 501:20 /root/.npm \
    && npm install \
    && npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]