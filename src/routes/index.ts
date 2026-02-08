import { Router } from 'express';
import multer from 'multer';

import { apiKeyController } from '../controllers/apiKeyController.js';
import { comprobanteController } from '../controllers/comprobanteController.js';
import { empresaController } from '../controllers/empresaController.js';
import { facturaController } from '../controllers/facturaController.js';
import { firmaController } from '../controllers/firmaController.js';
import { notaCreditoController } from '../controllers/notaCreditoController.js';
import { retencionController } from '../controllers/retencionController.js';
import { formasPago } from '../catalogs/formasPago.js';
import { tiposDocumento } from '../catalogs/tiposDocumento.js';
import { tiposIdentificacion } from '../catalogs/tiposIdentificacion.js';
import { tiposImpuesto } from '../catalogs/tiposImpuesto.js';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/catalogos/tipos-identificacion', (_req, res) => {
  res.status(200).json({ success: true, data: tiposIdentificacion });
});

router.get('/catalogos/tipos-impuesto', (_req, res) => {
  res.status(200).json({ success: true, data: tiposImpuesto });
});

router.get('/catalogos/formas-pago', (_req, res) => {
  res.status(200).json({ success: true, data: formasPago });
});

router.get('/catalogos/tipos-documento', (_req, res) => {
  res.status(200).json({ success: true, data: tiposDocumento });
});

router.use(apiKeyAuth);

router.post('/empresas', requireAdmin, empresaController.createEmpresa);
router.get('/empresas', requireAdmin, empresaController.listEmpresas);
router.get('/empresas/:id', requireAdmin, empresaController.getEmpresaById);
router.put('/empresas/:id', requireAdmin, empresaController.updateEmpresa);
router.patch('/empresas/:id/ambiente', requireAdmin, empresaController.updateAmbiente);

router.post('/auth/api-keys', apiKeyController.createApiKey);
router.get('/auth/api-keys', apiKeyController.listApiKeys);
router.delete('/auth/api-keys/:id', apiKeyController.revokeApiKey);
router.post('/facturas', facturaController.createFactura);
router.post('/notas-credito', notaCreditoController.createNotaCredito);
router.post('/retenciones', retencionController.createRetencion);
router.get('/comprobantes', comprobanteController.listComprobantes);
router.get('/comprobantes/:claveAcceso', comprobanteController.getComprobanteByClave);
router.get('/comprobantes/:claveAcceso/ride', comprobanteController.getRidePdf);
router.post('/comprobantes/:claveAcceso/email', comprobanteController.sendComprobanteEmail);
router.get(
  '/comprobantes/:claveAcceso/autorizacion',
  comprobanteController.consultarAutorizacionSri
);
router.post('/firma-electronica', upload.single('p12File'), firmaController.uploadFirma);
router.get('/firma-electronica/estado', firmaController.getFirmaEstado);
router.get('/firma-electronica/historial', firmaController.getFirmaHistorial);
router.get('/configuracion/empresa', empresaController.getOwnEmpresa);
router.put('/configuracion/empresa', empresaController.updateOwnEmpresa);

export default router;
