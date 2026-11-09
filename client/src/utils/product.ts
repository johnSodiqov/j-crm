export const productUnits = ["шт", "кг", "г", "л", "мл", "м", "упак.", "коробка"] as const;

export function quantityStep(unit?: string) {
  return unit && ["шт", "упак.", "коробка"].includes(unit) ? "1" : "0.001";
}

export function quantityLabel(quantity: number | string, unit?: string) {
  return `${quantity} ${unit || "шт"}`;
}