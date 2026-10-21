# StudentHub (AppHub)

StudentHub es una plataforma integral de productividad estudiantil que combina gestion de calendarios universitarios, planificacion inteligente de tareas, notas de estudio sincronizadas, asistente con Inteligencia Artificial y un bot de WhatsApp interactivo conectado a la nube.

Disenado para estudiantes y profesionales que necesitan sincronizar su tiempo en Web, Android y Escritorio.

---

## Caracteristicas Principales

### 1. Calendario Universitario y Personal
- Vistas multiples: Mes, Semana, Dia (Agenda horaria) y Cronograma continuo.
- Soporte para eventos de dia completo y eventos con franja horaria precisa.
- Importacion y sincronizacion automatica de calendarios externos iCal / ICS (Google Calendar, Apple Calendar, TeamUp, Campus Virtual).
- Radar de examenes y bloques de enfoque con contador regresivo.
- Paleta de colores dinamica con soporte para modo claro, modo oscuro y temas personalizados.

### 2. Auto-Organizer y Tareas
- Gestion de tareas con niveles de esfuerzo (Bajo, Medio, Alto) y roles tematicos (Universidad, Salud, Personal, Proyectos).
- Deteccion de tareas finalizadas con tachado automatico segun la hora actual.
- Sincronizacion en tiempo real mediante Cloud Firestore.

### 3. Asistente de Inteligencia Artificial (Groq)
- Asistente inteligente con modelos de ultra-baja latencia (Qwen 2.5/3.8, Llama 3.3, GPT-OSS).
- Capacidad de creacion, modificacion y consulta de eventos en lenguaje natural.
- Transcripcion de notas de voz con Whisper.

### 4. Mayordomo de WhatsApp (Baileys Bridge)
- Puente bidireccional que conecta tu numero de WhatsApp a tu cuenta de StudentHub.
- Envia mensajes de texto o notas de voz por WhatsApp para crear tareas, modificar horarios y consultar que tienes pendiente hoy o manana.
- Resumen nocturno automatico con la planificacion del dia siguiente.

### 5. Widgets Nativos para Android
- Widget de Planificacion Semanal con lista deslizable y tachado de tareas completadas.
- Widget de Calendario con mini-cuadricula mensual y vista rapida del dia actual.
- Adaptacion nativa a modo oscuro y modo claro del sistema operativo.
- Widget de Boton de Voz para interactuar directamente con la IA desde la pantalla de inicio.

---

## Arquitectura del Proyecto

```
AppHub/
├── src/                          # Frontend React + Tailwind CSS
│   ├── pages/                    # Paginas principales (CalendarPage, AutoOrganizerPage, LandingPage...)
│   ├── components/               # Modales, widgets, barras de navegacion
│   ├── services/                 # Servicios de Firebase, Groq AI y utilidades
│   └── index.css                 # Estilos globales y tokens de diseno
├── android/                      # Proyecto nativo Android (Capacitor)
│   └── app/src/main/             # Java Providers, layouts XML de widgets y manifiesto
├── electron/                     # Empaquetado de escritorio para Windows
├── server/                       # Servidor Node.js backend
│   └── whatsapp-bridge.js        # Puente WhatsApp (Baileys) + Proxy de descargas y API de IA
├── .github/workflows/            # Workflows de CI/CD para compilar APK y EXE
└── package.json                  # Dependencias y scripts de ejecucion
```

---

## Instalacion y Desarrollo Local

### Requisitos previos
- Node.js 18 o superior
- npm o pnpm
- Android Studio (opcional, para compilar APK localmente)

### Pasos de configuracion

1. Clonar el repositorio:
```bash
git clone https://github.com/Gekamil/AppHub.git
cd AppHub
```

2. Instalar dependencias del frontend y del backend:
```bash
npm install
cd server && npm install && cd ..
```

3. Configurar variables de entorno:
Copia el archivo de plantilla `.env.example` como `.env`:
```bash
cp .env.example .env
```
Rellena `GROQ_API_KEY` con tu clave de la consola de Groq (https://console.groq.com/keys).

4. Iniciar el entorno de desarrollo web:
```bash
npm run dev
```

5. Iniciar el servidor backend de WhatsApp (opcional para desarrollo local):
```bash
node server/whatsapp-bridge.js
```

---

## Variables de Entorno

| Variable | Descripcion | Entorno |
|---|---|---|
| `PORT` | Puerto donde escucha el servidor de WhatsApp | Servidor Render / Local |
| `GROQ_API_KEY` | Clave API de Groq para procesamiento del bot y asistente | Servidor Render |
| `GITHUB_TOKEN` | Token de acceso para descargar assets de releases privadas (opcional si el repo es publico) | Servidor Render |
| `VITE_GROQ_API_KEY` | Clave opcional para llamadas directas desde cliente en desarrollo | Frontend Vite |

---

## Despliegue en Produccion

### Servidor Backend (Render)
1. Conecta el repositorio en Render como **Web Service**.
2. **Build Command**: `cd server && npm install`
3. **Start Command**: `node server/whatsapp-bridge.js`
4. Anade la variable de entorno `GROQ_API_KEY` en los ajustes del servicio.

### Frontend Web
El frontend puede desplegarse en cualquier plataforma estatica (Vercel, Firebase Hosting, Netlify):
```bash
npm run build
```
El directorio de salida es `dist/`.

---

## Licencia

Este proyecto esta bajo licencia privada / de codigo abierto segun las politicas del repositorio. Todos los derechos reservados.
