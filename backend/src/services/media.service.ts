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

  static async deleteAllUserImages(userId: string): Promise<void> {
    try {
      if (!fs.existsSync(IMAGES_DIR)) {
        return;
      }

      const files = fs.readdirSync(IMAGES_DIR);
      const userFiles = files.filter(file => file.startsWith(`${userId}-`));

      for (const file of userFiles) {
        const filePath = path.join(IMAGES_DIR, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      // Log error but don't throw - deletion of images shouldn't block user deletion
      console.error(`Failed to delete images for user ${userId}:`, error);
    }
  }
}