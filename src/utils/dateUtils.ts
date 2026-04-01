/**
 * Formats a date string or Date object into a localized date string
 * based on the user's preferred timezone or the browser's timezone.
 */
export const formatLocalDate = (date: string | Date | number): string => {
  const userTimezone = localStorage.getItem('userTimezone');
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: userTimezone || undefined,
  };

  try {
    return new Date(date).toLocaleDateString(undefined, options);
  } catch (e) {
    console.error('Failed to format date with timezone:', userTimezone, e);
    return new Date(date).toLocaleDateString();
  }
};

/**
 * Formats a date string or Date object into a localized time string
 * based on the user's preferred timezone or the browser's timezone.
 */
export const formatLocalTime = (date: string | Date | number): string => {
  const userTimezone = localStorage.getItem('userTimezone');
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: userTimezone || undefined,
  };

  try {
    return new Date(date).toLocaleTimeString(undefined, options);
  } catch (e) {
    console.error('Failed to format time with timezone:', userTimezone, e);
    return new Date(date).toLocaleTimeString();
  }
};

/**
 * Formats a date string or Date object into a full localized date/time string
 * based on the user's preferred timezone or the browser's timezone.
 */
export const formatLocalDateTime = (date: string | Date | number): string => {
  const userTimezone = localStorage.getItem('userTimezone');
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: userTimezone || undefined,
  };

  try {
    return new Date(date).toLocaleString(undefined, options);
  } catch (e) {
    console.error('Failed to format datetime with timezone:', userTimezone, e);
    return new Date(date).toLocaleString();
  }
};

/**
 * Gets the current effective timezone (either user-selected or detected)
 */
export const getEffectiveTimezone = (): string => {
  return localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Gets the detected browser timezone
 */
export const getDetectedTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
