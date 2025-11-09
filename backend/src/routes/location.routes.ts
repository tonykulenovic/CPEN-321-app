import { Router } from 'express';
import * as locationController from '../controllers/location.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all location routes
router.use(authenticateToken);

// Location management routes
router.put('/location', (req, res) => void locationController.upsertMyLocation(req, res));

export default router;