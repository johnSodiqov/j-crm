import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Package, Plus, UserPlus } from "lucide-react";
import { get, post } from "../api/client";
import { Header } from "../components/Header";
import { Modal } from "../components/Modal";
import { money } from "../utils/format";
import { useLanguage } from "../utils/i18n";

type SalesSelectOption = { value: string; label: string };

function SalesSelect({ value, options, placeholder, onChange }: { value: string; options: SalesSelectOption[]; placeholder?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <div className={`sales-select${open ? " is-open" : ""}`} ref={rootRef}>
    <button className="sales-select-trigger" type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((current) => !current)}>
      <span className={!selected ? "sales-select-placeholder" : ""}>{selected?.label || placeholder || "Выберите значение"}</span>
      <ChevronDown size={18} aria-hidden="true" />
    </button>
    {open && <div className="sales-select-menu" role="listbox">
      {options.map((option) => <button className={`sales-select-option${option.value === value ? " is-selected" : ""}`} key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false); }}>
        <span>{option.label}</span>
        {option.value === value && <Check size={16} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}

export function Sales() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["products"], queryFn: () => get("/products?limit=100") });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => get("/customers") });

  const [cart, setCart] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [transferAmount, setTransferAmount] = useState(0);
  const [debtAmount, setDebtAmount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  const total = cart.reduce((sum, item) => sum + Number(item.salePrice) * Number(item.qty), 0);
  const mixedTotal = cashAmount + cardAmount + transferAmount + debtAmount;
  const paymentRows = paymentMethod === "MIXED"
    ? [
        { method: "CASH", amount: cashAmount },
        { method: "CARD", amount: cardAmount },
        { method: "TRANSFER", amount: transferAmount },
        { method: "DEBT", amount: debtAmount },
      ].filter((row) => row.amount > 0)
    : [{ method: paymentMethod, amount: total }];

  const sell = useMutation({
    mutationFn: () => post("/sales", {
      items: cart.map((item) => ({ productId: item.id, quantity: item.qty })),
      customerId: customerId || undefined,
      paymentMethod,
      dueDate: dueDate || undefined,
      payments: paymentRows,
    }),
    onSuccess: () => {
      setCart([]);
      setCustomerId("");
      setCashAmount(0);
      setCardAmount(0);
      setTransferAmount(0);
      setDebtAmount(0);
      setDueDate("");
      setPaymentMethod("CASH");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      alert("Продажа оформлена");
    },
  });

  const add = (product: any) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(cart.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      return;
    }
    setCart([...cart, { ...product, qty: 1 }]);
  };

  const isPaymentValid = paymentMethod !== "MIXED" ? total > 0 : Math.abs(mixedTotal - total) < 0.01;
  const createCustomer = useMutation({
    mutationFn: () => post("/customers", { name: newCustomerName, phone: newCustomerPhone, address: newCustomerAddress }),
    onSuccess: (customer: any) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerId(customer.id);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      setNewCustomerOpen(false);
    },
  });

  return (
    <div className="sales-page">
      <Header title="Новая продажа" />
      <div className="grid grid2">
        <div className="card sales-products">
          <h2 className="display">{t("Выберите товар")}</h2>
          <div className="sales-products-grid">
            {(data?.items || []).map((product: any) => (
              <div className="product-card" key={product.id}>
                <div className="product-card-image"><Package size={30} strokeWidth={1.8} /></div>
                <div className="product-card-body">
                  <div className="product-card-title">{product.name}</div>
                  <div className="product-card-price">{money(product.salePrice)}</div>
                  <div className="product-card-stock">{t("Остаток")}: {product.stock}</div>
                </div>
                <button className="button secondary product-card-action" type="button" onClick={() => add(product)} disabled={product.stock < 1}>
                  <Plus size={14} /> {t("Добавить")}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card sales-cart">
          <h2 className="display">{t("Корзина")}</h2>
          <div className="cart-items">
            {cart.map((item) => (
              <div className="cart-line" key={item.id}>
                <span className="cart-name">{item.name}</span>
                <input className="input cart-qty" type="number" min="1" max={item.stock} value={item.qty} onChange={(event) => setCart(cart.map((row) => row.id === item.id ? { ...row, qty: Number(event.target.value) } : row))} />
                <b className="cart-total">{money(item.salePrice * item.qty)}</b>
              </div>
            ))}
          </div>

          <h2 className="cart-summary">{t("Итого")}: {money(total)}</h2>

          <div className="sales-field">
            <div className="label">{t("Клиент")}</div>
            <div className="sales-select-row">
              <SalesSelect value={customerId} placeholder={t("Без клиента")} onChange={setCustomerId} options={[{ value: "", label: t("Без клиента") }, ...(customers || []).map((customer: any) => ({ value: customer.id, label: `${customer.name}${customer.phone ? ` (${customer.phone})` : ""}` }))]} />
              <button className="button secondary icon-button" type="button" title={t("Добавить клиента")} aria-label={t("Добавить клиента")} onClick={() => setNewCustomerOpen(true)}>
                <UserPlus size={17} />
              </button>
            </div>
          </div>

          <label className="label">
            {t("Способ оплаты")}
            <SalesSelect value={paymentMethod} onChange={setPaymentMethod} options={[{ value: "CASH", label: t("Наличные") }, { value: "CARD", label: t("Банковская карта") }, { value: "TRANSFER", label: t("Перевод") }, { value: "DEBT", label: t("Долг") }, { value: "MIXED", label: t("Смешанная оплата") }]} />
          </label>

          {paymentMethod === "MIXED" && (
            <div className="mixed-payments">
              <label className="label">
                {t("Наличные")}
                <input className="input" type="number" min="0" step="0.01" value={cashAmount} onChange={(event) => setCashAmount(Number(event.target.value) || 0)} />
              </label>
              <label className="label">
                {t("Банковская карта")}
                <input className="input" type="number" min="0" step="0.01" value={cardAmount} onChange={(event) => setCardAmount(Number(event.target.value) || 0)} />
              </label>
              <label className="label">
                {t("Перевод")}
                <input className="input" type="number" min="0" step="0.01" value={transferAmount} onChange={(event) => setTransferAmount(Number(event.target.value) || 0)} />
              </label>
              <label className="label">
                {t("Долг")}
                <input className="input" type="number" min="0" step="0.01" value={debtAmount} onChange={(event) => setDebtAmount(Number(event.target.value) || 0)} />
              </label>
              <div className="muted">{t("Сумма")}: {money(mixedTotal)} / {money(total)}</div>
            </div>
          )}

          {(paymentMethod === "DEBT" || paymentMethod === "MIXED") && (
            <label className="label">
              {t("Срок погашения")}
              <input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
          )}

          {paymentMethod === "MIXED" && total > 0 && (
            <div className="muted">{t("Итого")}: {money(mixedTotal)} · {t("Долг")}: {money(debtAmount)}</div>
          )}

          <button className="button" type="button" disabled={!cart.length || !isPaymentValid || sell.isPending} onClick={() => sell.mutate()}>
            {sell.isPending ? t("Оформление...") : t("Оформить продажу")}
          </button>
          {sell.isError && <div className="error">{(sell.error as Error).message}</div>}
        </div>
      </div>
      {newCustomerOpen && <Modal title={t("Новый клиент")} close={() => setNewCustomerOpen(false)}>
        <form className="new-customer-form" onSubmit={(event) => { event.preventDefault(); if (newCustomerName.trim()) createCustomer.mutate(); }}>
          <label>{t("Имя")}<input className="input" autoFocus required value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} /></label>
          <label>{t("Телефон")}<input className="input" type="tel" value={newCustomerPhone} onChange={(event) => setNewCustomerPhone(event.target.value)} /></label>
          <label>{t("Адрес")}<input className="input" value={newCustomerAddress} onChange={(event) => setNewCustomerAddress(event.target.value)} /></label>
          {createCustomer.isError && <div className="error">{(createCustomer.error as Error).message}</div>}
          <button className="button" type="submit" disabled={!newCustomerName.trim() || createCustomer.isPending}>{createCustomer.isPending ? t("Сохранение...") : t("Добавить клиента")}</button>
        </form>
      </Modal>}
    </div>
  );
}
