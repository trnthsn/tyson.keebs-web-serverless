const COMMAND_START = 0x00;
const CMD_GET_PROTOCOL_VERSION = 0x01;

export type DeviceInfo = {
  device: HIDDevice;
  vendorId: number;
  productId: number;
  productName: string;
  vendorProductId: number;
  protocol: number;
};

const computeVendorProductId = (vendorId: number, productId: number) =>
  (vendorId << 16) | productId;

const hidCommand = async (
  device: HIDDevice,
  command: number,
  bytes: number[] = [],
): Promise<DataView> => {
  const padded = new Array(33).fill(0);
  padded[0] = COMMAND_START;
  padded[1] = command;
  bytes.forEach((b, i) => {
    padded[2 + i] = b;
  });

  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: HIDInputReportEvent) => {
      device.removeEventListener('inputreport', handler);
      if (timer) clearTimeout(timer);
      const bytes = Array.from(new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength));
      console.log('[Tyson VIA] HID protocol response', {
        command,
        response: bytes,
      });
      resolve(e.data);
    };
    device.addEventListener('inputreport', handler);
    timer = setTimeout(() => {
      device.removeEventListener('inputreport', handler);
      reject(new Error('HID command timeout'));
    }, 5000);

    device.sendReport(0, new Uint8Array(padded.slice(1))).catch((error) => {
      device.removeEventListener('inputreport', handler);
      if (timer) clearTimeout(timer);
      reject(error);
    });
  });
};

export const requestDevice = async (): Promise<DeviceInfo> => {
  const [device] = await navigator.hid.requestDevice({
    filters: [{ usagePage: 0xff60, usage: 0x61 }],
  });
  if (!device) throw new Error('No device selected');

  await device.open();

  const protocol = await getProtocolVersion(device);
  const vendorProductId = computeVendorProductId(
    device.vendorId,
    device.productId,
  );

  return {
    device,
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName,
    vendorProductId,
    protocol,
  };
};

export const getProtocolVersion = async (
  device: HIDDevice,
): Promise<number> => {
  const buf = await hidCommand(device, CMD_GET_PROTOCOL_VERSION);
  const hi = buf.getUint8(2);
  const lo = buf.getUint8(3);
  return (hi << 8) | lo;
};

export const disconnectDevice = async (device: HIDDevice) => {
  try {
    await device.close();
  } catch {
    // already disconnected
  }
};

export const onDeviceDisconnect = (
  device: HIDDevice,
  callback: () => void,
) => {
  const handler = () => callback();
  device.addEventListener('disconnect', handler);
  return () => device.removeEventListener('disconnect', handler);
};
