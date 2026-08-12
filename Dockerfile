# Build determinista del panel.
#
# Se usa Dockerfile en vez del builder automático de Railway porque este monta
# cachés dentro de node_modules (entre ellas node_modules/.vite). `npm ci` borra
# node_modules antes de instalar y no se puede hacer rmdir de un punto de
# montaje: el deploy falla con EBUSY. Aquí controlamos el sistema de archivos.

FROM node:20-alpine AS builder

WORKDIR /app

# Capa de dependencias aparte: solo se reinstala si cambian los manifiestos.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite incrusta las variables VITE_* en el bundle durante el build, así que
# tiene que llegar como build arg. En Railway se define como variable del
# servicio; al cambiarla hay que volver a desplegar, no basta con reiniciar.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---------------------------------------------------------------- runtime

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# server.js no tiene dependencias: solo hacen falta el bundle y el servidor.
COPY --from=builder /app/dist ./dist
COPY server.js ./

EXPOSE 8080
CMD ["node", "server.js"]
