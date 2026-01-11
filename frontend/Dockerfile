FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

RUN echo "=== FIND INDEX ===" \
 && find /app/dist -name index.html -maxdepth 4 -print \
 && test -f /app/dist/frontend/index.html || test -f /app/dist/frontend/browser/index.html

FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist/frontend/browser/ /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
