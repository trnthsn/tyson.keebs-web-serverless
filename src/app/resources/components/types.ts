export type ResourceFile = {
  url: string;
  format: string;
  mcu?: string;
  variant?: string;
  version?: string;
  size?: string;
};

export type Resource = {
  id: string;
  name: string;
  description: string;
  category: string;
  keyboardModel: string;
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
