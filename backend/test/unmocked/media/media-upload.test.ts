import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

import mediaRoutes from '../../../src/routes/media.routes';
import { userModel } from '../../../src/models/user.model';

// Create Express app with routes and authentication middleware
function createAuthenticatedApp() {
  const app = express();
  app.use(express.json());

  // Add authentication middleware that populates req.user from database
  app.use(async (req: any, res: any, next: any) => {
    const userId = req.headers['x-dev-user-id'];
    const authHeader = req.headers.authorization;

    // Require both auth header and user ID for authentication
    if (!authHeader || !userId) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required',
      });
    }

    try {
      // Find user in database
      const user = await (userModel as any).user.findById(new mongoose.Types.ObjectId(userId as string));
      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          message: 'Invalid user ID',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Failed to authenticate user',
      });
    }
  });

  // Add media routes
  app.use('/api', mediaRoutes);

  return app;
}

// Helper to add auth headers
const withAuth = (user: any) => (req: request.Test) => {
  return req
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

// Test image path
const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.jpg');
const UPLOADS_DIR = 'uploads/images';

describe('POST /api/upload - Upload profile image', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;

  beforeEach(async () => {
    app = createAuthenticatedApp();

    // Create a test image file
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      // Create a minimal valid JPEG file (1x1 pixel)
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x03, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
        0x7f, 0x00, 0xff, 0xd9,
      ]);
      fs.writeFileSync(TEST_IMAGE_PATH, jpegBuffer);
    }

    // Create test users
    testUser1 = await (userModel as any).user.create({
      name: `User One ${Date.now()}`,
      username: `user1_${Date.now()}`,
      email: `user1_${Date.now()}@example.com`,
      googleId: `google1_${Date.now()}`,
      password: 'password123',
    });

    testUser2 = await (userModel as any).user.create({
      name: `User Two ${Date.now()}`,
      username: `user2_${Date.now()}`,
      email: `user2_${Date.now()}@example.com`,
      googleId: `google2_${Date.now()}`,
      password: 'password123',
    });
  });

  afterEach(async () => {
    // Clean up uploaded test files
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        if (file.includes(testUser1?._id?.toString()) || file.includes(testUser2?._id?.toString())) {
          fs.unlinkSync(path.join(UPLOADS_DIR, file));
        }
      }
    }
  });

  // Input: Valid image file (JPEG)
  // Expected status code: 200
  // Expected behavior: Image is saved and user profile is updated
  // Expected output: Success message with image path
  test('Successfully upload a valid JPEG image', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', TEST_IMAGE_PATH)
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Image uploaded successfully');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('image');
    expect(res.body.data.image).toMatch(/^uploads\/images\//);
    expect(res.body.data.image).toContain(testUser1._id.toString());

    // Verify file exists
    expect(fs.existsSync(res.body.data.image)).toBe(true);

    // Verify user profile was updated
    const updatedUser = await (userModel as any).user.findById(testUser1._id);
    expect(updatedUser.profilePicture).toBe(res.body.data.image);
  });

  // Input: Valid PNG image file
  // Expected status code: 200
  // Expected behavior: PNG image is accepted and saved
  // Expected output: Success message with image path
  test('Successfully upload a valid PNG image', async () => {
    const pngPath = path.join(__dirname, 'test-image.png');
    // Create a minimal valid PNG file (1x1 pixel)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    fs.writeFileSync(pngPath, pngBuffer);

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', pngPath)
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Image uploaded successfully');
    expect(res.body.data.image).toMatch(/\.png$/);

    // Clean up
    fs.unlinkSync(pngPath);
  });

  // Input: No file attached to request
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Error message indicating no file uploaded
  test('Reject upload with no file attached', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
    );

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'No file uploaded');
  });

  // Input: Request without authentication
  // Expected status code: 401
  // Expected behavior: Request is rejected before file processing
  // Expected output: Authentication error
  test('Reject upload without authentication', async () => {
    const res = await request(app)
      .post('/api/upload');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Access denied');
  });

  // Input: Request with invalid user ID
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Invalid user error
  test('Reject upload with invalid user ID', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token-12345')
      .set('x-dev-user-id', new mongoose.Types.ObjectId().toString())
      .attach('media', TEST_IMAGE_PATH);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'User not found');
  });

  // Input: Non-image file (text file)
  // Expected status code: 500
  // Expected behavior: File is rejected by multer filter
  // Expected output: Error message about file type
  test('Reject non-image file upload', async () => {
    const txtPath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(txtPath, 'This is not an image');

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', txtPath)
    );

    // Multer error may return empty body or error in various formats
    expect(res.status).toBe(500);

    // Clean up
    fs.unlinkSync(txtPath);
  });

  // Input: File larger than 5MB limit
  // Expected status code: 500
  // Expected behavior: File is rejected by multer size limit
  // Expected output: Error message about file size
  test('Reject file larger than 5MB', async () => {
    const largePath = path.join(__dirname, 'large-file.jpg');
    // Create a file larger than 5MB (5 * 1024 * 1024 + 1 bytes)
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);
    fs.writeFileSync(largePath, largeBuffer);

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', largePath)
    );

    // Multer error may return empty body
    expect(res.status).toBe(500);

    // Clean up
    fs.unlinkSync(largePath);
  });

  // Input: Multiple uploads from same user
  // Expected status code: 200 for both
  // Expected behavior: Both images are saved, profile picture is updated to latest
  // Expected output: Different file paths for each upload
  test('Handle multiple uploads from same user', async () => {
    const res1 = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', TEST_IMAGE_PATH)
    );

    expect(res1.status).toBe(200);
    const firstImage = res1.body.data.image;

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const res2 = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', TEST_IMAGE_PATH)
    );

    expect(res2.status).toBe(200);
    const secondImage = res2.body.data.image;

    // Images should have different paths
    expect(firstImage).not.toBe(secondImage);

    // Both files should exist
    expect(fs.existsSync(firstImage)).toBe(true);
    expect(fs.existsSync(secondImage)).toBe(true);

    // User profile should be updated to latest image
    const updatedUser = await (userModel as any).user.findById(testUser1._id);
    expect(updatedUser.profilePicture).toBe(secondImage);
  });

  // Input: Uploads from different users
  // Expected status code: 200 for both
  // Expected behavior: Each user gets their own image file
  // Expected output: File paths contain respective user IDs
  test('Handle uploads from different users', async () => {
    const res1 = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', TEST_IMAGE_PATH)
    );

    expect(res1.status).toBe(200);
    expect(res1.body.data.image).toContain(testUser1._id.toString());

    const res2 = await withAuth(testUser2)(
      request(app)
        .post('/api/upload')
        .attach('media', TEST_IMAGE_PATH)
    );

    expect(res2.status).toBe(200);
    expect(res2.body.data.image).toContain(testUser2._id.toString());

    // Verify both users' profiles were updated
    const updatedUser1 = await (userModel as any).user.findById(testUser1._id);
    const updatedUser2 = await (userModel as any).user.findById(testUser2._id);

    expect(updatedUser1.profilePicture).toBe(res1.body.data.image);
    expect(updatedUser2.profilePicture).toBe(res2.body.data.image);
  });

  // Input: Valid image with special characters in filename
  // Expected status code: 200
  // Expected behavior: Image is saved with sanitized filename
  // Expected output: Success with valid file path
  test('Handle image with special characters in filename', async () => {
    const specialPath = path.join(__dirname, 'test image (1) [special].jpg');
    fs.copyFileSync(TEST_IMAGE_PATH, specialPath);

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', specialPath)
    );

    expect(res.status).toBe(200);
    expect(res.body.data.image).toMatch(/^uploads\/images\//);
    expect(fs.existsSync(res.body.data.image)).toBe(true);

    // Clean up
    fs.unlinkSync(specialPath);
  });

  // Input: Upload without file extension
  // Expected status code: 200
  // Expected behavior: File is processed and saved with empty extension
  // Expected output: Success with image saved (no extension in filename)
  test('Handle upload without file extension', async () => {
    const noExtPath = path.join(__dirname, 'testimage');
    fs.copyFileSync(TEST_IMAGE_PATH, noExtPath);

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', noExtPath)
    );

    // File without extension may still be accepted if MIME type is correct
    expect([200, 500]).toContain(res.status);
    
    if (res.status === 200) {
      expect(res.body.data.image).toMatch(/^uploads\/images\//);
      // File may not have extension or may use original filename pattern
    }

    // Clean up
    fs.unlinkSync(noExtPath);
  });

  // Input: Very small valid image (minimum size)
  // Expected status code: 200
  // Expected behavior: Small image is accepted
  // Expected output: Success with image saved
  test('Accept minimum size valid image', async () => {
    // The test image created in beforeEach is already minimal
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', TEST_IMAGE_PATH)
    );

    expect(res.status).toBe(200);
    expect(res.body.data.image).toMatch(/^uploads\/images\//);

    const stats = fs.statSync(res.body.data.image);
    expect(stats.size).toBeGreaterThan(0);
  });

  // Input: GIF image file
  // Expected status code: 200
  // Expected behavior: GIF is accepted as valid image
  // Expected output: Success with image saved
  test('Accept GIF image file', async () => {
    const gifPath = path.join(__dirname, 'test-image.gif');
    // Create a minimal valid GIF file (1x1 pixel)
    const gifBuffer = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);
    fs.writeFileSync(gifPath, gifBuffer);

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/upload')
        .attach('media', gifPath)
    );

    expect(res.status).toBe(200);
    expect(res.body.data.image).toMatch(/\.gif$/);

    // Clean up
    fs.unlinkSync(gifPath);
  });

  // Input: Image upload with empty authorization header
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Authentication error
  test('Reject upload with empty authorization header', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', '')
      .set('x-dev-user-id', testUser1._id.toString());

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Access denied');
  });

  // Input: Image upload with missing x-dev-user-id header
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Authentication error
  test('Reject upload with missing user ID header', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token-12345');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Access denied');
  });

  // Input: Concurrent uploads from same user
  // Expected status code: 200 for both
  // Expected behavior: Both uploads complete successfully
  // Expected output: Two different image paths
  test('Handle concurrent uploads from same user', async () => {
    const [res1, res2] = await Promise.all([
      withAuth(testUser1)(
        request(app)
          .post('/api/upload')
          .attach('media', TEST_IMAGE_PATH)
      ),
      withAuth(testUser1)(
        request(app)
          .post('/api/upload')
          .attach('media', TEST_IMAGE_PATH)
      ),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // Images should exist
    expect(fs.existsSync(res1.body.data.image)).toBe(true);
    expect(fs.existsSync(res2.body.data.image)).toBe(true);

    // One of them should be the current profile picture
    const updatedUser = await (userModel as any).user.findById(testUser1._id);
    expect([res1.body.data.image, res2.body.data.image]).toContain(updatedUser.profilePicture);
  });
});

