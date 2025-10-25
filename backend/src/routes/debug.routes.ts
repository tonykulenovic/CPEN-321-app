import { Router } from 'express';
import { debugController } from '../controllers/debug.controller';

const router = Router();

// Test notification endpoints
router.post('/notification/test', debugController.sendTestNotification);
router.post('/notification/friend-request', debugController.sendTestFriendRequest);

// Debug user information
router.get('/users/tokens', debugController.listUsersWithTokens);

export default router;