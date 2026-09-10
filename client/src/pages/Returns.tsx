import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { get, post } from "../api/client";
import { useLanguage } from "../utils/i18n";

export function Returns() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: sales } = useQuery({ queryKey: ["sales"], queryFn: () => get("/sales?limit=100") });
  const [saleId, setSaleId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const selectedSale = (sales || []).find((sale: any) => sale.id === saleId);
  const create = useMutation({ mutationFn: () => post("/returns", { saleId, productId, quantity, reason }), onSuccess: () => { setSaleId(""); setProductId(""); setQuantity(1); setReason(""); queryClient.invalidateQueries({ queryKey: ["products"] }); queryClient.invalidateQueries({ queryKey: ["warehouse"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); alert("Возврат оформлен"); } });
  return <><Header title="Возвраты" /><div className="card"><div className="grid grid4"><label className="label">{t("Чек")}<select className="input" value={saleId} onChange={(event) => { setSaleId(event.target.value); setProductId(""); }}><option value="">{t("Выберите чек")}</option>{(sales || []).map((sale: any) => <option key={sale.id} value={sale.id}>#{sale.id.slice(-6).toUpperCase()} · {new Date(sale.createdAt).toLocaleString("ru-RU")}</option>)}</select></label><label className="label">{t("Товар")}<select className="input" value={productId} onChange={(event) => setProductId(event.target.value)} disabled={!selectedSale}><option value="">{t("Выберите товар")}</option>{selectedSale?.items.map((item: any) => <option key={item.productId} value={item.productId}>{item.product.name} · {t("продано")} {item.quantity}</option>)}</select></label><label className="label">{t("Количество")}<input className="input" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><label className="label">{t("Причина")}<input className="input" value={reason} onChange={(event) => setReason(event.target.value)} required /></label></div><button className="button" disabled={!saleId || !productId || !reason.trim() || create.isPending} onClick={() => create.mutate()}>{t("Оформить возврат")}</button>{create.isError && <div className="error">{(create.error as Error).message}</div>}</div><div className="card" style={{ marginTop: 16 }}><h2 className="display">{t("Последние продажи")}</h2><Table rows={sales || []} cols={["id", "totalAmount", "createdAt"]} labels={["Чек", "Сумма", "Дата"]} /></div></>;
}
