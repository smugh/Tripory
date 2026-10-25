import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { MediaFile, SaveMediaInput } from './media-types';
import { generateId } from '@/core/utils/id';
import { logger } from '@/core/utils/logger';
import { APP_CONFIG } from '@/core/constants';

let ImageManipulatorModule: typeof import('expo-image-manipulator') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ImageManipulatorModule = require('expo-image-manipulator');
} catch (error) {
  logger.warn('Modul native ExpoImageManipulator tidak tersedia, fallback ke FileSystem', {
    category: 'media',
    error: error instanceof Error ? error.message : String(error),
  });
}

class MediaService {
  private baseDir: string;

  constructor() {
    this.baseDir = `${FileSystem.documentDirectory ?? ''}${APP_CONFIG.storageMediaDir}/`;
  }

  private async ensureDirectoryExists(): Promise<void> {
    if (!FileSystem.documentDirectory) return;
    const dirInfo = await FileSystem.getInfoAsync(this.baseDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.baseDir, { intermediates: true });
      logger.info('Direktori penyimpanan media Tripory dibuat.', { category: 'media' });
    }
  }

  /**
   * Meminta izin akses kamera
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      const granted = status === 'granted';
      logger.info(`Izin kamera: ${granted ? 'DIBERIKAN' : 'DITOLAK'}`, { category: 'media' });
      return granted;
    } catch (error) {
      logger.error('Gagal meminta izin kamera', {
        category: 'media',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Meminta izin akses galeri foto
   */
  async requestGalleryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const granted = status === 'granted';
      logger.info(`Izin galeri foto: ${granted ? 'DIBERIKAN' : 'DITOLAK'}`, { category: 'media' });
      return granted;
    } catch (error) {
      logger.error('Gagal meminta izin galeri foto', {
        category: 'media',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Mengambil gambar langsung menggunakan kamera perangkat dan menyimpannya secara lokal.
   * Dikonversi ke ukuran/size paling rendah untuk hemat storage.
   */
  async takePhoto(): Promise<MediaFile | null> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.2, // Konversi ke size paling rendah
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return await this.savePhoto({
        sourceUri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (error) {
      logger.error('Gagal mengambil gambar dengan kamera', {
        category: 'media',
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Memilih gambar dari galeri perangkat dan menyimpannya ke storage persisten lokal.
   * Dikonversi ke ukuran/size paling rendah untuk hemat storage.
   */
  async pickImageFromGallery(): Promise<MediaFile | null> {
    const hasPermission = await this.requestGalleryPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.2, // Konversi ke size paling rendah
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return await this.savePhoto({
        sourceUri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (error) {
      logger.error('Gagal memilih foto dari galeri', {
        category: 'media',
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Menyimpan foto dari temporary picker/kamera ke storage aplikasi lokal persisten.
   * Dikonversi dan dikompresi ke dimensi & resolusi paling rendah (640px max, compress 0.2).
   */
  async savePhoto(input: SaveMediaInput): Promise<MediaFile> {
    await this.ensureDirectoryExists();

    const mediaId = generateId('img');
    const relativePath = `${APP_CONFIG.storageMediaDir}/${mediaId}.jpg`;
    const destinationUri = `${FileSystem.documentDirectory ?? ''}${relativePath}`;

    if (ImageManipulatorModule?.ImageManipulator) {
      const context = ImageManipulatorModule.ImageManipulator.manipulate(input.sourceUri, { maxWidth: 640, maxHeight: 640 });
      let renderedImage: Awaited<ReturnType<typeof context.renderAsync>> | null = null;

      try {
        renderedImage = await context.renderAsync();
        const compressedImage = await renderedImage.saveAsync({
          format: ImageManipulatorModule.SaveFormat.JPEG,
          compress: 0.2, // Kompresi paling rendah untuk ukuran file minimal
        });

        if (FileSystem.documentDirectory) {
          await FileSystem.moveAsync({ from: compressedImage.uri, to: destinationUri });
        }

        const savedUri = FileSystem.documentDirectory ? destinationUri : compressedImage.uri;
        const info = await FileSystem.getInfoAsync(savedUri);
        const media: MediaFile = {
          id: mediaId,
          relativePath,
          fullUri: savedUri,
          sizeBytes: info.exists && 'size' in info ? (info as { size?: number }).size : undefined,
          mimeType: 'image/jpeg',
          createdAt: new Date().toISOString(),
        };

        logger.info(`Foto dikompresi dan disimpan: ${relativePath}`, {
          category: 'media',
        });
        return media;
      } finally {
        renderedImage?.release();
        context.release();
      }
    } else {
      if (FileSystem.documentDirectory) {
        await FileSystem.copyAsync({ from: input.sourceUri, to: destinationUri });
      }
      const savedUri = FileSystem.documentDirectory ? destinationUri : input.sourceUri;
      const info = await FileSystem.getInfoAsync(savedUri);
      const media: MediaFile = {
        id: mediaId,
        relativePath,
        fullUri: savedUri,
        sizeBytes: info.exists && 'size' in info ? (info as { size?: number }).size : undefined,
        mimeType: 'image/jpeg',
        createdAt: new Date().toISOString(),
      };

      logger.info(`Foto disimpan tanpa kompresi manipulator: ${relativePath}`, {
        category: 'media',
      });
      return media;
    }
  }

  isManagedPhotoUri(uri: string): boolean {
    return Boolean(FileSystem.documentDirectory && uri.startsWith(`${FileSystem.documentDirectory}${APP_CONFIG.storageMediaDir}/`));
  }

  async deletePhotoByUri(uri: string): Promise<void> {
    if (!this.isManagedPhotoUri(uri) || !FileSystem.documentDirectory) return;
    const relativePath = uri.slice(FileSystem.documentDirectory.length);
    await this.deletePhoto(relativePath);
  }

  /**
   * Memvalidasi keberadaan file di storage lokal sebelum ditampilkan.
   */
  async fileExists(relativePath: string): Promise<boolean> {
    if (!FileSystem.documentDirectory) return false;
    const fullUri = `${FileSystem.documentDirectory}${relativePath}`;
    const info = await FileSystem.getInfoAsync(fullUri);
    return info.exists;
  }

  /**
   * Menghapus file foto lokal dengan aman
   */
  async deletePhoto(relativePath: string): Promise<void> {
    if (!FileSystem.documentDirectory) return;
    const fullUri = `${FileSystem.documentDirectory}${relativePath}`;
    const info = await FileSystem.getInfoAsync(fullUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fullUri, { idempotent: true });
      logger.info(`Foto lokal dihapus: ${relativePath}`, { category: 'media' });
    }
  }
}

export const mediaService = new MediaService();
