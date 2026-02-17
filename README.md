# Rompecabezas - STEAM-G

Juego de rompecabezas multiplataforma construido con **Ionic React**, **Capacitor** y **Vite**. Diseñado para ejecutarse en Android, iOS y Web.

---

## Requisitos Previos

- [Node.js](https://nodejs.org/) (v18 o superior)
- npm (incluido con Node.js)
- [Ionic CLI](https://ionicframework.com/docs/cli) (`npm install -g @ionic/cli`)

---

## Instalación

```bash
npm install
```

---

## Desarrollo Local

```bash
npm run dev
```

Inicia el servidor de desarrollo de Vite en `http://localhost:5173`.

---

## Construcción del ZIP de Android (`npm run build`)

El comando `npm run build` ejecuta el pipeline completo de construcción y genera un archivo **`android-base.zip`** listo para ser importado en Android Studio. El proceso consta de las siguientes etapas:

### Etapas del Build

| # | Script | Descripción |
|---|--------|-------------|
| 1 | `build:web` | Compila la aplicación web con Ionic/Vite y genera la carpeta `dist/`. |
| 2 | `build:android` | Agrega la plataforma Android mediante Capacitor (solo si la carpeta `android/` no existe). |
| 3 | `build:android:sync` | Copia los archivos web compilados (`dist/`) dentro del proyecto Android nativo. |
| 4 | `patch:capacitor` | Ejecuta `scripts/patch-capacitor-gradle.cjs`, que reemplaza las referencias locales de Capacitor (`project(':capacitor-android')`, etc.) por dependencias Maven (`com.capacitorjs:core`, `com.capacitorjs:app`, etc.). Esto permite que el proyecto Android compile sin necesidad de los módulos locales de Capacitor. |
| 5 | `clean:assets` | **Elimina archivos innecesarios** del proyecto Android para optimizar el tamaño del ZIP (ver detalle abajo). |
| 6 | `zip:android` | Comprime la carpeta `android/` en el archivo `android-base.zip` usando PowerShell. |

### Archivos Eliminados en `clean:assets`

Para reducir significativamente el tamaño del ZIP resultante, se eliminan los siguientes archivos y directorios que **no son necesarios** para compilar el proyecto en Android Studio (son caches, metadatos de IDE y artefactos de compilación que se regeneran automáticamente):

| Ruta | Razón de eliminación |
|------|----------------------|
| `android/.gradle` | Cache interna de Gradle, se regenera al compilar. |
| `android/.gitignore` | No necesario para el ZIP distribuible. |
| `android/.idea/*` | Archivos de configuración de IntelliJ/Android Studio (caches, gradle.xml, misc.xml, vcs.xml, etc.). Se regeneran al abrir el proyecto. |
| `android/app/build` | Artefactos de compilación de la app. Se regeneran con cada build. |
| `android/build` | Artefactos de compilación del proyecto raíz. Se regeneran con cada build. |
| `android/capacitor-cordova-android-plugins/build` | Artefactos de compilación de plugins Cordova. Se regeneran automáticamente. |
| `android/local.properties` | Contiene rutas locales del SDK de Android (específicas de cada máquina). Android Studio lo regenera. |
| `android/app/src/androidTest` | Tests de instrumentación de Android. No requeridos para el build de producción. |
| `android/app/src/test` | Tests unitarios de Android. No requeridos para el build de producción. |

---

## Archivo de Configuración (`rompecabezas-config.json`)

La aplicación carga su configuración en tiempo de ejecución desde el archivo:

```
public/config/rompecabezas-config.json
```

> Al ejecutar el build, Vite copia el contenido de `public/` a `dist/`, por lo que el archivo quedará disponible en `dist/config/rompecabezas-config.json` y será accesible desde la app mediante `fetch("/config/rompecabezas-config.json")`.

### Ejemplo de Configuración

```json
{
    "nivel": "intermedio",
    "imagen": "/assets/images.jpg",
    "version": "1.0.0",
    "fecha": "2026-02-16",
    "descripcion": "Rompecabezas",
    "nombreApp": "STEAM-G",
    "plataformas": ["iOS", "Android", "Web"]
}
```

### Opciones Disponibles

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|:-----------:|-------------|
| `nivel` | `string` | No | Nivel de dificultad del juego. Valores aceptados: `"basico"`, `"intermedio"`, `"avanzado"` (también acepta sus equivalentes en inglés: `"basic"`, `"intermediate"`, `"advanced"`). **Por defecto:** `"basic"`. |
| `imagen` | `string` | No | Ruta a la imagen que se usará como rompecabezas (ej. `"/assets/images.jpg"`). |
| `version` | `string` | No | Versión de la configuración (ej. `"1.0.0"`). |
| `fecha` | `string` | No | Fecha de creación en formato ISO (`"YYYY-MM-DD"`). Se muestra formateada como texto largo (ej. "5 de enero del 2026"). |
| `descripcion` | `string` | No | Descripción breve de la actividad. |
| `nombreApp` | `string` | No | Nombre de la aplicación mostrado en la pantalla de inicio y en la información. **Por defecto:** `"STEAM-G"`. |
| `plataformas` | `string[]` | No | Lista de plataformas destino (ej. `["iOS", "Android", "Web"]`). Se muestra en la pantalla de información. |

### Configuración por Nivel de Dificultad

Según el nivel configurado, el juego ajusta automáticamente los siguientes parámetros:

| Nivel | Cuadrícula | Tiempo | Puntos por ejercicio |
|-------|:----------:|:------:|:--------------------:|
| Básico | 3x3 | 2:00 min | 10 |
| Intermedio | 4x4 | 5:00 min | 15 |
| Avanzado | 5x5 | 10:00 min | 20 |

---

## Scripts Disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Desarrollo | `npm run dev` | Inicia el servidor de desarrollo. |
| Build completo | `npm run build` | Pipeline completo: web + android + patch + clean + zip. |
| Build web | `npm run build:web` | Solo compila la versión web. |
| Preview | `npm run preview` | Previsualiza el build de producción. |
| Tests unitarios | `npm run test.unit` | Ejecuta tests con Vitest. |
| Tests E2E | `npm run test.e2e` | Ejecuta tests con Cypress. |
| Lint | `npm run lint` | Ejecuta ESLint sobre el código. |

