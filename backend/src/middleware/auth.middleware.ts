import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { userModel } from '../models/user.model';

export const authenticateToken: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
      return;
    }

    // Development bypass with dev token
    const devToken = process.env.DEV_AUTH_TOKEN;
    const devUserId = req.headers['x-dev-user-id'] as string;
    
    if (devToken && token === devToken && devUserId && process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Using dev token bypass for user ID: ${devUserId}`);
      
      if (!mongoose.Types.ObjectId.isValid(devUserId)) {
        res.status(400).json({
          error: 'Invalid dev user ID',
          message: 'x-dev-user-id header must be a valid ObjectId',
        });
        return;
      }

      const user = await userModel.findById(new mongoose.Types.ObjectId(devUserId));
      if (!user) {
        res.status(404).json({
          error: 'Dev user not found',
          message: 'User specified in x-dev-user-id header does not exist',
        });
        return;
      }

      req.user = user;
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: mongoose.Types.ObjectId;
    };

    if (!decoded?.id) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token verification failed',
      });
      return;
    }

    const user = await userModel.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'Token is valid but user no longer exists',
      });
      return;
    }

    // Check if user is suspended
    if (user.isSuspended) {
      res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support for assistance.',
      });
      return;
    }

    req.user = user;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed or expired',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token expired',
        message: 'Please login again',
      });
      return;
    }

    next(error);
  }
};
