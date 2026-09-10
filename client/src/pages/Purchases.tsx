import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { get, post } from "../api/client";
import { Header } from "../components/Header";
import { money } from "../utils/format";
import { useLanguage } from "../utils/i18n";

type Line = { productId: string; quantity: number; unitCost: number };

export function Purchases() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => get("/suppliers") });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => get("/products?limit=100") });
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1, unitCost: 0 }]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [logisticsCost, setLogisticsCost] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  const landedTotal = total + logisticsCost;
  const create = useMutation({
    mutationFn: () => post("/purchases", { supplierId, items: lines, paidAmount, logisticsCost, dueDate: dueDate || undefined }),
    onSuccess: () => {
      setLines([{ productId: "", quantity: 1, unitCost: 0 }]);
      setPaidAmount(0);
      setLogisticsCost(0);
      setDueDate("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      alert(t("Закупка оформлена"));
    },
  });
  const updateLine = (index: number, patch: Partial<Line>) => setLines(lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  return <>
    <Header title={t("Новая закупка")} />
    <div className="card">
      <label className="label">{t("Поставщик")}
        <select className="input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
          <option value="">{t("Выберите поставщика")}</option>
          {(suppliers || []).map((supplier: any) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </label>
      <div className="cart-items">
        {lines.map((line, index) => <div className="cart-line" key={index}>
          <select className="input" value={line.productId} onChange={(event) => { const product = (products?.items || []).find((item: any) => item.id === event.target.value); updateLine(index, { productId: event.target.value, unitCost: Number(product?.purchasePrice || 0) }); }}>
            <option value="">{t("Выберите товар")}</option>
            {(products?.items || []).map((product: any) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          <input className="input cart-qty" type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} />
          <input className="input" type="number" min="0" value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: Number(event.target.value) })} />
          <b className="cart-total">{money(line.quantity * line.unitCost)}</b>
          {lines.length > 1 && <button className="button secondary" type="button" title={t("Удалить строку")} aria-label={t("Удалить строку")} onClick={() => setLines(lines.filter((_, lineIndex) => lineIndex !== index))}><Trash2 size={15} /></button>}
        </div>)}
      </div>
      <button className="button secondary" type="button" onClick={() => setLines([...lines, { productId: "", quantity: 1, unitCost: 0 }])}><Plus size={16} /> {t("Добавить товар")}</button>
      <div className="grid grid3" style={{ marginTop: 16 }}>
          <label className="label">{t("Сумма закупки")}<input className="input" value={total} readOnly /></label>
          <label className="label">{t("Логистика и разгрузка")}<input className="input" type="number" min="0" value={logisticsCost} onChange={(event) => setLogisticsCost(Number(event.target.value))} /></label>
          <label className="label">{t("Фактическая себестоимость")}<input className="input" value={landedTotal} readOnly /></label>
          <label className="label">{t("Оплачено")}<input className="input" type="number" min="0" max={total} value={paidAmount} onChange={(event) => setPaidAmount(Number(event.target.value))} /></label>
          <label className="label">{t("Срок оплаты")}<input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
      </div>
      {create.isError && <div className="error">{(create.error as Error).message}</div>}
      <button className="button" disabled={!supplierId || lines.some((line) => !line.productId || line.quantity < 1) || total <= 0 || create.isPending} onClick={() => create.mutate()}>{t("Оформить закупку")}</button>
    </div>
  </>;
}
