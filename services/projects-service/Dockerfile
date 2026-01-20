FROM node:20-alpine

WORKDIR /app

# Para healthcheck com wget (alpine não traz por defeito)
RUN apk add --no-cache wget

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3002

# Preferimos dev se existir; senão troca para "npm start"
CMD ["npm", "run", "dev"]
