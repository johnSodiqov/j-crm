import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { useLanguage } from "../utils/i18n";
import { get, post } from "../api/client";

export function Debts() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("ACTIVE");
  const [debtId, setDebtId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const { data, isLoading } = useQuery({ queryKey: ["debts", status], queryFn: () => get(`/debts?status=${status}`) });
  const pay = useMutation({ mutationFn: () => post("/debts/payment", { debtId, amount: Number(amount), method }), onSuccess: () => { setDebtId(""); setAmount(""); queryClient.invalidateQueries({ queryKey: ["debts"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } });
  const rows = (data || []).map((debt: any) => ({ ...debt, customerName: debt.customer.name, phone: debt.customer.phone, dueDate: debt.dueDate || "", statusLabel: debt.overdue ? "Просрочен" : debt.upcoming ? "Срок близко" : debt.status === "PAID" ? "Погашен" : "Активен" }));
  return <><Header title="Долги клиентов" /><div className="card"><div className="grid grid4"><label className="label">{t("Статус")}<select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ACTIVE">{t("Активные")}</option><option value="PAID">{t("Погашенные")}</option><option value="ALL">{t("Все")}</option></select></label><label className="label">{t("Долг")}<select className="input" value={debtId} onChange={(event) => setDebtId(event.target.value)}><option value="">{t("Выберите долг")}</option>{rows.filter((debt: any) => debt.status === "ACTIVE").map((debt: any) => <option key={debt.id} value={debt.id}>{debt.customerName}: {debt.remaining}</option>)}</select></label><label className="label">{t("Сумма платежа")}<input className="input" type="number" min="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="label">{t("Способ оплаты")}<select className="input" value={method} onChange={(event) => setMethod(event.target.value)}><option value="CASH">{t("Наличные")}</option><option value="CARD">{t("Карта")}</option><option value="TRANSFER">{t("Перевод")}</option></select></label></div><button className="button" disabled={!debtId || !amount || pay.isPending} onClick={() => pay.mutate()}>{t("Погасить долг")}</button>{pay.isError && <div className="error">{(pay.error as Error).message}</div>}</div><div className="card" style={{ marginTop: 16 }}>{isLoading ? <p>{t("Загрузка...")}</p> : <Table rows={rows} cols={["customerName", "phone", "amount", "remaining", "createdAt", "dueDate", "statusLabel"]} labels={["Клиент", "Телефон", "Сумма", "Остаток", "Возникновение", "Срок", "Статус"]} />}</div></>;
}
