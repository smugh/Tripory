import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { MediaFile, SaveMediaInput } from './media-types';
import { generateId } from '@/core/utils/id';
import { logger } from '@/core/utils/logger';
import { APP_CONFIG } from '@/core/constants';

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
   * Mengambil gambar langsung menggunakan kamera perangkat dan menyimpannya secara lokal
   */
  async takePhoto(): Promise<MediaFile | null> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
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
   * Memilih gambar dari galeri perangkat dan menyimpannya ke storage persisten lokal
   */
  async pickImageFromGallery(): Promise<MediaFile | null> {
    const hasPermission = await this.requestGalleryPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
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
   */
  async savePhoto(input: SaveMediaInput): Promise<MediaFile> {
    await this.ensureDirectoryExists();

    const mediaId = generateId('img');
    const extension = input.sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
    const relativePath = `${APP_CONFIG.storageMediaDir}/${mediaId}.${extension}`;
    const destinationUri = `${FileSystem.documentDirectory ?? ''}${relativePath}`;

    if (FileSystem.documentDirectory) {
      await FileSystem.copyAsync({
        from: input.sourceUri,
        to: destinationUri,
      });
    }

    const info = FileSystem.documentDirectory ? await FileSystem.getInfoAsync(destinationUri) : null;

    const media: MediaFile = {
      id: mediaId,
      relativePath,
      fullUri: destinationUri,
      sizeBytes: info && 'size' in info ? (info as { size?: number }).size : undefined,
      mimeType: input.mimeType || 'image/jpeg',
      createdAt: new Date().toISOString(),
    };

    logger.info(`Foto disimpan secara lokal: ${relativePath}`, { category: 'media' });
    return media;
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
