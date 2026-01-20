FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3003
CMD ["npm", "run", "dev"]
