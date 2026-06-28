# 🩰 ArabelaEspectaculos MVP

Sistema web profesional para gestión de vestuarios de academia de baile.
Control de inventario en tiempo real, trazabilidad completa, QR codes y experiencia mobile-first.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| 📊 Dashboard | Estadísticas en tiempo real, actividad reciente |
| 👗 Inventario | CRUD completo, búsqueda/filtros, fotos, QR |
| 📅 Eventos | Crear eventos, asignar vestuarios y bailarines |
| 📋 Reportes | Daños, préstamos vencidos, resolución |
| 📱 QR Scan | Página de acción rápida optimizada para móvil |

---

## 🚀 Instalación rápida

### 1. Dependencias
```bash
npm install
```

### 2. Supabase
1. Crea un proyecto en https://supabase.com
2. Ejecuta `supabase/schema.sql` en el SQL Editor
3. Verifica que el bucket `costume-photos` esté creado como **public**

### 3. Variables de entorno
La aplicación requiere las variables de Supabase para ejecutarse localmente. Copia el archivo de ejemplo y edítalo con las credenciales de tu proyecto:

```bash
cp .env.local.example .env.local
# luego edita .env.local con tus valores
```

Las variables principales son:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- (opcional) `SUPABASE_SERVICE_ROLE_KEY` — usado por rutas server-side con privilegios
- `NEXT_PUBLIC_APP_URL` — URL base (ej: http://localhost:3000)

Después de configurar las variables, ejecuta la app:

```bash
npm run dev
```

### 4. Usuarios demo (opcional)
En Supabase → Authentication → Add user:
- `coordinador@demo.com` / `Demo1234!` con metadata: {"full_name":"Ana Coord","role":"coordinator"}
- `bailarin@demo.com` / `Demo1234!` con metadata: {"full_name":"Luis Bailarín","role":"dancer"}

---

## 🌐 Deploy en Vercel
```bash
vercel --prod
```
Agrega las variables de entorno en Vercel Settings.

---

## 📱 Flujo QR
1. Coordinador crea vestuario → se genera código único
2. Descarga QR desde el inventario → imprime etiqueta
3. Bailarín escanea → abre página de acción rápida
4. Elige: Retirar / Devolver / Lavado / Arreglo / Daño
5. Estado se actualiza en tiempo real

---

## 🗄 Tablas principales
- `users` — Perfiles (coordinador / dancer)
- `costumes` — Inventario de vestuarios
- `costume_movements` — Historial completo
- `events` — Eventos y presentaciones
- `event_costumes` — Vestuarios por evento
- `damage_reports` — Reportes de daño

---

## 🛠 Stack
Next.js · React · TailwindCSS · Supabase · TypeScript · Vercel
