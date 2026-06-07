export function pick<T extends Record<string, unknown>>(
  obj: T,
  keys: readonly string[],
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) {
    if (key in obj) {
      (result as Record<string, unknown>)[key] = obj[key];
    }
  }
  return result;
}
