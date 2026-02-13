# Stage 1: Build the React application
FROM node:24-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine

# Copy the build output from Stage 1 to Nginx's default directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy entrypoint script
COPY nginx-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/nginx-entrypoint.sh

# Expose HTTP and HTTPS ports
EXPOSE 80
EXPOSE 443

# Set volumes for SSL certificates (e.g., from Certbot)
VOLUME ["/etc/nginx/ssl", "/etc/letsencrypt"]

ENTRYPOINT ["nginx-entrypoint.sh"]

CMD ["nginx", "-g", "daemon off;"]
