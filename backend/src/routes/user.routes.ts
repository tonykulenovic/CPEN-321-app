import { Router } from 'express';

import { UserController } from '../controllers/user.controller';
import { UpdateProfileRequest, updateProfileSchema } from '../types/user.types';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();
const userController = new UserController();

// Existing routes
router.get('/profile', (req, res) => userController.getProfile(req, res));

router.post(
  '/profile',
  validateBody<UpdateProfileRequest>(updateProfileSchema),
  (req, res, next) => void userController.updateProfile(req, res, next)
);

router.delete('/profile', (req, res, next) => void userController.deleteProfile(req, res, next));

// New friends-related routes
router.get('/search', (req, res) => void userController.searchUsers(req, res));
router.get('/me', (req, res) => { userController.getMe(req, res); });
router.patch('/me/privacy', (req, res) => void userController.updatePrivacy(req, res));

// FCM token management for push notifications
router.put('/me/fcm-token', (req, res) => void userController.updateFcmToken(req, res));
router.delete('/me/fcm-token', (req, res) => void userController.removeFcmToken(req, res));

// Get friend's profile
router.get('/:userId/profile', (req, res, next) => void userController.getUserProfile(req, res, next));

// Admin routes
router.get('/admin/all', (req, res, next) => void userController.getAllUsers(req, res, next));
router.patch('/admin/:id/suspend', (req, res, next) => void userController.suspendUser(req, res, next));
router.patch('/admin/:id/unsuspend', (req, res, next) => void userController.unsuspendUser(req, res, next));
router.delete('/admin/:id', (req, res, next) => void userController.deleteUserByAdmin(req, res, next));

export default router;
