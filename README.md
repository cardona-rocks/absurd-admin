# A.b.s.u.r.d. · Panel de administración

Dashboard en React + Vite para gestionar el catálogo de avatares, moderar
jugadores y ajustar la economía del juego.

## Puesta en marcha

```bash
npm install
cp .env.example .env     # en local puedes dejar VITE_API_URL vacío
npm run dev              # http://localhost:5174
```

En desarrollo Vite hace de proxy: `/api` y `/uploads` van a
`http://localhost:3000`, así que basta con tener la API corriendo al lado.

### Primer acceso

El panel solo admite cuentas con rol `moderator` o `admin`. El primer
administrador se crea desde la API:

```bash
cd ../api
ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD='una-contraseña-larga' npm run seed:admin
```

La cuenta nace marcada para cambiar la contraseña, así que en el primer acceso
el panel te obliga a elegir una nueva antes de dejarte entrar.

## Qué se puede hacer

**Resumen** — jugadores, combates de hoy y en vivo, créditos en circulación,
combates por día de las últimas dos semanas y los avatares más comprados.

**Avatares** — alta, edición y borrado. Cada avatar tiene nombre, descripción,
coste, categoría (Basic, Rare, Epic, Legendary, Hidden, Unique, Limited,
Whalegrade) y cinco juegos de sprites:

| Tipo | Obligatorio | Para qué |
|---|---|---|
| Frente | sí | El rival, de cara, en la esquina superior |
| Espalda | sí | Tu personaje, de espaldas, abajo |
| Reposo | no | Tarjetas y menús |
| Victoria | no | Celebración al ganar |
| Derrota | no | Reacción al perder |

Cada tipo admite varias imágenes: el orden de la lista es el orden de los
fotogramas de la animación, y se reordena con las flechas de cada miniatura.

Un avatar nuevo se crea **oculto**, para poder guardarlo antes de tener las
imágenes. No se deja marcar como visible hasta que tenga Frente y Espalda.

Borrar está reservado a administradores y se bloquea si algún jugador ya lo
compró: en ese caso hay que marcarlo como **retirado**, que lo saca de la venta
pero lo conserva en las colecciones existentes.

**Usuarios** — buscar por nombre o correo, filtrar por rol y estado, suspender y
reactivar cuentas con motivo, ajustar créditos, regalar avatares, dejar notas
internas y (solo admins) cambiar roles y restablecer contraseñas.

**Auditoría** — toda acción hecha desde el panel queda registrada con quién,
cuándo y qué cambió.

## Despliegue en Railway

Crea un servicio nuevo apuntando a esta carpeta. `railway.toml` ya define el
build y el arranque; solo hay que añadir la variable:

```
VITE_API_URL=https://<tu-api>.up.railway.app
```

Vite incrusta esa variable en el bundle durante el build, así que **al cambiarla
hay que volver a desplegar** — no basta con reiniciar.

`server.js` sirve `dist/` sin dependencias externas y devuelve `index.html` en
las rutas desconocidas, para que recargar en `/avatars` no dé 404.

### Imágenes

Las imágenes se suben a la API y se guardan en disco, así que el servicio de la
API necesita un **volumen persistente** en Railway con `UPLOADS_DIR` apuntando a
su ruta de montaje. Sin volumen, cada despliegue borra lo subido.

## Notas

- El token se guarda en `localStorage`. Un 401 lo descarta y devuelve al login.
- Los moderadores no pueden cambiar roles, borrar avatares ni restablecer
  contraseñas; esas acciones son de administrador.
- Un admin no puede quitarse a sí mismo el rol ni dejar el sistema sin ningún
  administrador.
