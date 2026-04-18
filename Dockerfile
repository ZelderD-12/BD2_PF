FROM oven/bun:1.1-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json bun.lock* ./

# Instalar dependencias (mssql, react, etc.)
RUN bun install

# Copiar código fuente
COPY . .

# Exponer puertos
EXPOSE 3000
EXPOSE 8080

# Usar el script dev del package.json
CMD ["bun", "run", "dev"]