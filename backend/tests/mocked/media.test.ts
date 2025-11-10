import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { jest, describe, test, beforeEach, afterEach, expect } from '@jest/globals';

import mediaRoutes from '../../src/routes/media.routes';
import { MediaService } from '../../src/services/media.service';
import { userModel } from '../../src/models/user.model';

// Mock all external dependencies
jest.mock('../../src/services/media.service');
jest.mock('../../src/models/user.model');
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req: unknown, res: unknown, next: any) => {
    req.user = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser'
    };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/media', mediaRoutes);

const mockMediaService = MediaService as jest.Mocked<typeof MediaService>;
const mockUserModel = userModel as jest.Mocked<typeof userModel>;

describe('Mocked: POST /media/upload', () => {
  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Ensure test image exists
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    if (!fs.existsSync(testImagePath)) {
      // Create a minimal test image file
      fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testImagePath)) {
      try {
        fs.unlinkSync(testImagePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  // Mocked behavior: MediaService.saveImage returns image path, userModel.update succeeds
  // Input: valid image file upload
  // Expected status code: 200
  // Expected behavior: uploads image and updates user profile
  // Expected output: success message with image path
  test('Upload image successfully', async () => {
    const mockImagePath = 'uploads/images/507f1f77bcf86cd799439011-1234567890.jpg';
    const mockUpdatedUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      profilePicture: mockImagePath
    };

    mockMediaService.saveImage.mockResolvedValue(mockImagePath);
    mockUserModel.update.mockResolvedValue(mockUpdatedUser);

    const response = await request(app)
      .post('/media/upload')
      .attach('media', testImagePath)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Image uploaded successfully',
      data: {
        image: mockImagePath
      }
    });

    expect(mockMediaService.saveImage).toHaveBeenCalledWith(
      expect.any(String),
      '507f1f77bcf86cd799439011'
    );
    expect(mockUserModel.update).toHaveBeenCalledWith(
      expect.any(mongoose.Types.ObjectId),
      { profilePicture: mockImagePath }
    );
  });

  // Mocked behavior: No file uploaded
  // Input: request without file attachment
  // Expected status code: 400
  // Expected behavior: returns error for missing file
  // Expected output: error message
  test('Upload fails without file', async () => {
    const response = await request(app)
      .post('/media/upload')
      .expect(400);

    expect(response.body).toEqual({
      message: 'No file uploaded'
    });

    expect(mockMediaService.saveImage).not.toHaveBeenCalled();
    expect(mockUserModel.update).not.toHaveBeenCalled();
  });

  // Mocked behavior: MediaService.saveImage succeeds but userModel.update fails
  // Input: valid image file upload
  // Expected status code: 500
  // Expected behavior: returns error for database update failure
  // Expected output: error message
  test('Upload fails when user update fails', async () => {
    const mockImagePath = 'uploads/images/507f1f77bcf86cd799439011-1234567890.jpg';

    mockMediaService.saveImage.mockResolvedValue(mockImagePath);
    mockUserModel.update.mockResolvedValue(null);

    const response = await request(app)
      .post('/media/upload')
      .attach('media', testImagePath)
      .expect(500);

    expect(response.body).toEqual({
      message: 'Failed to update profile picture in database'
    });

    expect(mockMediaService.saveImage).toHaveBeenCalled();
    expect(mockUserModel.update).toHaveBeenCalled();
  });

  // Mocked behavior: MediaService.saveImage throws error
  // Input: valid image file upload
  // Expected status code: 500
  // Expected behavior: handles MediaService error
  // Expected output: error message from MediaService
  test('Upload fails when MediaService throws error', async () => {
    const errorMessage = 'Failed to save profile picture: Storage error';
    
    mockMediaService.saveImage.mockRejectedValue(new Error(errorMessage));

    const response = await request(app)
      .post('/media/upload')
      .attach('media', testImagePath)
      .expect(500);

    expect(response.body).toEqual({
      message: errorMessage
    });

    expect(mockMediaService.saveImage).toHaveBeenCalled();
    expect(mockUserModel.update).not.toHaveBeenCalled();
  });
});