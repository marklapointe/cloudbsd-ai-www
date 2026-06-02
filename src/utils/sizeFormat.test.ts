import { describe, it, expect } from 'vitest';
import { parseSizeToBytes, formatBytesWithUnit } from './sizeFormat';

describe('parseSizeToBytes', () => {
  it('parses SI units', () => {
    expect(parseSizeToBytes('1KB')).toBe(1_000);
    expect(parseSizeToBytes('1.5MB')).toBe(1_500_000);
    expect(parseSizeToBytes('2GB')).toBe(2_000_000_000);
    expect(parseSizeToBytes('1TB')).toBe(1_000_000_000_000);
  });

  it('parses IEC units', () => {
    expect(parseSizeToBytes('1KiB')).toBe(1_024);
    expect(parseSizeToBytes('1MiB')).toBe(1_048_576);
    expect(parseSizeToBytes('1GiB')).toBe(1_073_741_824);
    expect(parseSizeToBytes('1TiB')).toBe(1_099_511_627_776);
  });

  it('is case-insensitive on the unit', () => {
    expect(parseSizeToBytes('1gb')).toBe(1_000_000_000);
    expect(parseSizeToBytes('1GIB')).toBe(1_073_741_824);
  });

  it('accepts numbers directly', () => {
    expect(parseSizeToBytes(1234)).toBe(1234);
    expect(parseSizeToBytes(0)).toBe(0);
  });

  it('accepts bare numbers and empty units', () => {
    expect(parseSizeToBytes('42')).toBe(42);
    expect(parseSizeToBytes('42B')).toBe(42);
  });

  it('returns NaN for garbage', () => {
    expect(Number.isNaN(parseSizeToBytes('hello'))).toBe(true);
    expect(Number.isNaN(parseSizeToBytes('GB'))).toBe(true);
    expect(Number.isNaN(parseSizeToBytes(null))).toBe(true);
    expect(Number.isNaN(parseSizeToBytes(undefined))).toBe(true);
  });
});

describe('formatBytesWithUnit', () => {
  it('uses SI divisors for SI units', () => {
    expect(formatBytesWithUnit(2_000_000_000, 'GB')).toBe('2.0 GB');
    expect(formatBytesWithUnit(1_500_000_000, 'GB')).toBe('1.5 GB');
  });

  it('uses IEC divisors for IEC units', () => {
    expect(formatBytesWithUnit(2_000_000_000, 'GiB')).toBe('1.9 GiB');
    expect(formatBytesWithUnit(1_073_741_824, 'GiB')).toBe('1.0 GiB');
  });

  it('uses the localized unit the caller passes (even for mismatched families)', () => {
    const out = formatBytesWithUnit(2_000_000_000, 'GB');
    expect(out).toContain('GB');
  });

  it('handles tiny byte values without forcing a unit', () => {
    expect(formatBytesWithUnit(512, 'B')).toBe('512 B');
    expect(formatBytesWithUnit(0, 'GB')).toBe('0 B');
  });

  it('handles TB-scale values with the matching SI divisor', () => {
    expect(formatBytesWithUnit(3_000_000_000_000, 'TB')).toBe('3.0 TB');
  });

  it('handles TB-scale values with the matching IEC divisor', () => {
    expect(formatBytesWithUnit(3_000_000_000_000, 'TiB')).toMatch(/^2\.7 TiB$/);
  });

  it('passes through a string it cannot parse', () => {
    expect(formatBytesWithUnit('not a size', 'GB')).toBe('not a size');
  });

  it('handles null and undefined', () => {
    expect(formatBytesWithUnit(null, 'GB')).toBe('—');
    expect(formatBytesWithUnit(undefined, 'GB')).toBe('—');
  });
});
