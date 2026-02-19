# ============================================================
# Dockerfile — Frontend Next.js 14 (Development)
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Porta do frontend
EXPOSE 3000

# Comando de desenvolvimento
CMD ["npm", "run", "dev"]
