import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Pencil, Plus } from "lucide-react";
import { Header } from "../components/Header";
import { Modal } from "../components/Modal";
import { Table } from "../components/Table";
import { get, patch, post } from "../api/client";
import { getCurrentUser, money } from "../utils/format";
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
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [customerForm, setCustomerForm] = useState<any>(null);
  const [payment, setPayment] = useState({ debtId: "", amount: "", method: "CASH" });
  const { data: customers, isLoading } = useQuery({ queryKey: ["customers", search], queryFn: () => get(`/customers${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`) });
  const { data: profile } = useQuery({ queryKey: ["customer", selectedId], queryFn: () => get(`/customers/${selectedId}`), enabled: !!selectedId });
  const saveCustomer = useMutation({
    mutationFn: () => customerForm.id
      ? patch(`/customers/${customerForm.id}`, { name: customerForm.name.trim(), phone: customerForm.phone.trim() || undefined, address: customerForm.address.trim() || undefined })
      : post("/customers", { name: customerForm.name.trim(), phone: customerForm.phone.trim() || undefined, address: customerForm.address.trim() || undefined }),
    onSuccess: (customer: any) => { setCustomerForm(null); setSelectedId(customer.id); queryClient.invalidateQueries({ queryKey: ["customers"] }); queryClient.invalidateQueries({ queryKey: ["customer", customer.id] }); },
  });
  const payDebt = useMutation({
    mutationFn: () => post("/debts/payment", { debtId: payment.debtId, amount: Number(payment.amount), method: payment.method }),
    onSuccess: () => { setPayment({ debtId: "", amount: "", method: "CASH" }); queryClient.invalidateQueries({ queryKey: ["customer", selectedId] }); queryClient.invalidateQueries({ queryKey: ["debts"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
  const debts = useMemo(() => (profile?.debts || []).map((debt: any) => ({ ...debt, remaining: Math.max(0, Number(debt.amount) - Number(debt.paidAmount)), statusLabel: debtStatus(debt) })), [profile]);
  const balance = debts.reduce((sum: number, debt: any) => sum + debt.remaining, 0);
  const localizedDebts = debts.map((debt: any) => ({ ...debt, statusLabel: t(debt.statusLabel) }));
  const purchases = (profile?.sales || []).map((sale: any) => ({ ...sale, products: sale.items.map((item: any) => `${item.product.name} x${item.quantity}`).join(", ") }));
  const returns = (profile?.sales || []).flatMap((sale: any) => (sale.returns || []).flatMap((entry: any) => entry.items.map((item: any) => ({ id: entry.id, createdAt: entry.createdAt, reason: entry.reason, product: item.product.name, quantity: item.quantity, amount: item.amount }))));
  const openCreate = () => setCustomerForm({ name: "", phone: "", address: "" });
  return <>
    <Header title={t("Клиенты")} action={<button className="button" onClick={openCreate}><Plus size={16} /> {t("Новый клиент")}</button>} />
    <div className="card customer-toolbar"><input className="input" placeholder={t("Поиск по имени или телефону")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    <div className="grid grid2">
      <div className="card">{isLoading ? <p>{t("Загрузка...")}</p> : <Table rows={(customers || []).map((customer: any) => ({ ...customer, checks: customer._count?.sales || 0 }))} cols={["name", "phone", "checks"]} labels={[t("Клиент"), t("Телефон"), t("Чеки")]} actions={(customer) => <div className="table-actions"><button className="button secondary" onClick={() => setSelectedId(customer.id)}>{t("Профиль")}</button>{isAdmin && <button className="button secondary icon-button" title={t("Редактировать клиента")} aria-label={t("Редактировать клиента")} onClick={() => setCustomerForm({ id: customer.id, name: customer.name, phone: customer.phone || "", address: customer.address || "" })}><Pencil size={15} /></button>}</div>} />}</div>
      {profile ? <div className="card customer-profile">
        <div className="top"><div><h2 className="display">{profile.name}</h2><p className="muted">{profile.phone || t("Телефон не указан")} {profile.address ? `• ${profile.address}` : ""}</p></div>{isAdmin && <button className="button secondary" onClick={() => setCustomerForm({ id: profile.id, name: profile.name, phone: profile.phone || "", address: profile.address || "" })}><Pencil size={15} /> {t("Изменить")}</button>}</div>
        <div className="metric">{money(balance)}</div><div className="label">{t("Текущая задолженность")}</div><h3>{t("Долги")}</h3><Table rows={localizedDebts} cols={["amount", "paidAmount", "remaining", "dueDate", "statusLabel"]} labels={[t("Сумма"), t("Оплачено"), t("Остаток"), t("Срок"), t("Статус")]} actions={isAdmin ? (debt) => debt.status === "ACTIVE" && <button className="button secondary icon-button" title={t("Погасить долг")} aria-label={t("Погасить долг")} onClick={() => setPayment({ ...payment, debtId: debt.id, amount: String(debt.remaining) })}><CreditCard size={15} /></button> : undefined} />
        {isAdmin && <><div className="customer-payment-form"><input className="input" type="number" min="0.01" placeholder={t("Сумма платежа")} value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /><select className="select" value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value })}><option value="CASH">{t("Наличные")}</option><option value="CARD">{t("Банковская карта")}</option><option value="TRANSFER">{t("Перевод")}</option></select><button className="button" disabled={!payment.debtId || !payment.amount || payDebt.isPending} onClick={() => payDebt.mutate()}>{t("Погасить долг")}</button></div>{payDebt.isError && <div className="error">{(payDebt.error as Error).message}</div>}</>}
        <h3>{t("Платежи")}</h3><Table rows={profile.payments || []} cols={["amount", "method", "createdAt"]} labels={[t("Сумма"), t("Способ"), t("Дата")]} />
        <h3>{t("История покупок")}</h3><Table rows={purchases} cols={["createdAt", "products", "totalAmount", "paymentMethod"]} labels={[t("Дата"), t("Товары"), t("Сумма"), t("Оплата")]} />
        {isAdmin && <><h3>{t("История возвратов")}</h3><Table rows={returns} cols={["createdAt", "product", "quantity", "amount", "reason"]} labels={[t("Дата"), t("Товар"), t("Количество"), t("Сумма"), t("Причина")]} /></>}
      </div> : <div className="card"><p className="muted">{t("Выберите клиента, чтобы открыть профиль")}</p></div>}
    </div>
    {customerForm && <Modal title={customerForm.id ? t("Изменить клиента") : t("Новый клиент")} close={() => setCustomerForm(null)}><form className="user-edit-form" onSubmit={(event) => { event.preventDefault(); if (customerForm.name.trim()) saveCustomer.mutate(); }}><label>{t("Имя")}<input className="input" autoFocus required value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} /></label><label>{t("Телефон")}<input className="input" type="tel" value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></label><label>{t("Адрес")}<input className="input" value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} /></label>{saveCustomer.isError && <div className="error">{(saveCustomer.error as Error).message}</div>}<button className="button" type="submit" disabled={!customerForm.name.trim() || saveCustomer.isPending}>{saveCustomer.isPending ? t("Сохранение...") : t("Сохранить")}</button></form></Modal>}
  </>;
}
