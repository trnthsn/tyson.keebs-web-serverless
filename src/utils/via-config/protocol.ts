import type { MatrixInfo, VIADefinitionV2, VIADefinitionV3, VIAKey } from '@the-via/reader';

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
}

enum KeyboardValue {
  LAYOUT_OPTIONS = 0x02,
}

const PROTOCOL_ALPHA = 7;
const PROTOCOL_BETA = 8;
const MAX_BUFFER_BYTES = 28;

type Definition = VIADefinitionV2 | VIADefinitionV3;

const commandQueues = new WeakMap<HIDDevice, Promise<unknown>>();

const shiftTo16Bit = (hi: number, lo: number) => (hi << 8) | lo;

const shiftFrom16Bit = (value: number): [number, number] => [value >> 8, value & 0xff];

const shiftBufferTo16Bit = (buffer: number[]) => {
  const shifted: number[] = [];
  for (let i = 0; i < buffer.length; i += 2) {
    shifted.push(shiftTo16Bit(buffer[i] ?? 0, buffer[i + 1] ?? 0));
  }
  return shifted;
};

const shiftBufferFrom16Bit = (buffer: number[]) => buffer.flatMap(shiftFrom16Bit);

const getResponseBytes = (response: DataView) =>
  Array.from(new Uint8Array(response.buffer, response.byteOffset, response.byteLength));

// WebHID implementations may expose the report byte in DataView. VIA's
// response command is the first byte without it, or the second byte with it.
const getReportOffset = (response: DataView, command: number) => {
  const bytes = getResponseBytes(response);
  return bytes[1] === command ? 1 : 0;
};

const runQueued = async <T>(device: HIDDevice, job: () => Promise<T>) => {
  const previous = commandQueues.get(device) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(job);
  commandQueues.set(device, current);
  try {
    return await current;
  } finally {
    if (commandQueues.get(device) === current) {
      commandQueues.delete(device);
    }
  }
};

const hidCommand = async (
  device: HIDDevice,
  command: number,
  bytes: number[] = [],
  timeoutMs = 5000,
): Promise<DataView> =>
  runQueued(device, async () => {
    const padded = new Array(33).fill(0);
    padded[0] = COMMAND_START;
    padded[1] = command;
    bytes.forEach((byte, index) => {
      padded[2 + index] = byte;
    });

    return new Promise<DataView>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        device.removeEventListener('inputreport', handleReport);
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      const handleReport = (event: HIDInputReportEvent) => {
        const bytes = getResponseBytes(event.data);
        const responseHasCommand = bytes[0] === command || bytes[1] === command;
        if (!responseHasCommand) {
          console.log('[Tyson VIA] Ignoring unrelated HID response', {
            command,
            response: bytes,
          });
          return;
        }
        cleanup();
        console.log('[Tyson VIA] HID response', {
          command,
          response: bytes,
        });
        resolve(event.data);
      };

      device.addEventListener('inputreport', handleReport);
      timer = setTimeout(() => {
        cleanup();
        reject(new Error('HID command timeout'));
      }, timeoutMs);

      device.sendReport(0, new Uint8Array(padded.slice(1))).catch((error) => {
        cleanup();
        reject(error);
      });
    });
  });

const getOptionChoiceCount = (label: string | string[]) =>
  Array.isArray(label) ? Math.max(1, label.length - 1) : 2;

const getOptionBitWidth = (choiceCount: number) =>
  Math.max(1, Math.ceil(Math.log2(Math.max(2, choiceCount))));

const unpackBits = (value: number, widths: number[]) => {
  let remaining = value >>> 0;
  const choices: number[] = [];

  for (let index = widths.length - 1; index >= 0; index -= 1) {
    const width = widths[index] ?? 1;
    const mask = (1 << width) - 1;
    choices.unshift(remaining & mask);
    remaining >>>= width;
  }

  return choices;
};

const packBits = (values: [number, number][]) => {
  let packed = 0;
  for (const [value, width] of values) {
    packed = (packed << width) | value;
  }
  return packed >>> 0;
};

const getKeymapBuffer = async (device: HIDDevice, offset: number, size: number) => {
  if (size > MAX_BUFFER_BYTES) {
    throw new Error('Max keymap buffer size is 28 bytes');
  }
  const response = await hidCommand(device, APICommand.DYNAMIC_KEYMAP_GET_BUFFER, [
    ...shiftFrom16Bit(offset),
    size,
  ]);
  const bytes = getResponseBytes(response);
  const dataOffset = 4 + getReportOffset(response, APICommand.DYNAMIC_KEYMAP_GET_BUFFER);
  const data = bytes.slice(dataOffset, dataOffset + size);
  console.log('[Tyson VIA] Keymap buffer response', {
    offset,
    size,
    response: bytes,
    dataOffset,
    data,
  });
  return data;
};

export const getProtocolVersion = async (device: HIDDevice) => {
  const buffer = await hidCommand(device, APICommand.GET_PROTOCOL_VERSION);
  const offset = getReportOffset(buffer, APICommand.GET_PROTOCOL_VERSION);
  return shiftTo16Bit(buffer.getUint8(2 + offset), buffer.getUint8(3 + offset));
};

export const getLayerCount = async (device: HIDDevice, protocol: number) => {
  if (protocol >= PROTOCOL_BETA) {
    const buffer = await hidCommand(device, APICommand.DYNAMIC_KEYMAP_GET_LAYER_COUNT);
    return buffer.getUint8(2 + getReportOffset(buffer, APICommand.DYNAMIC_KEYMAP_GET_LAYER_COUNT));
  }
  return 4;
};

export const getKeycode = async (
  device: HIDDevice,
  layer: number,
  row: number,
  col: number,
) => {
  const buffer = await hidCommand(device, APICommand.DYNAMIC_KEYMAP_GET_KEYCODE, [
    layer,
    row,
    col,
  ]);
  const offset = getReportOffset(buffer, APICommand.DYNAMIC_KEYMAP_GET_KEYCODE);
  return shiftTo16Bit(buffer.getUint8(4 + offset), buffer.getUint8(5 + offset));
};

export const setKeycode = async (
  device: HIDDevice,
  layer: number,
  row: number,
  col: number,
  value: number,
) => {
  await hidCommand(device, APICommand.DYNAMIC_KEYMAP_SET_KEYCODE, [
    layer,
    row,
    col,
    ...shiftFrom16Bit(value),
  ]);
};

export const readLayerKeymap = async (
  device: HIDDevice,
  matrix: MatrixInfo,
  layer: number,
  protocol: number,
) => {
  const length = matrix.rows * matrix.cols;

  if (protocol >= PROTOCOL_BETA) {
    const keycodesPerChunk = MAX_BUFFER_BYTES / 2;
    const requests: Promise<number[]>[] = [];

    for (let consumed = 0; consumed < length; consumed += keycodesPerChunk) {
      const remaining = Math.min(keycodesPerChunk, length - consumed);
      requests.push(
        getKeymapBuffer(device, layer * length * 2 + consumed * 2, remaining * 2),
      );
    }

    const chunks = await Promise.all(requests);
    const keycodes = chunks.flatMap(shiftBufferTo16Bit);
    console.log('[Tyson VIA] Read layer matrix', {
      layer,
      rows: matrix.rows,
      cols: matrix.cols,
      keycodes,
    });
    return keycodes;
  }

  if (protocol === PROTOCOL_ALPHA) {
    const keycodes: number[] = [];
    for (let index = 0; index < length; index += 1) {
      const row = Math.floor(index / matrix.cols);
      const col = index % matrix.cols;
      keycodes.push(await getKeycode(device, layer, row, col));
    }
    return keycodes;
  }

  throw new Error(`Unsupported VIA protocol version: ${protocol}`);
};

export const writeKeymapBuffer = async (device: HIDDevice, layers: number[][]) => {
  const bytes = shiftBufferFrom16Bit(layers.flatMap((layer) => layer));

  for (let offset = 0; offset < bytes.length; offset += MAX_BUFFER_BYTES) {
    const chunk = bytes.slice(offset, offset + MAX_BUFFER_BYTES);
    await hidCommand(device, APICommand.DYNAMIC_KEYMAP_SET_BUFFER, [
      ...shiftFrom16Bit(offset),
      chunk.length,
      ...chunk,
    ]);
  }
};

export const readLayoutOptions = async (device: HIDDevice, definition: Definition) => {
  if (!definition.layouts.labels?.length) {
    return [];
  }

  try {
    const buffer = await hidCommand(device, APICommand.GET_KEYBOARD_VALUE, [
      KeyboardValue.LAYOUT_OPTIONS,
    ]);
    const widths = definition.layouts.labels.map((label) =>
      getOptionBitWidth(getOptionChoiceCount(label)),
    );
    const offset = getReportOffset(buffer, APICommand.GET_KEYBOARD_VALUE);
    const packedValue =
      (buffer.getUint8(2 + offset) << 24) |
      (buffer.getUint8(3 + offset) << 16) |
      (buffer.getUint8(4 + offset) << 8) |
      buffer.getUint8(5 + offset);
    return unpackBits(packedValue >>> 0, widths);
  } catch {
    return definition.layouts.labels.map(() => 0);
  }
};

export const writeLayoutOptions = async (
  device: HIDDevice,
  definition: Definition,
  options: number[],
) => {
  if (!definition.layouts.labels?.length) {
    return;
  }

  const widths = definition.layouts.labels.map((label) =>
    getOptionBitWidth(getOptionChoiceCount(label)),
  );
  const packed = packBits(options.map((value, index) => [value, widths[index] ?? 1]));
  const bytes = [
    (packed >> 24) & 0xff,
    (packed >> 16) & 0xff,
    (packed >> 8) & 0xff,
    packed & 0xff,
  ];

  await hidCommand(device, APICommand.SET_KEYBOARD_VALUE, [
    KeyboardValue.LAYOUT_OPTIONS,
    ...bytes,
  ]);
};

export const readAllLayers = async (
  device: HIDDevice,
  definition: Definition,
  protocol: number,
  layerCount: number,
) => {
  const layers: number[][] = [];
  for (let layer = 0; layer < layerCount; layer += 1) {
    layers.push(await readLayerKeymap(device, definition.matrix, layer, protocol));
  }
  return layers;
};

export const getMatrixIndex = (cols: number, key: Pick<VIAKey, 'row' | 'col'>) =>
  key.row * cols + key.col;
