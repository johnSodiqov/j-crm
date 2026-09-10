export const money = (value: any) => `${Number(value || 0).toLocaleString("ru-RU")} сум`;

export const saleNumber = (id: string) => `#${String(id).slice(-6).toUpperCase()}`;

export const getCurrentUser = () =>
  JSON.parse(localStorage.getItem("user") || "null");
