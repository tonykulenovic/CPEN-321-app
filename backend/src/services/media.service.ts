/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'fs';
import path from 'path';

const IMAGES_DIR = 'uploads/images';

export class MediaService {
  static async saveImage(filePath: string, userId: string): Promise<string> {
    try {
      // Ensure the images directory exists
      if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
      }

      const fileExtension = path.extname(filePath);
      const fileName = `${userId}-${Date.now()}${fileExtension}`;
      const newPath = path.join(IMAGES_DIR, fileName);

      fs.renameSync(filePath, newPath);

      return newPath.split(path.sep).join('/');
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new Error(`Failed to save profile picture: ${String(error)}`);
    }
  }

  /**
   * Delete all images belonging to a user
   * Used when deleting a user account
   */
  static async deleteAllUserImages(userId: string): Promise<number> {
    try {
      // Ensure the images directory exists
      if (!fs.existsSync(IMAGES_DIR)) {
        return 0;
      }

      const files = fs.readdirSync(IMAGES_DIR);
      let deletedCount = 0;

      for (const file of files) {
        // Check if file belongs to this user (filename starts with userId)
        if (file.startsWith(`${userId}-`)) {
          const filePath = path.join(IMAGES_DIR, file);
          try {
            fs.unlinkSync(filePath);
            deletedCount++;
          } catch (error) {
            // Log but don't throw - continue deleting other files
            console.warn(`Failed to delete image ${file}:`, error);
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error(`Failed to delete user images for ${userId}:`, error);
      // Don't throw - image cleanup failure shouldn't block user deletion
      return 0;
    }
  }
}