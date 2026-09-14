# 🍔 Food Store — Guía de Ejecución

Para levantar la aplicación correctamente, necesitas abrir **tres terminales separadas** y seguir estos pasos en orden.

---

## 1. 🗄️ Base de Datos (PostgreSQL en Docker)

Asegurate de tener Docker Desktop abierto en tu computadora. En la primera terminal, posicionado en la raíz del proyecto, ejecutá:

```powershell
# Levanta la base de datos en segundo plano
docker compose up -d
```
*(Para apagarla cuando termines: `docker compose down`)*

---

## 2. ⚙️ Backend (FastAPI)

En una **nueva** terminal, posicionado en la raíz del proyecto, ingresá a la carpeta del backend y activá el entorno virtual:

```powershell
cd backend

# 1. Crear el entorno virtual (SOLO LA PRIMERA VEZ o si borraste la carpeta .venv)
python -m venv .venv

# 2. Activar el entorno virtual (SIEMPRE ANTES DE CORRER EL PROYECTO)
.\.venv\Scripts\activate

# 3. Instalar dependencias (SOLO SI HAY CAMBIOS en requirements.txt)
pip install -r requirements.txt

# 4. Ejecutar el seed — Carga usuario admin y datos iniciales (SOLO LA PRIMERA VEZ)
python -m app.db.seed

# 5. Levantar el servidor
uvicorn app.main:app --reload --port 8000
```
*El backend estará corriendo en `http://localhost:8000` y podés ver la documentación en `http://localhost:8000/docs`.*

---

## 3. 🎨 Frontend (React + Vite)

En una **tercera** terminal, posicionado en la raíz del proyecto, ingresá a la carpeta del frontend:

```powershell
cd frontend

# 1. Instalar dependencias (SOLO LA PRIMERA VEZ o si agregás nuevos paquetes)
npm install

# 2. Levantar la interfaz web
npm run dev
```
*El frontend estará corriendo en `http://localhost:5173`. Hacé Ctrl+Click en la terminal para abrirlo en tu navegador.*

---

## 📝 Credenciales por Defecto

Después de ejecutar el seed, podés iniciar sesión con:

- **Email:** `admin@foodstore.com`
- **Contraseña:** `admin`
- **Rol:** `ADMIN`

Estas credenciales se crean automáticamente cuando ejecutás `python -m app.db.seed`.

---

## 💳 Configuración de Mercado Pago (Sandbox)

La integración con Mercado Pago está pensada para desarrollo local (Sandbox) utilizando **ngrok** para poder recibir los webhooks (notificaciones de pago aprobados/rechazados) en tiempo real.

### 1. Obtención de Credenciales de Prueba
Cada integrante del equipo debe obtener sus propias credenciales de prueba:
1. Iniciar sesión en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers).
2. Crear una aplicación (ej. *FoodStore*).
3. En el menú lateral izquierdo, ir a **Credenciales de prueba** (Sandbox).
4. Copiar la **Public Key** (`TEST-xxxx...`) y el **Access Token** (`TEST-xxxx...`).

### 2. Configuración en el Backend (`backend/.env`)
Crear el archivo `.env` dentro de la carpeta `backend/` (basado en el `.env.example`) y configurar:

```ini
# Credenciales de Mercado Pago (Copiadas de "Credenciales de prueba")
MP_ACCESS_TOKEN=TEST-tu-access-token-privado
MP_PUBLIC_KEY=TEST-tu-public-key-publica

# URLs de Ngrok para redirección y webhook (ver paso 4)
NGROK_URL=https://tu-subdominio-ngrok.ngrok-free.app
MP_WEBHOOK_URL=https://tu-subdominio-ngrok.ngrok-free.app/api/v1/pagos/webhook

# URL del Frontend React para los retornos
VITE_FRONTEND_URL=http://localhost:5173
```

### 3. Configuración en el Frontend (`frontend/.env`)
Crear o editar el archivo `.env` en la carpeta `frontend/` y configurar:

```ini
VITE_API_URL=http://localhost:8000
VITE_MP_PUBLIC_KEY=TEST-tu-public-key-publica
```

### 4. Ejecución del Túnel Ngrok (Webhook)
Mercado Pago requiere una URL pública HTTPS para enviarte las notificaciones de pago (`webhook`).
1. Descargar ngrok y ejecutar en una terminal aparte:
   ```bash
   ngrok http 8000
   ```
2. Copiar la URL generada (`https://abc1234.ngrok-free.app`) y pegarla en el `.env` del backend en `NGROK_URL` y `MP_WEBHOOK_URL`.
3. **⚠️ IMPORTANTE:** Si apagás y volvés a encender ngrok, la URL pública cambiará. Debés actualizar las variables en tu `.env` del backend y reiniciar uvicorn para que tome el cambio.

### 🔒 REGLA DE ORO DE SEGURIDAD
* Los archivos `.env` (tanto de backend como frontend) **NO se suben a Git** por seguridad (están agregados a `.gitignore`).
* Contienen credenciales privadas como `MP_ACCESS_TOKEN`. Si se filtran en GitHub, tu cuenta de Mercado Pago puede ser hackeada o sufrir estafas. 
* Si querés compartir credenciales de test con tu equipo, hacelo por canal privado, **nunca comitees archivos `.env`**.

## Video de presentación
https://youtu.be/8ESTjpLc_oQ
