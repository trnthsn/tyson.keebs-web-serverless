import type { MatrixInfo } from '@the-via/reader';

// Mirrors packages/via-app/src/utils/keyboard-api.ts (VIA protocol client)
export const PROTOCOL_ALPHA = 7;
export const PROTOCOL_BETA = 8;
export const PROTOCOL_GAMMA = 9;

const COMMAND_START = 0x00;

enum APICommand {
  GET_PROTOCOL_VERSION = 0x01,
  GET_KEYBOARD_VALUE = 0x02,
  SET_KEYBOARD_VALUE = 0x03,
  DYNAMIC_KEYMAP_GET_KEYCODE = 0x04,
  DYNAMIC_KEYMAP_SET_KEYCODE = 0x05,
  DYNAMIC_KEYMAP_GET_LAYER_COUNT = 0x11,
  DYNAMIC_KEYMAP_GET_BUFFER = 0x12,
  DYNAMIC_KEYMAP_SET_BUFFER = 0x13,

  // DEPRECATED (legacy lighting):
  BACKLIGHT_CONFIG_SET_VALUE = 0x07,
  BACKLIGHT_CONFIG_GET_VALUE = 0x08,
  BACKLIGHT_CONFIG_SAVE = 0x09,
}

export enum KeyboardValue {
  UPTIME = 0x01,
  LAYOUT_OPTIONS = 0x02,
  SWITCH_MATRIX_STATE = 0x03,
  FIRMWARE_VERSION = 0x04,
  DEVICE_INDICATION = 0x05,
}

// Legacy backlight value IDs (mirrors VIA's BACKLIGHT_* constants)
export const BACKLIGHT_BRIGHTNESS = 0x09;
export const BACKLIGHT_EFFECT = 0x0a;
export const BACKLIGHT_EFFECT_SPEED = 0x0b;
export const BACKLIGHT_COLOR_1 = 0x0c;
export const BACKLIGHT_COLOR_2 = 0x0d;
export const BACKLIGHT_CUSTOM_COLOR = 0x17;

export type DeviceInfo = {
  device: HIDDevice;
  vendorId: number;
  productId: number;
  productName: string;
  vendorProductId: number;
  protocol: number;
};

const shiftTo16Bit = ([hi, lo]: [number, number]): number => (hi << 8) | lo;

const shiftFrom16Bit = (value: number): [number, number] => [
  value >> 8,
  value & 255,
];

const shiftBufferTo16Bit = (buffer: number[]): number[] => {
  const shiftedBuffer: number[] = [];
  for (let i = 0; i < buffer.length; i += 2) {
    shiftedBuffer.push(shiftTo16Bit([buffer[i], buffer[i + 1]]));
  }
  return shiftedBuffer;
};

const shiftBufferFrom16Bit = (buffer: number[]): number[] =>
  buffer.map(shiftFrom16Bit).flatMap((value) => value);

const eqArr = <T>(arr1: T[], arr2: T[]) =>
  arr1.length === arr2.length && arr1.every((val, idx) => arr2[idx] === val);

export const getVendorProductId = (vendorId: number, productId: number) =>
  (vendorId << 16) | productId;

// Responses arrive via 'inputreport' events (interrupt IN), with the report
// ID 0x00 carried in the report header (mirrors via-app/shims/node-hid.ts).
type HidState = {
  buffer: number[][];
  waiters: ((data: number[]) => void)[];
};

const deviceState = new Map<HIDDevice, HidState>();
const deviceQueues = new Map<HIDDevice, Promise<unknown>>();

const setupInputListener = (device: HIDDevice) => {
  if (deviceState.has(device)) return;
  const state: HidState = { buffer: [], waiters: [] };
  deviceState.set(device, state);
  device.addEventListener('inputreport', (e) => {
    const data = Array.from(new Uint8Array(e.data.buffer));
    const st = deviceState.get(device);
    if (!st) return;
    if (st.waiters.length > 0) {
      st.waiters.shift()!(data);
    } else {
      st.buffer.push(data);
    }
  });
};

const readP = (device: HIDDevice, timeoutMs: number): Promise<number[]> =>
  new Promise((resolve, reject) => {
    const st = deviceState.get(device);
    if (!st) {
      reject(new Error('Device not initialized'));
      return;
    }
    if (st.buffer.length > 0) {
      resolve(st.buffer.shift()!);
      return;
    }
    let waiter: (data: number[]) => void;
    const timer = setTimeout(() => {
      const idx = st.waiters.indexOf(waiter);
      if (idx >= 0) {
        st.waiters.splice(idx, 1);
      }
      reject(new Error('HID read timed out'));
    }, timeoutMs);
    waiter = (data: number[]) => {
      clearTimeout(timer);
      resolve(data);
    };
    st.waiters.push(waiter);
  });

// Serialize commands per device so responses are never misattributed
const enqueue = <T>(device: HIDDevice, fn: () => Promise<T>): Promise<T> => {
  const prev = deviceQueues.get(device) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  deviceQueues.set(
    device,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
};

const hidCommand = async (
  device: HIDDevice,
  command: number,
  bytes: number[] = [],
): Promise<number[]> => {
  setupInputListener(device);
  return enqueue(device, async () => {
    const commandBytes = [COMMAND_START, command, ...bytes];
    const paddedArray = new Array(33).fill(0);
    commandBytes.forEach((val, idx) => {
      paddedArray[idx] = val;
    });

    await device.sendReport(0x00, new Uint8Array(paddedArray.slice(1)));

    const buffer = (await readP(device, 3000)).slice(0, 32);
    const bufferCommandBytes = buffer.slice(0, commandBytes.length - 1);
    if (!eqArr(commandBytes.slice(1), bufferCommandBytes)) {
      throw new Error('Receiving incorrect response for command');
    }
    return buffer;
  });
};

const getProtocolVersion = async (device: HIDDevice) => {
  try {
    const [, hi, lo] = await hidCommand(device, APICommand.GET_PROTOCOL_VERSION);
    return shiftTo16Bit([hi, lo]);
  } catch {
    return -1;
  }
};

export const requestDevice = async (): Promise<DeviceInfo> => {
  const [device] = await navigator.hid.requestDevice({
    filters: [{ usagePage: 0xff60, usage: 0x61 }],
  });
  if (!device) throw new Error('No device selected');

  await device.open();

  const protocol = await getProtocolVersion(device);
  if (protocol === -1) {
    await device.close();
    throw new Error('This device does not appear to be VIA compatible');
  }

  return {
    device,
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName,
    vendorProductId: getVendorProductId(device.vendorId, device.productId),
    protocol,
  };
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

export const getLayerCount = async (deviceInfo: DeviceInfo) => {
  const { device, protocol } = deviceInfo;
  if (protocol >= PROTOCOL_BETA) {
    const [, count] = await hidCommand(
      device,
      APICommand.DYNAMIC_KEYMAP_GET_LAYER_COUNT,
    );
    return count;
  }
  return 4;
};

export const getKeycode = async (
  deviceInfo: DeviceInfo,
  layer: number,
  row: number,
  col: number,
) => {
  const buffer = await hidCommand(deviceInfo.device, APICommand.DYNAMIC_KEYMAP_GET_KEYCODE, [
    layer,
    row,
    col,
  ]);
  return shiftTo16Bit([buffer[4], buffer[5]]);
};

export const setKeycode = async (
  deviceInfo: DeviceInfo,
  layer: number,
  row: number,
  col: number,
  val: number,
) => {
  const buffer = await hidCommand(deviceInfo.device, APICommand.DYNAMIC_KEYMAP_SET_KEYCODE, [
    layer,
    row,
    col,
    ...shiftFrom16Bit(val),
  ]);
  return shiftTo16Bit([buffer[4], buffer[5]]);
};

const getKeymapBuffer = async (
  deviceInfo: DeviceInfo,
  offset: number,
  size: number,
): Promise<number[]> => {
  if (size > 28) {
    throw new Error('Max data length is 28');
  }
  const res = await hidCommand(deviceInfo.device, APICommand.DYNAMIC_KEYMAP_GET_BUFFER, [
    ...shiftFrom16Bit(offset),
    size,
  ]);
  return [...res].slice(4, size + 4);
};

export const readRawMatrix = async (
  deviceInfo: DeviceInfo,
  matrix: MatrixInfo,
  layer: number,
): Promise<number[]> => {
  const { device, protocol } = deviceInfo;
  if (protocol >= PROTOCOL_BETA) {
    return fastReadRawMatrix(deviceInfo, matrix, layer);
  }
  if (protocol === PROTOCOL_ALPHA) {
    return slowReadRawMatrix(deviceInfo, matrix, layer);
  }
  throw new Error('Unsupported protocol version');
};

const fastReadRawMatrix = async (
  deviceInfo: DeviceInfo,
  { rows, cols }: MatrixInfo,
  layer: number,
): Promise<number[]> => {
  const length = rows * cols;
  const MAX_KEYCODES_PARTIAL = 14;
  const bufferList = new Array<number>(
    Math.ceil(length / MAX_KEYCODES_PARTIAL),
  ).fill(0);
  const { res: promiseRes } = bufferList.reduce(
    ({ res, remaining }: { res: Promise<number[]>[]; remaining: number }) =>
      remaining < MAX_KEYCODES_PARTIAL
        ? {
            res: [
              ...res,
              getKeymapBuffer(
                deviceInfo,
                layer * length * 2 + 2 * (length - remaining),
                remaining * 2,
              ),
            ],
            remaining: 0,
          }
        : {
            res: [
              ...res,
              getKeymapBuffer(
                deviceInfo,
                layer * length * 2 + 2 * (length - remaining),
                MAX_KEYCODES_PARTIAL * 2,
              ),
            ],
            remaining: remaining - MAX_KEYCODES_PARTIAL,
          },
    { res: [], remaining: length },
  );
  const yieldedRes = await Promise.all(promiseRes);
  return yieldedRes.flatMap(shiftBufferTo16Bit);
};

const slowReadRawMatrix = async (
  deviceInfo: DeviceInfo,
  { rows, cols }: MatrixInfo,
  layer: number,
): Promise<number[]> => {
  const length = rows * cols;
  const res = new Array(length)
    .fill(0)
    .map((_, i) => getKeycode(deviceInfo, layer, ~~(i / cols), i % cols));
  return Promise.all(res);
};

export const writeRawMatrix = async (
  deviceInfo: DeviceInfo,
  keymap: number[][],
): Promise<void> => {
  const { protocol } = deviceInfo;
  if (protocol >= PROTOCOL_BETA) {
    return fastWriteRawMatrix(deviceInfo, keymap);
  }
  if (protocol === PROTOCOL_ALPHA) {
    return slowWriteRawMatrix(deviceInfo, keymap);
  }
};

const slowWriteRawMatrix = async (
  deviceInfo: DeviceInfo,
  keymap: number[][],
): Promise<void> => {
  keymap.forEach(async (layer, layerIdx) =>
    layer.forEach(async (keycode, keyIdx) => {
      await setKeycode(
        deviceInfo,
        layerIdx,
        ~~(keyIdx / keymap[0].length),
        keyIdx % keymap[0].length,
        keycode,
      );
    }),
  );
};

const fastWriteRawMatrix = async (
  deviceInfo: DeviceInfo,
  keymap: number[][],
): Promise<void> => {
  const data = keymap.flatMap((layer) => layer.map((key) => key));
  const shiftedData = shiftBufferFrom16Bit(data);
  const bufferSize = 28;
  for (let offset = 0; offset < shiftedData.length; offset += bufferSize) {
    const buffer = shiftedData.slice(offset, offset + bufferSize);
    await hidCommand(deviceInfo.device, APICommand.DYNAMIC_KEYMAP_SET_BUFFER, [
      ...shiftFrom16Bit(offset),
      buffer.length,
      ...buffer,
    ]);
  }
};

export const getKeyboardValue = async (
  deviceInfo: DeviceInfo,
  command: KeyboardValue,
  parameters: number[],
  resultLength = 1,
): Promise<number[]> => {
  const bytes = [command, ...parameters];
  const res = await hidCommand(deviceInfo.device, APICommand.GET_KEYBOARD_VALUE, bytes);
  return res.slice(1 + bytes.length, 1 + bytes.length + resultLength);
};

export const setKeyboardValue = async (
  deviceInfo: DeviceInfo,
  command: KeyboardValue,
  ...rest: number[]
) => {
  const bytes = [command, ...rest];
  await hidCommand(deviceInfo.device, APICommand.SET_KEYBOARD_VALUE, bytes);
};

// Mirrors via-app/src/utils/use-matrix-test.ts
export const getMatrixState = async (
  deviceInfo: DeviceInfo,
  matrix: MatrixInfo,
): Promise<Uint8Array> => {
  const { protocol } = deviceInfo;
  const { cols, rows } = matrix;
  const bytesPerRow = Math.ceil(cols / 8);
  const rowsPerQuery = Math.floor(28 / bytesPerRow);
  const newFlat: number[] = [];
  for (let offset = 0; offset < rows; offset += rowsPerQuery) {
    const querySize = Math.min(
      rows * bytesPerRow - newFlat.length,
      bytesPerRow * rowsPerQuery,
    );
    newFlat.push(
      ...(await getKeyboardValue(
        deviceInfo,
        KeyboardValue.SWITCH_MATRIX_STATE,
        protocol >= 12 ? [offset] : [],
        querySize,
      )),
    );
  }
  return new Uint8Array(newFlat);
};

export const getBacklightValue = async (
  deviceInfo: DeviceInfo,
  command: number,
  resultLength = 1,
): Promise<number[]> => {
  const res = await hidCommand(
    deviceInfo.device,
    APICommand.BACKLIGHT_CONFIG_GET_VALUE,
    [command],
  );
  return res.slice(2, 2 + resultLength);
};

export const setBacklightValue = async (
  deviceInfo: DeviceInfo,
  command: number,
  ...rest: number[]
) => {
  await hidCommand(deviceInfo.device, APICommand.BACKLIGHT_CONFIG_SET_VALUE, [
    command,
    ...rest,
  ]);
};

export const saveLighting = async (deviceInfo: DeviceInfo) => {
  await hidCommand(deviceInfo.device, APICommand.BACKLIGHT_CONFIG_SAVE);
};

export const getCustomColor = async (
  deviceInfo: DeviceInfo,
  colorNumber: number,
): Promise<{ hue: number; sat: number }> => {
  const [, , , hue, sat] = await hidCommand(
    deviceInfo.device,
    APICommand.BACKLIGHT_CONFIG_GET_VALUE,
    [BACKLIGHT_CUSTOM_COLOR, colorNumber],
  );
  return { hue, sat };
};

export const setCustomColor = async (
  deviceInfo: DeviceInfo,
  colorNumber: number,
  hue: number,
  sat: number,
) => {
  await hidCommand(deviceInfo.device, APICommand.BACKLIGHT_CONFIG_SET_VALUE, [
    BACKLIGHT_CUSTOM_COLOR,
    colorNumber,
    hue,
    sat,
  ]);
};

// V3 custom menu values reuse the 0x07/0x08/0x09 bytes with [channel, id]
// addressing (mirrors keyboard-api CUSTOM_MENU_GET_VALUE/SET_VALUE/SAVE).
export const getCustomMenuValue = async (
  deviceInfo: DeviceInfo,
  channel: number,
  id: number,
  resultLength = 1,
): Promise<number[]> => {
  const res = await hidCommand(
    deviceInfo.device,
    APICommand.BACKLIGHT_CONFIG_GET_VALUE,
    [channel, id],
  );
  return res.slice(4, 4 + resultLength);
};

export const setCustomMenuValue = async (
  deviceInfo: DeviceInfo,
  channel: number,
  id: number,
  ...rest: number[]
) => {
  await hidCommand(deviceInfo.device, APICommand.BACKLIGHT_CONFIG_SET_VALUE, [
    channel,
    id,
    ...rest,
  ]);
};

export const saveCustomMenu = async (
  deviceInfo: DeviceInfo,
  channel: number,
) => {
  await hidCommand(deviceInfo.device, APICommand.BACKLIGHT_CONFIG_SAVE, [
    channel,
  ]);
};
