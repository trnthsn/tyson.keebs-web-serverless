export function getRGBPrime(
  hue: number,
  c: number,
  x: number,
): [number, number, number] {
  if (hue >= 0 && hue < 60) return [c, x, 0];
  if (hue >= 60 && hue < 120) return [x, c, 0];
  if (hue >= 120 && hue < 180) return [0, c, x];
  if (hue >= 180 && hue < 240) return [0, x, c];
  if (hue >= 240 && hue < 300) return [x, 0, c];
  if (hue >= 300 && hue < 360) return [c, 0, x];
  return [c, x, 0];
}

export function getRGB({ hue, sat }: { hue: number; sat: number }): string {
  const s = sat / 255;
  const h = Math.round((360 * hue) / 255);
  const c = s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = 1 - c;
  const [r, g, b] = getRGBPrime(h, c, x).map((n) => Math.round(255 * (m + n)));
  return `rgba(${r},${g},${b},1)`;
}

export function getHex({ hue, sat }: { hue: number; sat: number }): string {
  const s = sat / 255;
  const h = Math.round((360 * hue) / 255);
  const c = s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = 1 - c;
  const [r, g, b] = getRGBPrime(h, c, x).map((n) =>
    Math.round(255 * (m + n))
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${r}${g}${b}`;
}

export function getHSV(color: string): [number, number, number] {
  const cleaned = color.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;
  const cmax = Math.max(r, g, b);
  const cmin = Math.min(r, g, b);
  const delta = cmax - cmin;
  let h = 0;
  let s = 0;
  const v = cmax;
  if (delta !== 0) {
    if (cmax === r) h = 60 * (((g - b) / delta) % 6);
    else if (cmax === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (cmax !== 0) s = delta / cmax;
  return [(h + 360) % 360, s, v];
}

export function get256HSV(color: string): [number, number, number] {
  const [h, s, v] = getHSV(color);
  return [
    Math.round((255 * h) / 360),
    Math.round(255 * s),
    Math.round(255 * v),
  ];
}
