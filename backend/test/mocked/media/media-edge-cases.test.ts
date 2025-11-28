import fs from 'fs';

import { MediaController } from '../../../src/controllers/media.controller';
import { MediaService } from '../../../src/services/media.service';
import { userModel } from '../../../src/models/user.model';
import logger from '../../../src/utils/logger.util';

const mediaController = new MediaController();

describe('MediaController - Edge Cases (Mocked)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('uploadImage', () => {
    it('should return 401 when req.user is missing', async () => {
      const req = {
        file: {
          fieldname: 'media',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          path: '/tmp/test.jpg',
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      await mediaController.uploadImage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 400 when req.file is missing', async () => {
      const req = {
        user: { _id: { toString: () => 'mock-user-id' } },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      await mediaController.uploadImage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No file uploaded' });
    });

    it('should handle req.file.path being undefined (covers line 26 ?? branch)', async () => {
      jest.spyOn(MediaService, 'saveImage').mockResolvedValue('https://example.com/image.jpg');
      jest.spyOn(userModel, 'update').mockResolvedValue({
        _id: { toString: () => 'mock-user-id' },
        profilePicture: 'https://example.com/image.jpg',
      } as any);

      const req = {
        user: { _id: { toString: () => 'mock-user-id' } },
        file: {
          fieldname: 'media',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          path: undefined, // This triggers the ?? '' branch
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      await mediaController.uploadImage(req, res, next);

      expect(MediaService.saveImage).toHaveBeenCalledWith('', 'mock-user-id');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle error.message being empty/falsy (covers line 57 || branch)', async () => {
      jest.spyOn(MediaService, 'saveImage').mockRejectedValue(new Error(''));

      const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();

      const req = {
        user: { _id: { toString: () => 'mock-user-id' } },
        file: {
          fieldname: 'media',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          path: '/tmp/test.jpg',
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      await mediaController.uploadImage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to upload profile picture',
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle MediaService.saveImage error', async () => {
      jest.spyOn(MediaService, 'saveImage').mockRejectedValue(new Error('Storage error'));

      const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();

      const req = {
        user: { _id: { toString: () => 'mock-user-id' } },
        file: {
          fieldname: 'media',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          path: '/tmp/test.jpg',
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      await mediaController.uploadImage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Storage error' });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle userModel.update returning null', async () => {
      jest.spyOn(MediaService, 'saveImage').mockResolvedValue('https://example.com/image.jpg');
      jest.spyOn(userModel, 'update').mockResolvedValue(null);

      const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();

      const req = {
        user: { _id: { toString: () => 'mock-user-id' } },
        file: {
          fieldname: 'media',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          path: '/tmp/test.jpg',
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      await mediaController.uploadImage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to update profile picture in database',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update user profile picture in database');
    });

    it('should handle non-Error exceptions (covers line 61)', async () => {
      jest.spyOn(MediaService, 'saveImage').mockRejectedValue('string error');

      const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();

      const req = {
        user: { _id: { toString: () => 'mock-user-id' } },
        file: {
          fieldname: 'media',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          path: '/tmp/test.jpg',
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      await mediaController.uploadImage(req, res, next);

      expect(next).toHaveBeenCalledWith('string error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('MediaService.saveImage error handling', () => {
    it('should create directory if it does not exist (covers service line 12)', async () => {
      // Mock fs operations to trigger directory creation
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation();
      jest.spyOn(fs, 'renameSync').mockImplementation();
      jest.spyOn(userModel, 'update').mockResolvedValue({
        _id: { toString: () => 'mock-user-id' },
        profilePicture: 'uploads/images/test.jpg',
      } as any);

      const req = {
        user: { _id: { toString: () => 'mock-user-id' } },
        file: {
          fieldname: 'media',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          path: '/tmp/test.jpg',
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      await mediaController.uploadImage(req, res, next);

      // Verify directory creation was called
      expect(mkdirSyncSpy).toHaveBeenCalledWith('uploads/images', { recursive: true });
      
      // Verify success response
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should cleanup temp file on fs.renameSync failure (covers service lines 23-26)', async () => {
      // Mock fs operations to trigger error handler
      jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true).mockReturnValueOnce(true);
      jest.spyOn(fs, 'renameSync').mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device');
      });
      const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation();

      const req = {
        user: { _id: { toString: () => 'mock-user-id' } },
        file: {
          fieldname: 'media',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          path: '/tmp/test.jpg',
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();

      await mediaController.uploadImage(req, res, next);

      // Verify cleanup was attempted
      expect(unlinkSyncSpy).toHaveBeenCalledWith('/tmp/test.jpg');
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to save profile picture: Error: ENOSPC: no space left on device',
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should not cleanup temp file if it does not exist during error (covers service line 23 else branch)', async () => {
      // Mock fs operations: directory exists, but temp file is already gone when error occurs
      jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true).mockReturnValueOnce(false);
      jest.spyOn(fs, 'renameSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation();

      const req = {
        user: { _id: { toString: () => 'mock-user-id' } },
        file: {
          fieldname: 'media',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          path: '/tmp/test.jpg',
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const next = jest.fn();

      const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();

      await mediaController.uploadImage(req, res, next);

      // Verify cleanup was NOT attempted since file doesn't exist
      expect(unlinkSyncSpy).not.toHaveBeenCalled();
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to save profile picture: Error: Permission denied',
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
