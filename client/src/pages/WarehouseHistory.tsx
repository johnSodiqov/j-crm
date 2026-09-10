import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { get } from "../api/client";

export function WarehouseHistory() {
  const [productId, setProductId] = useState("");
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => get("/products?limit=100") });
  const { data: movements, isLoading } = useQuery({ queryKey: ["movements", productId], queryFn: () => get(`/warehouse/${productId}/movements`), enabled: !!productId });
  return <><Header title="История склада" /><div className="card"><label className="label">Товар<select className="input" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Выберите товар</option>{(products?.items || []).map((product: any) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label></div><div className="card" style={{ marginTop: 16 }}>{!productId ? <p className="muted">Выберите товар для просмотра движения</p> : isLoading ? <p>Загрузка...</p> : <Table rows={movements || []} cols={["type", "quantity", "beforeStock", "afterStock", "reason", "createdAt"]} labels={["Операция", "Количество", "До", "После", "Причина", "Дата"]} />}</div></>;
}
