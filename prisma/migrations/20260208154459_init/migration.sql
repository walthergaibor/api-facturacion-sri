-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "direccionMatriz" TEXT NOT NULL,
    "direccionEstablecimiento" TEXT NOT NULL,
    "codEstablecimiento" TEXT NOT NULL DEFAULT '001',
    "ptoEmision" TEXT NOT NULL DEFAULT '001',
    "obligadoContabilidad" BOOLEAN NOT NULL DEFAULT false,
    "contribuyenteEspecial" TEXT,
    "agenteRetencion" TEXT,
    "regimenMicroempresas" BOOLEAN NOT NULL DEFAULT false,
    "ambiente" TEXT NOT NULL DEFAULT '1',
    "tipoEmision" TEXT NOT NULL DEFAULT '1',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmaElectronica" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "p12PasswordEnc" TEXT NOT NULL,
    "p12PasswordIv" TEXT NOT NULL,
    "p12PasswordTag" TEXT NOT NULL,
    "titular" TEXT,
    "rucTitular" TEXT,
    "vigenciaDesde" TIMESTAMP(3),
    "vigenciaHasta" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirmaElectronica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comprobante" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "claveAcceso" TEXT NOT NULL,
    "secuencial" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'CREADO',
    "xmlGenerado" TEXT,
    "xmlFirmado" TEXT,
    "xmlAutorizado" TEXT,
    "ridePdf" TEXT,
    "respuestaSri" JSONB,
    "identificacionComprador" TEXT NOT NULL,
    "razonSocialComprador" TEXT NOT NULL,
    "emailComprador" TEXT,
    "totalSinImpuestos" DECIMAL(65,30),
    "totalConImpuestos" DECIMAL(65,30),
    "importeTotal" DECIMAL(65,30),
    "moneda" TEXT NOT NULL DEFAULT 'DOLAR',
    "firmaElectronicaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secuencial" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "codEstablecimiento" TEXT NOT NULL,
    "ptoEmision" TEXT NOT NULL,
    "secuenciaActual" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Secuencial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "permisos" TEXT[] DEFAULT ARRAY['factura', 'notaCredito', 'retencion', 'consulta']::TEXT[],
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "ultimoUso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_ruc_key" ON "Empresa"("ruc");

-- CreateIndex
CREATE INDEX "FirmaElectronica_empresaId_activa_idx" ON "FirmaElectronica"("empresaId", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "Comprobante_claveAcceso_key" ON "Comprobante"("claveAcceso");

-- CreateIndex
CREATE INDEX "Comprobante_empresaId_tipoDocumento_fechaEmision_idx" ON "Comprobante"("empresaId", "tipoDocumento", "fechaEmision");

-- CreateIndex
CREATE INDEX "Comprobante_empresaId_estado_idx" ON "Comprobante"("empresaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Secuencial_empresaId_tipoDocumento_codEstablecimiento_ptoEm_key" ON "Secuencial"("empresaId", "tipoDocumento", "codEstablecimiento", "ptoEmision");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- AddForeignKey
ALTER TABLE "FirmaElectronica" ADD CONSTRAINT "FirmaElectronica_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secuencial" ADD CONSTRAINT "Secuencial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
