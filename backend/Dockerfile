# ============================================================
# Dockerfile — Backend NestJS (Development)
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Porta do backend
EXPOSE 3001

# Comando de desenvolvimento
CMD ["npm", "run", "start:dev"]
