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
router.get('/admin/reported', pinsController.getReportedPins);
router.patch('/admin/:id/clear-reports', pinsController.clearPinReports);

router.get('/search', validateQuery(searchPinsSchema), pinsController.searchPins);
router.get('/:id', pinsController.getPin);
router.get('/:id/vote', pinsController.getUserVote);
router.post('/', validateBody(createPinSchema), pinsController.createPin);
router.put('/:id', validateBody(updatePinSchema), pinsController.updatePin);
router.delete('/:id', pinsController.deletePin);
router.post('/:id/rate', validateBody(ratePinSchema), pinsController.ratePin);
router.post('/:id/report', validateBody(reportPinSchema), pinsController.reportPin);
router.post('/:id/visit', pinsController.visitPin);

export default router;


