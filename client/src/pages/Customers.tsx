import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { get } from "../api/client";
import { money } from "../utils/format";
import { useLanguage } from "../utils/i18n";

function debtStatus(debt: any) {
  if (debt.status === "PAID" || Number(debt.amount) <= Number(debt.paidAmount)) return "Погашен";
  if (!debt.dueDate) return "Активен";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(debt.dueDate);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  return days < 0 ? "Просрочен" : days <= 3 ? "Срок близко" : "Активен";
}

export function Customers() {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState("");
  const { data: customers, isLoading } = useQuery({ queryKey: ["customers"], queryFn: () => get("/customers") });
  const { data: profile } = useQuery({ queryKey: ["customer", selectedId], queryFn: () => get(`/customers/${selectedId}`), enabled: !!selectedId });
  const debts = useMemo(() => (profile?.debts || []).map((debt: any) => ({ ...debt, remaining: Math.max(0, Number(debt.amount) - Number(debt.paidAmount)), statusLabel: debtStatus(debt) })), [profile]);
  const balance = debts.reduce((sum: number, debt: any) => sum + debt.remaining, 0);
  const localizedDebts = debts.map((debt: any) => ({ ...debt, statusLabel: t(debt.statusLabel) }));
  return <><Header title={t("Клиенты")} /><div className="grid grid2"><div className="card">{isLoading ? <p>{t("Загрузка...")}</p> : <Table rows={customers || []} cols={["name", "phone", "_count"]} labels={[t("Клиент"), t("Телефон"), t("Чеки")]} actions={(customer) => <button className="button secondary" onClick={() => setSelectedId(customer.id)}>{t("Профиль")}</button>} />}</div>{profile ? <div className="card"><h2 className="display">{profile.name}</h2><p className="muted">{profile.phone || t("Телефон не указан")} {profile.address ? `• ${profile.address}` : ""}</p><div className="metric">{money(balance)}</div><div className="label">{t("Текущая задолженность")}</div><h3>{t("Долги")}</h3><Table rows={localizedDebts} cols={["amount", "paidAmount", "remaining", "dueDate", "statusLabel"]} labels={[t("Сумма"), t("Оплачено"), t("Остаток"), t("Срок"), t("Статус")]} /><h3>{t("Платежи")}</h3><Table rows={profile.payments || []} cols={["amount", "method", "createdAt"]} labels={[t("Сумма"), t("Способ"), t("Дата")]}/></div> : <div className="card"><p className="muted">{t("Выберите клиента, чтобы открыть профиль")}</p></div>}</div></>;
}
