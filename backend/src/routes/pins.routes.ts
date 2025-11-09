import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { pinsController } from '../controllers/pins.controller';
import {
  createPinSchema,
  updatePinSchema,
  ratePinSchema,
  reportPinSchema,
  searchPinsSchema,
} from '../types/pins.types';

const router = Router();

// Apply authentication to all pin routes for visibility filtering
router.use(authenticateToken);

// Admin routes (must be before /:id to avoid path conflicts)
router.get('/admin/reported', (req, res, next) => void pinsController.getReportedPins(req, res, next));
router.patch('/admin/:id/clear-reports', (req, res, next) => void pinsController.clearPinReports(req, res, next));

router.get('/search', validateQuery(searchPinsSchema), (req, res, next) => void pinsController.searchPins(req, res, next));
router.get('/:id', (req, res, next) => void pinsController.getPin(req, res, next));
router.get('/:id/vote', (req, res, next) => void pinsController.getUserVote(req, res, next));
router.post('/', validateBody(createPinSchema), (req, res, next) => void pinsController.createPin(req, res, next));
router.put('/:id', validateBody(updatePinSchema), (req, res, next) => pinsController.updatePin(req as any, res, next));
router.delete('/:id', (req, res, next) => void pinsController.deletePin(req, res, next));
router.post('/:id/rate', validateBody(ratePinSchema), (req, res, next) => pinsController.ratePin(req as any, res, next));
router.post('/:id/report', validateBody(reportPinSchema), (req, res, next) => pinsController.reportPin(req as any, res, next));
router.post('/:id/visit', (req, res, next) => void pinsController.visitPin(req, res, next));

export default router;


