export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export function brand<TValue, TBrand extends string>(
  value: TValue,
): Brand<TValue, TBrand> {
  return value as Brand<TValue, TBrand>;
}
