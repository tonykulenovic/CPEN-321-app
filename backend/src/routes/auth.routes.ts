import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { 
  authenticateUserSchema,
  signUpUserSchema 
} from '../types/auth.types';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();
const authController = new AuthController();

router.post(
  '/signin',
  validateBody(authenticateUserSchema),
  (req, res, next) => {
    authController.signIn(req, res, next).catch(() => {});
  }
);

router.post(
  '/signup',
  validateBody(signUpUserSchema),
  (req, res, next) => {
    authController.signUp(req, res, next).catch(() => {});
  }
);

router.post(
  '/check',
  validateBody(authenticateUserSchema),
  (req, res, next) => {
    authController.checkGoogleAccount(req, res, next).catch(() => {});
  }
);

export default router;
