<<<<<<< HEAD
# 🩰 DanceWear MVP

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
```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Usuarios demo (opcional)
En Supabase → Authentication → Add user:
- `coordinador@demo.com` / `Demo1234!` con metadata: `{"full_name":"Ana Coord","role":"coordinator"}`
- `bailarin@demo.com` / `Demo1234!` con metadata: `{"full_name":"Luis Bailarín","role":"dancer"}`

### 5. Correr
```bash
npm run dev
```

---

## 🌐 Deploy en Vercel
```bash
vercel --prod
```
Agrega las 3 variables de entorno en Vercel Settings.

---

## 📱 Flujo QR
1. Coordinador crea vestuario → se genera código único
2. Descarga QR desde el inventario → imprime etiqueta
3. Bailarín escanea → abre página de acción rápida
4. Elige: Retirar / Devolver / Lavado / Arreglo / Daño
5. Estado se actualiza en tiempo real

---

## 🗄 Tablas
- `users` — Perfiles (coordinador / dancer)
- `costumes` — Inventario de vestuarios  
- `costume_movements` — Historial completo
- `events` — Eventos y presentaciones
- `event_costumes` — Vestuarios por evento
- `damage_reports` — Reportes de daño

---

## 🛠 Stack
Next.js 15 · React · TailwindCSS · Supabase · TypeScript · Vercel
=======
# dancewear-mvp
>>>>>>> 81ad00af0d036372a60863d47ae747897250bfc5
