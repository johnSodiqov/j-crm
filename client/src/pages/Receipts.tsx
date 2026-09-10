import { useQuery } from "@tanstack/react-query";
import { get } from "../api/client";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { getCurrentUser, money } from "../utils/format";

export function Receipts() {
  const isAdmin = getCurrentUser()?.role === "ADMIN";
  const { data, isLoading } = useQuery({ queryKey: ["sales", "receipts"], queryFn: () => get("/sales?limit=100") });
  const rows = (data || []).map((sale: any) => ({ ...sale, itemsLabel: sale.items.map((item: any) => `${item.product.name} x${item.quantity}`).join(", "), paymentLabel: sale.payments?.map((payment: any) => `${payment.method}: ${money(payment.amount)}`).join(", ") || "Наличные" }));
  return <><Header title="Чеки" /><div className="card">{isLoading ? <p>Загрузка...</p> : <Table rows={rows} cols={isAdmin ? ["id", "createdAt", "itemsLabel", "paymentLabel", "totalAmount", "totalProfit"] : ["id", "createdAt", "itemsLabel", "paymentLabel", "totalAmount"]} labels={isAdmin ? ["Чек", "Дата", "Товары", "Оплата", "Сумма", "Прибыль"] : ["Чек", "Дата", "Товары", "Оплата", "Сумма"]} />}</div></>;
}
