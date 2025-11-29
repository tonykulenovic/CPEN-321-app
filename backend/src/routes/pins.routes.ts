import { Router, Request } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { pinsController } from '../controllers/pins.controller';
import {
  createPinSchema,
  updatePinSchema,
  ratePinSchema,
  reportPinSchema,
  searchPinsSchema,
  UpdatePinRequest,
  RatePinRequest,
  ReportPinRequest,
} from '../types/pins.types';

const router = Router();

// Apply authentication to all pin routes for visibility filtering
router.use(authenticateToken);

// Admin routes (must be before /:id to avoid path conflicts)
router.get('/admin/reported', (req, res, next) => {
  pinsController.getReportedPins(req, res, next).catch(() => {});
});
router.patch('/admin/:id/clear-reports', (req, res, next) => {
  pinsController.clearPinReports(req, res, next).catch(() => {});
});

router.get('/search', validateQuery(searchPinsSchema), (req, res, next) => {
  pinsController.searchPins(req, res, next).catch(() => {});
});
router.get('/:id', (req, res, next) => {
  pinsController.getPin(req, res, next).catch(() => {});
});
router.get('/:id/vote', (req, res, next) => {
  pinsController.getUserVote(req, res, next).catch(() => {});
});
router.post('/', validateBody(createPinSchema), (req, res, next) => {
  pinsController.createPin(req, res, next).catch(() => {});
});
router.put('/:id', validateBody(updatePinSchema), (req, res, next) => {
  pinsController.updatePin(req as unknown as Request<{ id: string }, unknown, UpdatePinRequest>, res, next).catch(() => {});
});
router.delete('/:id', (req, res, next) => {
  pinsController.deletePin(req, res, next).catch(() => {});
});
router.post('/:id/rate', validateBody(ratePinSchema), (req, res, next) => {
  pinsController.ratePin(req as unknown as Request<{ id: string }, unknown, RatePinRequest>, res, next).catch(() => {});
});
router.post('/:id/report', validateBody(reportPinSchema), (req, res, next) => {
  pinsController.reportPin(req as unknown as Request<{ id: string }, unknown, ReportPinRequest>, res, next).catch(() => {});
});
router.post('/:id/visit', (req, res, next) => {
  pinsController.visitPin(req, res, next).catch(() => {});
});

export default router;


