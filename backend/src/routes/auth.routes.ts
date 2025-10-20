import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { 
  AuthenticateUserRequest, 
  SignUpUserRequest,
  authenticateUserSchema,
  signUpUserSchema 
} from '../types/auth.types';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();
const authController = new AuthController();

router.post(
  '/signup',
  validateBody<SignUpUserRequest>(signUpUserSchema),
  authController.signUp
);

router.post(
  '/signin',
  validateBody(authenticateUserSchema),
  authController.signIn
);

router.post(
  '/check',
  validateBody(authenticateUserSchema),
  authController.checkGoogleAccount
);

export default router;
