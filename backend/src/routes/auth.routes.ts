import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { 
  SignUpUserRequest,
  authenticateUserSchema,
  signUpUserSchema 
} from '../types/auth.types';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();
const authController = new AuthController();

router.post(
  '/signin',
  validateBody(authenticateUserSchema),
  (req, res, next) => void authController.signIn(req, res, next)
);

router.post(
  '/signup',
  validateBody(signUpUserSchema),
  (req, res, next) => void authController.signUp(req, res, next)
);

router.post(
  '/check',
  validateBody(authenticateUserSchema),
  (req, res, next) => void authController.checkGoogleAccount(req, res, next)
);

export default router;
