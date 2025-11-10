import { NextFunction, Request, Response } from 'express';

import logger from '../utils/logger.util';
import { MediaService } from '../services/media.service';
import { UploadImageRequest, UploadImageResponse } from '../types/media.types';
import { sanitizeInput } from '../utils/sanitizeInput.util';
import { userModel } from '../models/user.model'; // Add this import

export class MediaController {
  async uploadImage(
    req: Request<unknown, unknown, UploadImageRequest>,
    res: Response<UploadImageResponse>,
    next: NextFunction
  ) {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'No file uploaded',
        });
      }

      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const sanitizedFilePath = sanitizeInput(req.file.path);
      const image = await MediaService.saveImage(
        sanitizedFilePath,
        user._id.toString()
      );

      // Update the user's profilePicture in the database
      const updatedUser = await userModel.update(user._id, {
        profilePicture: image,
      });

      if (!updatedUser) {
        logger.error('Failed to update user profile picture in database');
        return res.status(500).json({
          message: 'Failed to update profile picture in database',
        });
      }

      logger.info(`Profile picture updated for user ${user._id.toString()}: ${image}`);

      res.status(200).json({
        message: 'Image uploaded successfully',
        data: {
          image,
        },
      });
    } catch (error) {
      logger.error('Error uploading profile picture:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message ?? 'Failed to upload profile picture',
        });
      }

      next(error);
    }
  }
}
