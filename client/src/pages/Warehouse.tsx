import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../api/client";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { getCurrentUser } from "../utils/format";
import { quantityStep } from "../utils/product";

export function Warehouse() {
  const isAdmin = getCurrentUser()?.role === "ADMIN";
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["warehouse"], queryFn: () => get("/warehouse") });
  const [form, setForm] = useState<any>(null);
  const adjustment = useMutation({ mutationFn: () => post("/warehouse/adjustment", form), onSuccess: () => { setForm(null); queryClient.invalidateQueries({ queryKey: ["warehouse"] }); queryClient.invalidateQueries({ queryKey: ["products"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } });
  return <><Header title="Склад" /><div className="card">{isLoading ? <p>Загрузка...</p> : <Table rows={data || []} cols={["name", "stock", "minStock", "stockStatus"]} labels={["Товар", "Остаток", "Минимум", "Статус"]} actions={isAdmin ? (product) => <button className="button secondary" onClick={() => setForm({ productId: product.id, newStock: product.stock, unit: product.unit, reason: "" })}>Изменить остаток</button> : undefined} />}</div>{form && <div className="card" style={{ marginTop: 16 }}><h2 className="display">Корректировка остатка</h2><form className="grid grid3" onSubmit={(event) => { event.preventDefault(); adjustment.mutate(); }}><label className="label">Новое количество ({form.unit})<input className="input" type="number" aria-label={`Новое количество (${form.unit})`} min="0" step={quantityStep(form.unit)} value={form.newStock || ""} onChange={(event) => setForm({ ...form, newStock: Number(event.target.value) })} /></label><label className="label">Причина<input className="input" type="text" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required /></label><button className="button" type="submit" disabled={adjustment.isPending}>Сохранить</button></form>{adjustment.isError && <div className="error">{(adjustment.error as Error).message}</div>}</div>}</>;
}
