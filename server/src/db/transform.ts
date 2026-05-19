// Transform Prisma camelCase results to snake_case for frontend compatibility

function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
      if (key === 'isActive') result[snakeKey] = value ? 1 : 0;
      else if (key === 'isCorrect') result[snakeKey] = value ? 1 : 0;
      else result[snakeKey] = toSnakeCase(value);
    }
    return result;
  }
  return obj;
}

export function serialize<T>(data: T): any {
  return toSnakeCase(data);
}
