import fs from 'fs';
import path from 'path';
import { jest, describe, test, beforeEach, afterEach, expect } from '@jest/globals';

import { MediaService } from '../../src/services/media.service';

describe('Unmocked: MediaService Unit Tests', () => {
  const TEST_IMAGES_DIR = 'uploads/test-images';
  const TEST_USER_ID = '507f1f77bcf86cd799439011';
  
  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    if (!fs.existsSync(TEST_IMAGES_DIR)) {
      fs.mkdirSync(TEST_IMAGES_DIR);
    }
    // Create destination images directory if it doesn't exist
    if (!fs.existsSync('uploads/images')) {
      fs.mkdirSync('uploads/images', { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files and directories
    try {
      if (fs.existsSync(TEST_IMAGES_DIR)) {
        const files = fs.readdirSync(TEST_IMAGES_DIR);
        files.forEach(file => {
          fs.unlinkSync(path.join(TEST_IMAGES_DIR, file));
        });
        fs.rmdirSync(TEST_IMAGES_DIR);
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clean up images directory
    try {
      if (fs.existsSync('uploads/images')) {
        const files = fs.readdirSync('uploads/images');
        files.forEach(file => {
          fs.unlinkSync(path.join('uploads/images', file));
        });
        // Don't remove the directory as other tests might need it
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('saveImage method', () => {
    // Test case: Successfully saves an image file
    // Input: valid file path and user ID
    // Expected behavior: moves file to images directory with timestamped name
    // Expected output: returns new file path with forward slashes
    test('Successfully saves image file', async () => {
      // Create a test source file
      const sourceFile = path.join(TEST_IMAGES_DIR, 'source.jpg');
      fs.writeFileSync(sourceFile, 'fake-image-data');

      // Mock Date.now() for predictable filename
      const mockTimestamp = 1234567890;
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockTimestamp);

      const result = await MediaService.saveImage(sourceFile, TEST_USER_ID);

      // Expected filename: userId-timestamp.extension
      const expectedFileName = `${TEST_USER_ID}-${mockTimestamp}.jpg`;
      const expectedPath = `uploads/images/${expectedFileName}`;

      expect(result).toBe(expectedPath);

      // Check that file was moved to correct location
      const newFilePath = path.join('uploads/images', expectedFileName);
      expect(fs.existsSync(newFilePath)).toBe(true);
      expect(fs.readFileSync(newFilePath, 'utf8')).toBe('fake-image-data');

      // Original file should no longer exist
      expect(fs.existsSync(sourceFile)).toBe(false);

      // Clean up and restore Date.now
      fs.unlinkSync(newFilePath);
      Date.now = originalDateNow;
    });

    // Test case: Handles file operation errors
    // Input: non-existent source file path
    // Expected behavior: throws error with descriptive message
    // Expected output: error thrown, no files created
    test('Throws error when source file does not exist', async () => {
      const nonExistentFile = path.join(TEST_IMAGES_DIR, 'nonexistent.jpg');

      await expect(MediaService.saveImage(nonExistentFile, TEST_USER_ID))
        .rejects
        .toThrow(/Failed to save profile picture:/);
    });

    // Test case: Cleans up source file on error
    // Input: valid source file but invalid destination (simulate disk full)
    // Expected behavior: removes source file and throws error
    // Expected output: source file deleted, error thrown
    test('Cleans up source file when save operation fails', async () => {
      const sourceFile = path.join(TEST_IMAGES_DIR, 'cleanup-test.jpg');
      fs.writeFileSync(sourceFile, 'test-data');

      // Mock fs.renameSync to throw an error
      const originalRenameSync = fs.renameSync;
      fs.renameSync = jest.fn(() => {
        throw new Error('Simulated disk error');
      });

      await expect(MediaService.saveImage(sourceFile, TEST_USER_ID))
        .rejects
        .toThrow(/Failed to save profile picture:/);

      // Source file should be cleaned up
      expect(fs.existsSync(sourceFile)).toBe(false);

      // Restore original function
      fs.renameSync = originalRenameSync;
    });

    // Test case: Handles file extensions correctly
    // Input: file with different extensions (.png, .gif, etc.)
    // Expected behavior: preserves original file extension
    // Expected output: new filename maintains correct extension
    test('Preserves file extension correctly', async () => {
      const extensions = ['.png', '.gif', '.webp', '.jpeg'];
      
      for (const ext of extensions) {
        const sourceFile = path.join(TEST_IMAGES_DIR, `test${ext}`);
        fs.writeFileSync(sourceFile, 'test-data');

        const result = await MediaService.saveImage(sourceFile, TEST_USER_ID);
        
        // Check that the result path contains the correct extension
        expect(result).toContain(ext);
        expect(result).toContain(TEST_USER_ID);
        expect(result.startsWith('uploads/images/')).toBe(true);

        // Clean up
        const resultPath = path.join(process.cwd(), result);
        if (fs.existsSync(resultPath)) {
          fs.unlinkSync(resultPath);
        }
      }
    });
  });

  describe('deleteImage method', () => {
    // Test case: Successfully deletes existing image
    // Input: valid image URL in uploads/images directory
    // Expected behavior: removes file from filesystem
    // Expected output: file no longer exists
    test('Successfully deletes existing image', async () => {
      const fileName = 'test-delete.jpg';
      const imagePath = path.join('uploads/images', fileName);
      const imageUrl = `uploads/images/${fileName}`;

      // Create images directory and test file
      if (!fs.existsSync('uploads/images')) {
        fs.mkdirSync('uploads/images', { recursive: true });
      }
      fs.writeFileSync(imagePath, 'test-image-data');

      // Verify file exists before deletion
      expect(fs.existsSync(imagePath)).toBe(true);

      await MediaService.deleteImage(imageUrl);

      expect(fs.existsSync(imagePath)).toBe(false);
    });

    // Test case: Handles non-existent files gracefully
    // Input: URL pointing to non-existent file
    // Expected behavior: does not throw error
    // Expected output: method completes successfully
    test('Handles non-existent file gracefully', async () => {
      const nonExistentUrl = 'uploads/images/nonexistent.jpg';

      // Should not throw an error
      await expect(MediaService.deleteImage(nonExistentUrl))
        .resolves
        .not.toThrow();
    });

    // Test case: Ignores URLs outside uploads/images directory
    // Input: URL not starting with 'uploads/images'
    // Expected behavior: does nothing (security measure)
    // Expected output: no files affected
    test('Ignores URLs outside uploads/images directory', async () => {
      const outsideUrl = 'some/other/path/image.jpg';
      const testFile = 'some_test_file.txt';
      
      // Create a file that shouldn't be deleted
      fs.writeFileSync(testFile, 'should not be deleted');

      await MediaService.deleteImage(outsideUrl);

      // File should still exist
      expect(fs.existsSync(testFile)).toBe(true);

      // Clean up
      fs.unlinkSync(testFile);
    });

    // Test case: Handles file system errors gracefully
    // Input: valid URL but file system error occurs
    // Expected behavior: logs error but doesn't throw
    // Expected output: error logged, method completes
    test('Handles file system errors gracefully', async () => {
      const imageUrl = 'uploads/images/protected.jpg';
      
      // Mock console.error to capture error logging
      const originalConsoleError = console.error;
      const mockConsoleError = jest.fn();
      console.error = mockConsoleError;

      // Mock fs.unlinkSync to throw an error
      const originalUnlinkSync = fs.unlinkSync;
      fs.unlinkSync = jest.fn(() => {
        throw new Error('Permission denied');
      });

      // Create images directory and file
      if (!fs.existsSync('uploads/images')) {
        fs.mkdirSync('uploads/images', { recursive: true });
      }
      fs.writeFileSync(path.join('uploads/images', 'protected.jpg'), 'test');

      await MediaService.deleteImage(imageUrl);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to delete old profile picture:',
        expect.any(Error)
      );

      // Restore original functions
      console.error = originalConsoleError;
      fs.unlinkSync = originalUnlinkSync;

      // Clean up
      try {
        fs.unlinkSync(path.join('uploads/images', 'protected.jpg'));
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  });

  describe('deleteAllUserImages method', () => {
    // Test case: Successfully deletes all user images
    // Input: user ID with multiple images in directory
    // Expected behavior: removes only files starting with userId prefix
    // Expected output: user files deleted, other files preserved
    test('Successfully deletes all user images', async () => {
      const userId = TEST_USER_ID;
      const otherUserId = '507f1f77bcf86cd799439999';
      
      // Create images directory and test files
      if (!fs.existsSync('uploads/images')) {
        fs.mkdirSync('uploads/images', { recursive: true });
      }

      const userFile1 = path.join('uploads/images', `${userId}-1234567890.jpg`);
      const userFile2 = path.join('uploads/images', `${userId}-9876543210.png`);
      const otherUserFile = path.join('uploads/images', `${otherUserId}-1111111111.jpg`);
      const systemFile = path.join('uploads/images', 'system-default.jpg');

      fs.writeFileSync(userFile1, 'user-image-1');
      fs.writeFileSync(userFile2, 'user-image-2');
      fs.writeFileSync(otherUserFile, 'other-user-image');
      fs.writeFileSync(systemFile, 'system-image');

      await MediaService.deleteAllUserImages(userId);

      // User's files should be deleted
      expect(fs.existsSync(userFile1)).toBe(false);
      expect(fs.existsSync(userFile2)).toBe(false);

      // Other files should remain
      expect(fs.existsSync(otherUserFile)).toBe(true);
      expect(fs.existsSync(systemFile)).toBe(true);

      // Clean up remaining files
      fs.unlinkSync(otherUserFile);
      fs.unlinkSync(systemFile);
    });

    // Test case: Handles non-existent images directory
    // Input: user ID when images directory doesn't exist
    // Expected behavior: returns early without error
    // Expected output: no errors thrown, method completes
    test('Handles non-existent images directory', async () => {
      // Ensure images directory doesn't exist
      const imagesDir = 'uploads/images';
      if (fs.existsSync(imagesDir)) {
        const files = fs.readdirSync(imagesDir);
        files.forEach(file => fs.unlinkSync(path.join(imagesDir, file)));
        fs.rmdirSync(imagesDir);
      }

      // Should not throw an error
      await expect(MediaService.deleteAllUserImages(TEST_USER_ID))
        .resolves
        .not.toThrow();
    });

    // Test case: Handles empty images directory
    // Input: user ID when images directory exists but is empty
    // Expected behavior: completes successfully without errors
    // Expected output: no errors thrown
    test('Handles empty images directory', async () => {
      // Create empty images directory
      if (!fs.existsSync('uploads/images')) {
        fs.mkdirSync('uploads/images', { recursive: true });
      }

      await expect(MediaService.deleteAllUserImages(TEST_USER_ID))
        .resolves
        .not.toThrow();
    });

    // Test case: Handles file system errors gracefully
    // Input: user ID with files, but deleteImage throws errors
    // Expected behavior: logs errors but continues processing
    // Expected output: errors logged, method completes
    test('Handles file system errors gracefully', async () => {
      const userId = TEST_USER_ID;

      // Create images directory and test file
      if (!fs.existsSync('uploads/images')) {
        fs.mkdirSync('uploads/images', { recursive: true });
      }
      const userFile = path.join('uploads/images', `${userId}-1234567890.jpg`);
      fs.writeFileSync(userFile, 'test-data');

      // Mock console.error to capture error logging
      const originalConsoleError = console.error;
      const mockConsoleError = jest.fn();
      console.error = mockConsoleError;

      // Mock fs.unlinkSync to throw an error (simulating file system errors)
      const originalUnlinkSync = fs.unlinkSync;
      fs.unlinkSync = jest.fn(() => {
        throw new Error('Permission denied');
      });

      await MediaService.deleteAllUserImages(userId);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to delete old profile picture:',
        expect.any(Error)
      );

      // Restore original functions
      console.error = originalConsoleError;
      fs.unlinkSync = originalUnlinkSync;

      // Clean up - try to remove the file manually
      if (fs.existsSync(userFile)) {
        try {
          originalUnlinkSync(userFile);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
});