export interface MediaFile {
  id: string;
  relativePath: string;
  fullUri: string;
  sizeBytes?: number;
  mimeType: string;
  createdAt: string;
}

export interface SaveMediaInput {
  sourceUri: string;
  mimeType?: string;
}
