FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json ./

# Build determinístico quando há lock; caso contrário cai para npm install
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

# garantir diretoria para SQLite (mesmo com volume)
RUN mkdir -p /app/data

ENV PORT=3002
EXPOSE 3002

CMD ["npm", "start"]
