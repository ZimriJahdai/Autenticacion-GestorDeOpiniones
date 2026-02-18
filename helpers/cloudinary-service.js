import { v2 as cloudinary } from 'cloudinary';
import { config } from '../configs/config.js';
import fs from 'fs/promises';
import path from 'path';

// FIX: Bypass SSL (Cloudinary, etc.)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const uploadImage = async (filePath, fileName) => {
  try {
    if (!filePath) throw new Error('No file path provided to uploadImage');

    // Resolve absolute path and normalize (fixes Windows backslashes)
    const resolvedPath = path.resolve(filePath);
    const normalizedLocalPath = resolvedPath.replace(/\\/g, '/');

    // Ensure file exists before attempting upload
    await fs.access(resolvedPath);

    const folder = config.cloudinary.folder;
    const options = {
      public_id: fileName,
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    };

    const result = await cloudinary.uploader.upload(normalizedLocalPath, options);

    if (result.error) {
      throw new Error(`Error uploading image: ${result.error.message}`);
    }

    // Try to remove the local temporary file after successful upload
    try {
      await fs.unlink(resolvedPath);
    } catch (unlinkErr) {
      console.warn('Could not delete local file after upload:', unlinkErr.message || unlinkErr);
    }

    return fileName;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error?.stack || error?.message || error);
    // Archivo local se mantiene en uploads/
    throw new Error(
      `Failed to upload image to Cloudinary: ${error?.message || ''}`
    );
  }
};

export const deleteImage = async (imagePath) => {
  try {
    if (!imagePath || imagePath === config.cloudinary.defaultAvatarPath) {
      return true;
    }

    const folder = config.cloudinary.folder;
    const publicId = imagePath.includes('/')
      ? imagePath
      : `${folder}/${imagePath}`;
    const result = await cloudinary.uploader.destroy(publicId);

    return result.result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

export const getFullImageUrl = (imagePath) => {
  if (!imagePath) {
    return getDefaultAvatarUrl();
  }

  const baseUrl = config.cloudinary.baseUrl;
  const folder = config.cloudinary.folder;

  const pathToUse = !imagePath
    ? config.cloudinary.defaultAvatarPath
    : imagePath.includes('/')
      ? imagePath
      : `${folder}/${imagePath}`;

  return `${baseUrl}${pathToUse}`;
};

export const getDefaultAvatarUrl = () => {
  const defaultPath = config.cloudinary.defaultAvatarPath;
  return getFullImageUrl(defaultPath);
};

export const getDefaultAvatarPath = () => {
  const defaultPath = config.cloudinary.defaultAvatarPath;
  // If dotenv didn't expand nested vars, build from env pieces
  if (defaultPath && defaultPath.includes('${')) {
    const folder = process.env.CLOUDINARY_FOLDER;
    const filename = process.env.CLOUDINARY_DEFAULT_AVATAR_FILENAME;
    if (folder || filename) {
      return [folder, filename].filter(Boolean).join('/');
    }
  }
  if (defaultPath && defaultPath.includes('/')) {
    return defaultPath.split('/').pop();
  }
  return defaultPath;
};

export default {
  uploadImage,
  deleteImage,
  getFullImageUrl,
  getDefaultAvatarUrl,
  getDefaultAvatarPath,
};
