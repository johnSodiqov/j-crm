import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { get, patch, post, remove } from "../api/client";
import { Header } from "../components/Header";
import { Modal } from "../components/Modal";
import { Table } from "../components/Table";
import { getCurrentUser } from "../utils/format";
import { useLanguage } from "../utils/i18n";

export function Products() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>(null);
    const isAdmin = getCurrentUser()?.role === "ADMIN";
  const { data, isLoading } = useQuery({ queryKey: ["products", search], queryFn: () => get("/products?limit=100&search=" + encodeURIComponent(search)) });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => get("/categories") });
  const mutation = useMutation({
    mutationFn: (value: any) => {
      const { id, category, ...payload } = value;
      const normalized = { ...payload, sku: String(payload.sku).trim().toUpperCase(), purchasePrice: Number(payload.purchasePrice), salePrice: Number(payload.salePrice), stock: Number(payload.stock), minStock: Number(payload.minStock) };
      return id ? patch(`/products/${id}`, normalized) : post("/products", normalized);
    },
    onSuccess: () => { setForm(null); queryClient.invalidateQueries({ queryKey: ["products"] }); },
  });
  const archive = useMutation({ mutationFn: (id: string) => remove(`/products/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }) });
  return <>
      <Header title="Товары" action={isAdmin ? <button className="button" onClick={() => setForm({ name: "", sku: "", categoryId: categories?.[0]?.id || "", purchasePrice: 0, salePrice: 0, stock: 0, minStock: 0, unit: "шт" })}><Plus size={16} /> Добавить товар</button> : undefined} />
    <div className="card">
      <div className="row" style={{ marginBottom: 16 }}><Search size={18} /><input className="input" placeholder={t("Поиск по названию или SKU")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {isLoading ? <p>{t("Загрузка...")}</p> : <Table rows={data?.items || []} cols={["name", "sku", "category", "purchasePrice", "salePrice", "stock", "status", "createdAt", "updatedAt"]} labels={["Название", "Артикул", "Категория", "Закупка", "Продажа", "Остаток", "Статус", "Добавлен", "Изменен"]} actions={(product) => <button className="button secondary" title={t("Редактировать товар")} aria-label={`${t("Редактировать товар")}: ${product.name}`} onClick={() => setForm({ id: product.id, name: product.name, sku: product.sku, categoryId: product.categoryId || product.category?.id || "", purchasePrice: product.purchasePrice, salePrice: product.salePrice, stock: product.stock, minStock: product.minStock, unit: product.unit || "шт" })}><Pencil size={15} /></button>} />}
      <div className="row" style={{ marginTop: 16 }}>{data && <span className="muted">Всего: {data.total}</span>}</div>
    </div>
    {form && <Modal title={form.id ? "Изменить товар" : "Новый товар"} close={() => setForm(null)}><div className="form">{[["name", "Название"], ["sku", "Артикул"], ["purchasePrice", "Закупочная цена"], ["salePrice", "Цена продажи"], ["stock", "Количество"], ["minStock", "Минимальный остаток"], ["unit", "Единица"]].map(([key, label]) => <label key={key}>{label}<input className={`input ${key === "sku" ? "sku-input" : ""}`} type={key === "name" || key === "sku" || key === "unit" ? "text" : "number"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}<label>Категория<select className="select" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{categories?.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>{mutation.isError && <div className="error">{(mutation.error as Error).message}</div>}<button className="button" onClick={() => mutation.mutate(form)}>{mutation.isPending ? "Сохранение..." : "Сохранить"}</button></Modal>}
  </>;
}
