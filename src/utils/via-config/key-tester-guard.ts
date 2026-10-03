export type TesterKeyLike = {
  code: string;
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
};

const FUNCTION_KEY_RE = /^F([1-9]|1\d|2[0-4])$/;

const MODIFIER_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight',
]);

const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'AltGraph',
  'OS',
  'Hyper',
  'Super',
  'Symbol',
]);

const ACTION_CODES = new Set([
  'Tab',
  'Space',
  'Enter',
  'NumpadEnter',
  'Escape',
  'Backspace',
  'Delete',
  'Insert',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'PrintScreen',
  'Pause',
  'ContextMenu',
  'Help',
]);

const ACTION_KEYS = new Set([
  'Tab',
  ' ',
  'Spacebar',
  'Enter',
  'Escape',
  'Esc',
  'Backspace',
  'Delete',
  'Del',
  'Insert',
  'Ins',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Up',
  'Down',
  'Left',
  'Right',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'PrintScreen',
  'Pause',
  'Break',
  'ContextMenu',
  'Apps',
  'Help',
]);

export const shouldPreventTesterKey = (event: TesterKeyLike): boolean => {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }
  if (FUNCTION_KEY_RE.test(event.code) || FUNCTION_KEY_RE.test(event.key)) {
    return true;
  }
  if (MODIFIER_CODES.has(event.code) || MODIFIER_KEYS.has(event.key)) {
    return true;
  }
  if (ACTION_CODES.has(event.code) || ACTION_KEYS.has(event.key)) {
    return true;
  }
  return false;
};

export const preventTesterKeyIfNeeded = (event: KeyboardEvent): void => {
  if (
    shouldPreventTesterKey({
      code: event.code,
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
    })
  ) {
    event.preventDefault();
  }
};
