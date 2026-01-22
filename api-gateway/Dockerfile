FROM node:20-alpine

WORKDIR /app

# útil para healthchecks/debug
RUN apk add --no-cache wget

COPY package*.json ./

# Se houver package-lock.json consistente, usa ci; caso contrário usa install
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
