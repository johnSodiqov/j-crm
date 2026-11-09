import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Package, Plus, UserPlus, X } from "lucide-react";
import { get, post } from "../api/client";
import { Header } from "../components/Header";
import { MoneyInput } from "../components/MoneyInput";
import { Modal } from "../components/Modal";
import { money } from "../utils/format";
import { useLanguage } from "../utils/i18n";
import { quantityStep, quantityLabel } from "../utils/product";

type SalesSelectOption = { value: string; label: string };
type SaleDraft = {
  id: string;
  number: number;
  cart: any[];
  customerId: string;
  paymentMethod: string;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
  debtAmount: number;
  dueDate: string;
};
type SalesTabs = { activeId: string; nextNumber: number; drafts: SaleDraft[] };

const SALES_TABS_STORAGE_KEY = "sales-receipt-tabs";

function createSaleDraft(number: number): SaleDraft {
  return {
    id: `receipt-${Date.now()}-${number}`,
    number,
    cart: [],
    customerId: "",
    paymentMethod: "CASH",
    cashAmount: 0,
    cardAmount: 0,
    transferAmount: 0,
    debtAmount: 0,
    dueDate: "",
  };
}

function loadSalesTabs(): SalesTabs {
  const saved = localStorage.getItem(SALES_TABS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as SalesTabs;
      if (Array.isArray(parsed.drafts) && parsed.drafts.length > 0) {
        const drafts = parsed.drafts.filter((draft) =>
          draft && typeof draft.id === "string" && Number.isFinite(Number(draft.number)) && Array.isArray(draft.cart),
        );
        if (drafts.length === 0) throw new Error("Invalid saved receipt tabs");
        const activeId = drafts.some((draft) => draft.id === parsed.activeId)
          ? parsed.activeId
          : drafts[0].id;
        return {
          activeId,
          nextNumber: Math.max(Number(parsed.nextNumber) || 1, ...drafts.map((draft) => Number(draft.number) + 1)),
          drafts,
        };
      }
    } catch {
      const draft = createSaleDraft(1);
      return { activeId: draft.id, nextNumber: 2, drafts: [draft] };
    }
  }
  const draft = createSaleDraft(1);
  return { activeId: draft.id, nextNumber: 2, drafts: [draft] };
}

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

  const [tabs, setTabs] = useState<SalesTabs>(loadSalesTabs);
  const activeDraft = tabs.drafts.find((draft) => draft.id === tabs.activeId) || tabs.drafts[0];
  const { cart, customerId, paymentMethod, cashAmount, cardAmount, transferAmount, debtAmount, dueDate } = activeDraft;
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  useEffect(() => {
    localStorage.setItem(SALES_TABS_STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs]);

  const updateActiveDraft = (update: Partial<SaleDraft>) => {
    setTabs((current) => ({
      ...current,
      drafts: current.drafts.map((draft) => draft.id === current.activeId ? { ...draft, ...update } : draft),
    }));
  };

  const addReceiptTab = () => setTabs((current) => {
    const draft = createSaleDraft(current.nextNumber);
    return {
      activeId: draft.id,
      nextNumber: current.nextNumber + 1,
      drafts: [...current.drafts, draft],
    };
  });

  const closeReceiptTab = (id: string) => {
    if (tabs.drafts.length < 2) return;
    const draft = tabs.drafts.find((item) => item.id === id);
    if (draft?.cart.length && !window.confirm(t("Удалить чек с товарами?"))) return;
    setTabs((current) => {
      const index = current.drafts.findIndex((item) => item.id === id);
      const drafts = current.drafts.filter((item) => item.id !== id);
      return {
        ...current,
        drafts,
        activeId: current.activeId === id ? drafts[Math.max(0, index - 1)].id : current.activeId,
      };
    });
  };

  const total = cart.reduce((sum, item) => sum + Number(item.salePrice) * Number(item.qty), 0);
  const mixedTotal = cashAmount + cardAmount + transferAmount + debtAmount;
  const updateDraftById = (id: string, update: Partial<SaleDraft>) => {
    setTabs((current) => ({
      ...current,
      drafts: current.drafts.map((draft) => draft.id === id ? { ...draft, ...update } : draft),
    }));
  };

  const sell = useMutation({
    mutationFn: (draft: SaleDraft) => {
      const payments = draft.paymentMethod === "MIXED"
        ? [
            { method: "CASH", amount: draft.cashAmount },
            { method: "CARD", amount: draft.cardAmount },
            { method: "TRANSFER", amount: draft.transferAmount },
            { method: "DEBT", amount: draft.debtAmount },
          ].filter((row) => row.amount > 0)
        : [{ method: draft.paymentMethod, amount: draft.cart.reduce((sum, item) => sum + Number(item.salePrice) * Number(item.qty), 0) }];
      return post("/sales", {
        items: draft.cart.map((item) => ({ productId: item.id, quantity: item.qty })),
        customerId: draft.customerId || undefined,
        paymentMethod: draft.paymentMethod,
        dueDate: draft.dueDate || undefined,
        payments,
      });
    },
    onSuccess: (_, soldDraft) => {
      updateDraftById(soldDraft.id, {
        cart: [],
        customerId: "",
        cashAmount: 0,
        cardAmount: 0,
        transferAmount: 0,
        debtAmount: 0,
        dueDate: "",
        paymentMethod: "CASH",
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      alert("Продажа оформлена");
    },
  });

  const add = (product: any) => {
    const existing = cart.find((item) => item.id === product.id);
    const increment = Math.min(1, Number(product.stock) - (existing?.qty || 0));
    if (increment <= 0) return;
    if (existing) {
      updateActiveDraft({ cart: cart.map((item) => item.id === product.id ? { ...item, qty: Number((item.qty + increment).toFixed(3)) } : item) });
      return;
    }
    updateActiveDraft({ cart: [...cart, { ...product, qty: increment }] });
  };

  const isPaymentValid = paymentMethod !== "MIXED" ? total > 0 : Math.abs(mixedTotal - total) < 0.01;
  const createCustomer = useMutation({
    mutationFn: (input: { tabId: string; name: string; phone: string; address: string }) =>
      post("/customers", { name: input.name, phone: input.phone, address: input.address }),
    onSuccess: (customer: any, input) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      updateDraftById(input.tabId, { customerId: customer.id });
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      setNewCustomerOpen(false);
    },
  });

  return (
    <div className="sales-page">
      <Header title="Новая продажа" />
      <div className="receipt-tabs-bar">
        <div className="receipt-tabs" role="tablist" aria-label={t("Чеки")}>
          {tabs.drafts.map((draft) => (
            <div className={`receipt-tab${draft.id === activeDraft.id ? " is-active" : ""}`} key={draft.id} role="presentation">
              <button
                className="receipt-tab-select"
                type="button"
                role="tab"
                aria-selected={draft.id === activeDraft.id}
                onClick={() => setTabs((current) => ({ ...current, activeId: draft.id }))}
              >
                <span>{t("Чек")} {draft.number}</span>
                {draft.cart.length > 0 && <span className="receipt-tab-count">{draft.cart.length}</span>}
              </button>
              {tabs.drafts.length > 1 && <button className="receipt-tab-close" type="button" aria-label={`${t("Закрыть чек")} ${draft.number}`} title={t("Закрыть чек")} onClick={() => closeReceiptTab(draft.id)}>
                <X size={14} />
              </button>}
            </div>
          ))}
        </div>
        <button className="button secondary receipt-tab-add" type="button" onClick={addReceiptTab}>
          <Plus size={16} /> {t("Новый чек")}
        </button>
      </div>
      <div className="grid grid2">
        <div className="card sales-products">
          <h2 className="display">{t("Выберите товар")}</h2>
          <div className="sales-products-grid">
            {(data?.items || []).map((product: any) => (
              <div className="product-card" key={product.id}>
                <div className="product-card-image"><Package size={30} strokeWidth={1.8} /></div>
                <div className="product-card-body">
                  <div className="product-card-title">{product.name}</div>
                  <div className="product-card-price">{money(product.salePrice)} / {product.unit || "шт"}</div>
                  <div className="product-card-stock">{t("Остаток")}: {quantityLabel(product.stock, product.unit)}</div>
                </div>
                <button className="button secondary product-card-action" type="button" onClick={() => add(product)} disabled={Number(product.stock) <= 0}>
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
                <input className="input cart-qty" type="number" aria-label={`${t("Количество")} (${item.unit})`} min={quantityStep(item.unit) === "1" ? "1" : "0.001"} max={item.stock} step={quantityStep(item.unit)} value={item.qty || ""} onChange={(event) => updateActiveDraft({ cart: cart.map((row) => row.id === item.id ? { ...row, qty: Number(event.target.value) } : row) })} />
                <b className="cart-total">{money(item.salePrice * item.qty)}</b>
              </div>
            ))}
          </div>

          <h2 className="cart-summary">{t("Итого")}: {money(total)}</h2>

          <div className="sales-field">
            <div className="label">{t("Клиент")}</div>
            <div className="sales-select-row">
              <SalesSelect value={customerId} placeholder={t("Без клиента")} onChange={(value) => updateActiveDraft({ customerId: value })} options={[{ value: "", label: t("Без клиента") }, ...(customers || []).map((customer: any) => ({ value: customer.id, label: `${customer.name}${customer.phone ? ` (${customer.phone})` : ""}` }))]} />
              <button className="button secondary icon-button" type="button" title={t("Добавить клиента")} aria-label={t("Добавить клиента")} onClick={() => setNewCustomerOpen(true)}>
                <UserPlus size={17} />
              </button>
            </div>
          </div>

          <label className="label">
            {t("Способ оплаты")}
            <SalesSelect value={paymentMethod} onChange={(value) => updateActiveDraft({ paymentMethod: value })} options={[{ value: "CASH", label: t("Наличные") }, { value: "CARD", label: t("Банковская карта") }, { value: "TRANSFER", label: t("Перевод") }, { value: "DEBT", label: t("Долг") }, { value: "MIXED", label: t("Смешанная оплата") }]} />
          </label>

          {paymentMethod === "MIXED" && (
            <div className="mixed-payments">
              <label className="label">
                {t("Наличные")}
                <MoneyInput className="input" value={cashAmount} onValueChange={(value) => updateActiveDraft({ cashAmount: value === "" ? 0 : value })} />
              </label>
              <label className="label">
                {t("Банковская карта")}
                <MoneyInput className="input" value={cardAmount} onValueChange={(value) => updateActiveDraft({ cardAmount: value === "" ? 0 : value })} />
              </label>
              <label className="label">
                {t("Перевод")}
                <MoneyInput className="input" value={transferAmount} onValueChange={(value) => updateActiveDraft({ transferAmount: value === "" ? 0 : value })} />
              </label>
              <label className="label">
                {t("Долг")}
                <MoneyInput className="input" value={debtAmount} onValueChange={(value) => updateActiveDraft({ debtAmount: value === "" ? 0 : value })} />
              </label>
              <div className="muted">{t("Сумма")}: {money(mixedTotal)} / {money(total)}</div>
            </div>
          )}

          {(paymentMethod === "DEBT" || paymentMethod === "MIXED") && (
            <label className="label">
              {t("Срок погашения")}
              <input className="input" type="date" value={dueDate} onChange={(event) => updateActiveDraft({ dueDate: event.target.value })} />
            </label>
          )}

          {paymentMethod === "MIXED" && total > 0 && (
            <div className="muted">{t("Итого")}: {money(mixedTotal)} · {t("Долг")}: {money(debtAmount)}</div>
          )}

          <button className="button" type="button" disabled={!cart.length || !isPaymentValid || sell.isPending} onClick={() => sell.mutate(activeDraft)}>
            {sell.isPending ? t("Оформление...") : t("Оформить продажу")}
          </button>
          {sell.isError && <div className="error">{(sell.error as Error).message}</div>}
        </div>
      </div>
      {newCustomerOpen && <Modal title={t("Новый клиент")} close={() => setNewCustomerOpen(false)}>
        <form className="new-customer-form" onSubmit={(event) => { event.preventDefault(); if (newCustomerName.trim()) createCustomer.mutate({ tabId: activeDraft.id, name: newCustomerName, phone: newCustomerPhone, address: newCustomerAddress }); }}>
          <label>{t("Имя")}<input className="input" type="text" autoFocus required value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} /></label>
          <label>{t("Телефон")}<input className="input" type="tel" value={newCustomerPhone} onChange={(event) => setNewCustomerPhone(event.target.value)} /></label>
          <label>{t("Адрес")}<input className="input" type="text" value={newCustomerAddress} onChange={(event) => setNewCustomerAddress(event.target.value)} /></label>
          {createCustomer.isError && <div className="error">{(createCustomer.error as Error).message}</div>}
          <button className="button" type="submit" disabled={!newCustomerName.trim() || createCustomer.isPending}>{createCustomer.isPending ? t("Сохранение...") : t("Добавить клиента")}</button>
        </form>
      </Modal>}
    </div>
  );
}
