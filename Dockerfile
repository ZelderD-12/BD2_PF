FROM oven/bun:1.1-alpine

WORKDIR /app

# Copiar SOLO los archivos de dependencias primero
COPY package.json ./

# Instalar dependencias (sin lockfile problemático)
RUN bun install --no-cache

# Copiar el resto del código
COPY . .

# Exponer puertos
EXPOSE 8080

# Usar el script dev
CMD ["bun", "run", "dev"]