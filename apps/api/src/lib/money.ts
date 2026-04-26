export function toMoney(value: number) {
  return Number(value.toFixed(2));
}

export function formatMoney(value: number) {
  return toMoney(value);
}
