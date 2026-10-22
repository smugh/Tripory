/**
 * Adapter Boundary: Backup & Restore
 * Mendukung prinsip local-first: data inti selalu ada di perangkat.
 * Adapter ini menyiapkan paket manifest dan boundary integrasi Google Drive di masa depan.
 */

export interface BackupManifest {
  formatVersion: string;
  appVersion: string;
  createdAt: string;
  tripCount: number;
  mediaCount: number;
  checksum: string;
}

export interface BackupResult {
  success: boolean;
  manifest?: BackupManifest;
  error?: string;
}

export interface BackupProvider {
  createBackupManifest(): Promise<BackupManifest>;
  exportBackupPackage(): Promise<BackupResult>;
  validateBackup(manifestJson: string): Promise<boolean>;
}

export class LocalBackupProvider implements BackupProvider {
  async createBackupManifest(): Promise<BackupManifest> {
    return {
      formatVersion: '1.0',
      appVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      tripCount: 0,
      mediaCount: 0,
      checksum: 'sha256-stub',
    };
  }

  async exportBackupPackage(): Promise<BackupResult> {
    const manifest = await this.createBackupManifest();
    return {
      success: true,
      manifest,
    };
  }

  async validateBackup(manifestJson: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(manifestJson);
      return typeof parsed.formatVersion === 'string';
    } catch {
      return false;
    }
  }
}

export const backupProvider: BackupProvider = new LocalBackupProvider();
