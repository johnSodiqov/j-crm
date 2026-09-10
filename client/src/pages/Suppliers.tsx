import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { get, post } from "../api/client";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { money } from "../utils/format";
import { useLanguage } from "../utils/i18n";

function purchaseStatus(purchase: any) {
  const remaining = Number(purchase.totalAmount) - Number(purchase.paidAmount);
  if (remaining <= 0) return "Погашен";
  if (!purchase.dueDate) return "Активен";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(purchase.dueDate);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  return days < 0 ? "Просрочен" : days <= 3 ? "Срок близко" : "Активен";
}

export function Suppliers() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: () => get("/suppliers") });
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const create = useMutation({ mutationFn: () => post("/suppliers", { name, phone, contactPerson }), onSuccess: () => { setName(""); setPhone(""); setContactPerson(""); queryClient.invalidateQueries({ queryKey: ["suppliers"] }); } });
  const pay = useMutation({ mutationFn: () => post("/suppliers/payment", { purchaseId, amount: Number(paymentAmount), method: paymentMethod }), onSuccess: () => { setPurchaseId(""); setPaymentAmount(""); queryClient.invalidateQueries({ queryKey: ["suppliers"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } });
  const rows = (data || []).map((supplier: any) => ({ ...supplier, totalPurchases: supplier.purchases.reduce((sum: number, purchase: any) => sum + Number(purchase.totalAmount), 0), paidAmount: supplier.purchases.reduce((sum: number, purchase: any) => sum + Number(purchase.paidAmount), 0), remaining: supplier.purchases.reduce((sum: number, purchase: any) => sum + Math.max(0, Number(purchase.totalAmount) - Number(purchase.paidAmount)), 0) }));
  const selected = (data || []).find((supplier: any) => supplier.id === selectedId);
  const purchases = (data || []).flatMap((supplier: any) => supplier.purchases.map((purchase: any) => ({ ...purchase, supplierName: supplier.name, remaining: Math.max(0, Number(purchase.totalAmount) - Number(purchase.paidAmount)), statusLabel: t(purchaseStatus(purchase)) }))).filter((purchase: any) => purchase.remaining > 0);
  const profilePurchases = useMemo(() => (selected?.purchases || []).map((purchase: any) => ({ ...purchase, remaining: Math.max(0, Number(purchase.totalAmount) - Number(purchase.paidAmount)), statusLabel: t(purchaseStatus(purchase)) })), [selected, t]);
  const profilePayments = selected?.purchases?.flatMap((purchase: any) => (purchase.payments || []).map((payment: any) => ({ ...payment, purchaseId: purchase.id }))) || [];
  return <>
    <Header title={t("Поставщики")} />
    <div className="card"><form className="grid grid4" onSubmit={(event) => { event.preventDefault(); if (name.trim()) create.mutate(); }}><label className="label">{t("Название")}<input className="input" value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="label">{t("Телефон")}<input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="label">{t("Контактное лицо")}<input className="input" value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} /></label><button className="button" type="submit" disabled={create.isPending}><Plus size={16} /> {t("Добавить поставщика")}</button></form></div>
    <div className="card" style={{ marginTop: 16 }}><h2 className="display">{t("Оплата поставщику")}</h2><form className="grid grid4" onSubmit={(event) => { event.preventDefault(); if (purchaseId && Number(paymentAmount) > 0) pay.mutate(); }}><label className="label">{t("Закупка")}<select className="input" value={purchaseId} onChange={(event) => setPurchaseId(event.target.value)}><option value="">{t("Выберите закупку")}</option>{purchases.map((purchase: any) => <option key={purchase.id} value={purchase.id}>{purchase.supplierName}: {t("долг")} {money(purchase.remaining)} ({purchase.statusLabel})</option>)}</select></label><label className="label">{t("Сумма")}<input className="input" type="number" min="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label><label className="label">{t("Способ оплаты")}<select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="CASH">{t("Наличные")}</option><option value="CARD">{t("Карта")}</option><option value="TRANSFER">{t("Перевод")}</option></select></label><button className="button" type="submit" disabled={pay.isPending || !purchaseId}><Plus size={16} /> {t("Внести платеж")}</button></form>{pay.isError && <div className="error">{(pay.error as Error).message}</div>}</div>
    <div className="grid grid2" style={{ marginTop: 16 }}><div className="card">{isLoading ? <p>Загрузка...</p> : <Table rows={rows} cols={["name", "phone", "contactPerson", "totalPurchases", "paidAmount", "remaining"]} labels={["Поставщик", "Телефон", "Контакт", "Закупки", "Оплачено", "Долг"]} actions={(supplier) => <button className="button secondary" onClick={() => setSelectedId(supplier.id)}>Профиль</button>} />}</div><div className="card">{selected ? <><h2 className="display">{selected.name}</h2><p className="muted">{selected.phone || "Телефон не указан"} {selected.contactPerson ? `• ${selected.contactPerson}` : ""}</p><h3>История закупок</h3><Table rows={profilePurchases} cols={["createdAt", "totalAmount", "paidAmount", "remaining", "dueDate", "statusLabel"]} labels={["Дата", "Сумма", "Оплачено", "Остаток", "Срок", "Статус"]} /><h3>История платежей</h3><Table rows={profilePayments} cols={["createdAt", "purchaseId", "amount", "method"]} labels={["Дата", "Закупка", "Сумма", "Способ"]} /></> : <p className="muted">Выберите поставщика, чтобы открыть профиль</p>}</div></div>
  </>;
}
