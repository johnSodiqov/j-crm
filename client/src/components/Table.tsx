import { useState } from "react";
import { money, saleNumber } from "../utils/format";
import { useLanguage } from "../utils/i18n";
import { quantityLabel } from "../utils/product";

type TableProps = {
  rows: any[];
  cols: string[];
  labels: string[];
  actions?: (row: any) => React.ReactNode;
};

function searchableText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "object") return Object.values(value).map(searchableText).join(" ");
  return String(value);
}

export function Table({ rows, cols, labels, actions }: TableProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRows = normalizedSearch ? rows.filter((row) => {
    const values = cols.map((column) => {
      const raw = column === "_count" ? row._count?.products : row[column];
      if (column === "quantity" || column === "stock" || column === "minStock" || column === "beforeStock" || column === "afterStock" || column === "previousStock" || column === "newStock") {
        return quantityLabel(raw, row.unit || row.product?.unit);
      }
      return searchableText(raw);
    });
    return values.join(" ").toLocaleLowerCase().includes(normalizedSearch);
  }) : rows;
  const value = (row: any, column: string) => {
    const raw = column === "_count" ? row._count?.products : row[column];
    if (column === "id") return <span title={`ID: ${raw}`}>{saleNumber(raw)}</span>;
    if (column === "user") return raw?.name || raw?.email || "Система";
    if (column === "category") return raw?.name || "-";
    if (column === "sku") return <span className="sku-cell">{raw}</span>;
    if (column === "stockStatus") {
      return (
        <span
          className={`badge ${raw === "Мало" ? "warn" : raw === "Нет в наличии" ? "bad" : ""}`}
        >
          {raw}
        </span>
      );
    }
    if (column === "active") return raw ? "Активен" : "Заблокирован";
    if (["stock", "minStock", "quantity", "beforeStock", "afterStock", "previousStock", "newStock"].includes(column)) return raw == null ? "-" : quantityLabel(raw, row.unit || row.product?.unit);
    if (["totalAmount", "totalProfit", "salePrice", "purchasePrice", "revenue", "profit", "amount", "remaining", "totalPurchases", "paidAmount"].includes(column)) return money(raw);
    if (column === "createdAt" || column === "updatedAt" || column === "date" || column === "dueDate") return raw ? new Date(raw).toLocaleString("ru-RU") : "-";
    return raw ?? "-";
  };

  return (
    <div className="table-container">
      <input className="input table-search" type="search" placeholder={t("Поиск по таблице")} aria-label={t("Поиск по таблице")} value={search} onChange={(event) => setSearch(event.target.value)} />
      <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            {labels.map((label) => <th key={label}>{t(label)}</th>)}
            {actions && <th>{t("Действия")}</th>}
          </tr>
        </thead>
        <tbody>
          {filteredRows.length ? filteredRows.map((row, index) => (
            <tr key={row.id || index}>
              {cols.map((column) => <td key={column}>{value(row, column)}</td>)}
              {actions && <td>{actions(row)}</td>}
            </tr>
          )) : (
            <tr>
              <td colSpan={cols.length + (actions ? 1 : 0)} className="muted">{rows.length && normalizedSearch ? t("Ничего не найдено") : t("Нет данных")}</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
