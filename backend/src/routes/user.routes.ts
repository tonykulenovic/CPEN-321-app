import { Router } from 'express';

import { UserController } from '../controllers/user.controller';
import { UpdateProfileRequest, updateProfileSchema } from '../types/user.types';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();
const userController = new UserController();

// Existing routes
router.get('/profile', userController.getProfile);

router.post(
  '/profile',
  validateBody<UpdateProfileRequest>(updateProfileSchema),
  userController.updateProfile
);

router.delete('/profile', userController.deleteProfile);

// New friends-related routes
router.get('/search', userController.searchUsers);
router.get('/me', userController.getMe);
router.patch('/me/privacy', userController.updatePrivacy);

// Admin routes
router.get('/admin/all', userController.getAllUsers);
router.patch('/admin/:id/suspend', userController.suspendUser);
router.patch('/admin/:id/unsuspend', userController.unsuspendUser);
router.delete('/admin/:id', userController.deleteUserByAdmin);

export default router;
