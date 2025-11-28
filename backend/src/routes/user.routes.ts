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
  (req, res, next) => {
    userController.updateProfile(req, res, next).catch(() => {});
  }
);

router.delete('/profile', (req, res, next) => {
  userController.deleteProfile(req, res, next).catch(() => {});
});

// New friends-related routes
router.get('/search', (req, res) => {
  userController.searchUsers(req, res).catch(() => {});
});
router.get('/me', (req, res) => { userController.getMe(req, res); });
router.patch('/me/privacy', (req, res) => {
  userController.updatePrivacy(req, res).catch(() => {});
});

// FCM token management for push notifications
router.put('/me/fcm-token', (req, res) => {
  userController.updateFcmToken(req, res).catch(() => {});
});
router.delete('/me/fcm-token', (req, res) => {
  userController.removeFcmToken(req, res).catch(() => {});
});

// Get friend's profile
router.get('/:userId/profile', (req, res, next) => {
  userController.getUserProfile(req, res, next).catch(() => {});
});

// Admin routes
router.get('/admin/all', (req, res, next) => {
  userController.getAllUsers(req, res, next).catch(() => {});
});
router.patch('/admin/:id/suspend', (req, res, next) => {
  userController.suspendUser(req, res, next).catch(() => {});
});
router.patch('/admin/:id/unsuspend', (req, res, next) => {
  userController.unsuspendUser(req, res, next).catch(() => {});
});
router.delete('/admin/:id', (req, res, next) => {
  userController.deleteUserByAdmin(req, res, next).catch(() => {});
});

export default router;
