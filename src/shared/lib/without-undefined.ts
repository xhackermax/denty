/**
 * Denty compiles with `exactOptionalPropertyTypes`. Zod schemas and request
 * builders produce `{ key?: T | undefined }`, while repositories declare
 * `{ key?: T }`. `withoutUndefined` removes keys whose value is `undefined`
 * (recursively through plain objects and arrays) so both shapes meet without
 * widening every repository signature. JSON serialisation drops those keys
 * anyway, so runtime behaviour is unchanged.
 */
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type WithoutUndefined<T> = T extends
  Primitive | Date | Blob | File | Uint8Array | ((...args: never[]) => unknown)
  ? T
  : T extends readonly (infer U)[]
    ? WithoutUndefined<U>[]
    : T extends object
      ? { [K in keyof T as undefined extends T[K] ? never : K]: WithoutUndefined<T[K]> } & {
          [K in keyof T as undefined extends T[K] ? K : never]?: WithoutUndefined<
            Exclude<T[K], undefined>
          >;
        }
      : T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

export function withoutUndefined<T>(value: T): WithoutUndefined<T> {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => withoutUndefined(item)) as WithoutUndefined<T>;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) result[key] = withoutUndefined(entry);
    }
    return result as WithoutUndefined<T>;
  }
  return value as WithoutUndefined<T>;
}
