import { Router } from 'express';
import { debugController } from '../controllers/debug.controller';

const router = Router();

// Test notification endpoints
router.post('/notification/test', (req, res) => void debugController.sendTestNotification(req, res));
router.post('/notification/friend-request', (req, res) => void debugController.sendTestFriendRequest(req, res));

// Debug user information
router.get('/users/tokens', (req, res) => void debugController.listUsersWithTokens(req, res));

export default router;