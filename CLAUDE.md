# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

API REST multi-tenant para facturación electrónica del SRI (Ecuador). Sistema diseñado para gestionar múltiples empresas emisoras de comprobantes electrónicos (facturas, notas de crédito, retenciones), con firma digital, envío al SRI, generación de RIDE (PDF) y notificación por email.

**Stack:** Node.js + TypeScript + Express + Prisma + PostgreSQL + Supabase Storage + Resend

## Development Commands

```bash
# Development
npm run dev              # Build and run (dev mode watches manually)
npm run build            # Compile TypeScript to dist/

# Testing
npm test                 # Build and run node:test on tests/

# Database
npx prisma generate      # Regenerate Prisma client
npx prisma migrate dev   # Create and apply migrations
npx prisma studio        # Open database GUI

# Seeding (optional)
npm run seed            # Create initial empresa with firma electronica
```

**Single Test:** Node.js native test runner is used. To run a single test file:
```bash
npm run build && node --test tests/path/to/file.test.mjs
```

## Architecture

### Multi-Tenant Model

**Critical concept:** Every entity belongs to an `Empresa` (tenant). All queries MUST filter by `empresaId` to ensure tenant isolation. The system uses a shared database with logical separation.

- **Empresa:** Tenant root entity (RUC, razón social, direcciones, ambiente SRI, firma electrónica)
- **API Keys:** Each empresa has multiple API keys with granular permissions (`factura`, `notaCredito`, `retencion`, `consulta`)
- **MASTER_API_KEY:** Admin key for creating empresas and managing all tenants (requireAdmin middleware)
- **Middleware `apiKeyAuth`:** Attaches `req.empresaId` and `req.isAdmin` to all protected routes

### Flow: Creating a Comprobante

1. **Controller** receives request, validates with Zod schema
2. **comprobanteService.emitirFactura/NotaCredito/Retencion:**
   - Generates next sequential number (per empresa + tipo + estab + pto)
   - Generates clave de acceso (49-digit SRI key)
   - Builds XML with xmlGenerator (factura/notaCredito/retencion)
   - **Signs XML** with firma electrónica (.p12 from Supabase Storage)
   - **Sends to SRI** reception endpoint (SOAP)
   - **Queries authorization** from SRI (SOAP)
   - Uploads XML files to Supabase Storage (`comprobantes/{empresaId}/{tipoDoc}/{claveAcceso}/`)
   - Creates `Comprobante` record in database with estado (AUTORIZADO/RECHAZADO/etc)
3. **RIDE generation** (PDF): Uses pdfkit to render invoice layout
4. **Email:** Sends RIDE via Resend API

### Key Services

- **services/sri/comprobanteService.ts:** Core orchestration service with dependency injection pattern (see `createComprobanteService` factory)
- **services/sri/xmlGenerator*.ts:** XML builders for each document type (factura, notaCredito, retencion)
- **services/sri/firmaElectronica.ts:** P12 certificate management with in-memory cache, decrypts passwords with AES-256-GCM
- **services/sri/soapClient.ts:** SOAP client wrapper for SRI web services
- **services/sri/recepcion.ts + autorizacion.ts:** SRI reception and authorization flows
- **services/ride/ride*.ts:** PDF generation for each document type
- **services/email/emailService.ts:** Resend integration for sending RIDE

### Database Schema Highlights

- **Empresa:** `ambiente` field ('1'=pruebas, '2'=produccion) determines which SRI endpoints to use **per tenant**
- **FirmaElectronica:** Multiple certificates per empresa (history + rotation), only one `activa=true` at a time
- **Comprobante:** Stores all emitted documents with `claveAcceso` (unique), estado, XML paths in Storage
- **Secuencial:** Auto-increment sequence per empresa + tipoDocumento + estab + pto (thread-safe with Prisma upsert)
- **ApiKey:** Tenant-scoped API keys with permission arrays

### Code Patterns

**Dependency Injection:** Most services use factory pattern (e.g., `createComprobanteService(deps)`) to allow mocking in tests. Default instances exported via `getComprobanteService()`.

**Error Handling:** Controllers wrap async logic in try-catch, return `{ success: false, error: {...} }`. Middleware `errorHandler` catches unhandled errors.

**Validation:** Zod schemas in `src/schemas/` validate request bodies. Middleware `validateRequest` applies them.

**Storage Paths:**
- Firmas: `firmas/{empresaId}/{firmaId}.p12`
- Comprobantes: `comprobantes/{empresaId}/{tipoDoc}/{claveAcceso}/{generado|firmado|autorizado}.xml`
- RIDE: `comprobantes/{empresaId}/{tipoDoc}/{claveAcceso}/ride.pdf`

**SRI URLs:** Defined in `.env`, selected by empresa's `ambiente` field (pruebas vs produccion).

## Testing

Tests use Node.js native test runner (`node:test`). Files are `.mjs` (ESM) and import from `dist/` (compiled output).

**Test structure:** Mirrors `src/` directory. Tests use mock dependencies injected into service factories.

**Important:** Always `npm run build` before running tests to ensure latest compiled code.

## Deployment (Render)

- **Build:** `npm install && npx prisma generate && npm run build`
- **Start:** `npm start` (runs prisma generate + node dist/app.js)
- **Health check:** `GET /api/v1/health`
- **Environment variables:** See `.env.example` and `render.yaml`
- **Prisma engine:** Uses `engineType = "binary"` for Render compatibility

## Important Notes

- **Never skip firma validation:** Every comprobante MUST be signed with active firma electrónica
- **Tenant isolation is critical:** Always filter by `empresaId` in queries
- **Secuencial generation is atomic:** Uses Prisma's upsert with increment to avoid race conditions
- **Encryption:** P12 passwords encrypted with AES-256-GCM (ENCRYPTION_KEY env var)
- **Catalogs:** Static catalogs (tipos documento, identificacion, impuestos, formas pago) in `src/catalogs/`
- **TypeScript strict mode:** All code uses strict type checking
- **Module system:** ESM (type: "module" in package.json), use .js extensions in imports even for .ts files

## API Structure

```
/api/v1
├── /health                                    # Health check
├── /catalogos/*                               # Static catalogs (no auth)
├── /empresas                                  # Admin only (MASTER_API_KEY)
├── /auth/api-keys                            # API key management
├── /firma-electronica                        # Upload and manage .p12 certificates
├── /facturas                                 # Create factura
├── /notas-credito                            # Create nota credito
├── /retenciones                              # Create retencion
├── /comprobantes                             # List and query comprobantes
│   ├── /:claveAcceso                        # Get by clave
│   ├── /:claveAcceso/ride                   # Download RIDE PDF
│   ├── /:claveAcceso/email                  # Send RIDE via email
│   └── /:claveAcceso/autorizacion           # Query SRI authorization status
└── /configuracion/empresa                    # Get/update own empresa
```

## Common Pitfalls

- **Forgetting to build:** Tests import from `dist/`, not `src/`. Always run `npm run build` first.
- **Wrong firma:** Ensure empresa has an active firma (`activa=true`) before emitting comprobantes.
- **Ambiente mismatch:** Each empresa has its own ambiente setting. Production empresas hit production SRI endpoints.
- **Missing empresaId:** All tenant-scoped queries need `{ where: { empresaId: req.empresaId } }`.
- **Storage path format:** Paths in DB already include bucket prefix (e.g., `comprobantes/...`), don't prepend it again when downloading.
