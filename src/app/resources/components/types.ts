export type ResourceFile = {
  url: string;
  format: string;
  mcu?: string;
  variant?: string;
  version?: string;
  size?: string;
  /** Raw size in bytes (emitted by scripts/generate-resources.mjs). */
  sizeBytes?: number;
};

export type Resource = {
  id: string;
  name: string;
  description: string;
  category: string;
  keyboardModel: string;
  /** Normalized lookup key, e.g. "S6xty5Neo R2" -> "s6xty5neo-r2". */
  keyboardModelSlug?: string;
  vendorProductId?: number;
  files: ResourceFile[];
};

export type ResourceCategory = 'All' | 'JSON_DEFINITION' | 'FIRMWARE' | 'BOOTLOADER';

export type DetectedKeyboard = {
  vendorId: number;
  productId: number;
  productName: string;
  vendorProductId: number;
};
