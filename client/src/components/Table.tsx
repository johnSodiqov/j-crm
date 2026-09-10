import { money, saleNumber } from "../utils/format";
import { useLanguage } from "../utils/i18n";

type TableProps = {
  rows: any[];
  cols: string[];
  labels: string[];
  actions?: (row: any) => React.ReactNode;
};

export function Table({ rows, cols, labels, actions }: TableProps) {
  const { t } = useLanguage();
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
    if (["totalAmount", "totalProfit", "salePrice", "purchasePrice", "revenue", "profit", "amount", "remaining", "totalPurchases", "paidAmount"].includes(column)) return money(raw);
    if (column === "createdAt" || column === "updatedAt" || column === "date" || column === "dueDate") return raw ? new Date(raw).toLocaleString("ru-RU") : "-";
    return raw ?? "-";
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            {labels.map((label) => <th key={label}>{t(label)}</th>)}
            {actions && <th>{t("Действия")}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id || index}>
              {cols.map((column) => <td key={column}>{value(row, column)}</td>)}
              {actions && <td>{actions(row)}</td>}
            </tr>
          )) : (
            <tr>
              <td colSpan={cols.length + (actions ? 1 : 0)} className="muted">{t("Нет данных")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
