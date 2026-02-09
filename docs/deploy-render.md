# Deploy Render + Keep Alive

## 1) Deploy en Render
1. Sube este repo a GitHub (rama `main`).
2. En Render crea un `Web Service` desde el repo.
3. Si quieres IaC, usa el archivo `render.yaml` del proyecto.
4. Configura todas las variables `sync: false` desde el dashboard de Render.
5. `DATABASE_URL` en Render debe ser la de **Supabase Connection Pooling (IPv4)**:
   - No uses: `db.<project-ref>.supabase.co:5432` (puede resolver a IPv6 y fallar con `ENETUNREACH`).
   - Usa: host `*.pooler.supabase.com` puerto `6543`.
   - Ejemplo:
     - `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`
6. Espera el deploy y valida:
   - `GET https://<tu-servicio>.onrender.com/api/v1/health`

## 2) Seed inicial (opcional)
Si quieres crear empresa inicial automáticamente:
1. Define variables de seed en Render shell o local:
   - `SEED_RUC`
   - `SEED_RAZON_SOCIAL`
   - `SEED_DIRECCION_MATRIZ`
   - `SEED_DIRECCION_ESTABLECIMIENTO`
   - `SEED_P12_PATH`
   - `SEED_P12_PASSWORD`
   - `SEED_API_KEY_NAME` (opcional)
2. Ejecuta:
   - `npm run seed`

## 3) Keep Alive
Configura monitor HTTP hacia:
- `https://<tu-servicio>.onrender.com/api/v1/health`

Recomendado:
- UptimeRobot cada 5 minutos
- cron-job.org cada 14 minutos (backup)

## 4) Prueba E2E mínima
1. Crea empresa con `MASTER_API_KEY`.
2. Sube firma `.p12` con `/api/v1/firma-electronica`.
3. Emite factura (`/api/v1/facturas`).
4. Genera RIDE (`/api/v1/comprobantes/:claveAcceso/ride`).
5. Envía correo (`/api/v1/comprobantes/:claveAcceso/email`).
