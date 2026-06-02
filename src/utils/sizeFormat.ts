/**
 * Parses a size string like "1.5GB", "256 MiB", or "12KB" and returns its value
 * in bytes. Accepts the common IEC (KiB, MiB, GiB, TiB) and SI (KB, MB, GB, TB)
 * suffixes, case-insensitively. Returns NaN if the input cannot be parsed.
 */
export function parseSizeToBytes(input: string | number | null | undefined): number {
  if (input == null) return NaN;
  if (typeof input === 'number') return input;
  const match = String(input).trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)?$/);
  if (!match) return NaN;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return NaN;
  const unit = (match[2] || '').toUpperCase();
  const multipliers: Record<string, number> = {
    '': 1,
    B: 1,
    KB: 1_000, KIB: 1_024,
    MB: 1_000_000, MIB: 1_048_576,
    GB: 1_000_000_000, GIB: 1_073_741_824,
    TB: 1_000_000_000_000, TIB: 1_099_511_627_776,
  };
  const mult = multipliers[unit];
  if (mult === undefined) return NaN;
  return value * mult;
}

/**
 * Formats a value expressed in bytes using a localized, i18n-friendly unit
 * string. The unit's family (SI: GB/MB/KB/TB at 10^n, or IEC: GiB/MiB/KiB/TiB
 * at 2^n) determines the divisor so the output is numerically meaningful for
 * whatever unit the caller passes.
 */
export function formatBytesWithUnit(
  rawInput: string | number | null | undefined,
  unitSuffix: string,
): string {
  if (rawInput == null) return '—';
  const bytes = typeof rawInput === 'number' ? rawInput : parseSizeToBytes(rawInput);
  if (!Number.isFinite(bytes)) return typeof rawInput === 'string' ? rawInput : '—';

  if (bytes < 1000) return `${bytes} B`;

  const normalized = unitSuffix.trim().toUpperCase().replace(/\s+/g, '');
  const isIEC = /(GIB|MIB|KIB|TIB)$/.test(normalized);
  const base = isIEC ? 1024 : 1000;
  const siUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const iecUnits = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const units = isIEC ? iecUnits : siUnits;
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const scaled = bytes / Math.pow(base, exp);

  const displayUnit = units[exp] === 'B' ? 'B' : unitSuffix;
  const rounded = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1);
  return `${rounded} ${displayUnit}`;
}
