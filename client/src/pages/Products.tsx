import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { get, patch, post, remove } from "../api/client";
import { Header } from "../components/Header";
import { MoneyInput } from "../components/MoneyInput";
import { Modal } from "../components/Modal";
import { ProductsCatalog } from "../components/ProductsCatalog";
import { getCurrentUser } from "../utils/format";
import { useLanguage } from "../utils/i18n";
import { productUnits, quantityStep } from "../utils/product";

export function Products() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [status, setStatus] = useState("ACTIVE");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const isAdmin = getCurrentUser()?.role === "ADMIN";
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize), search, status });
  if (selectedCategories.length) params.set("categoryIds", selectedCategories.join(","));
  if (selectedUnits.length) params.set("units", selectedUnits.join(","));
  if (createdFrom) params.set("createdFrom", createdFrom);
  if (createdTo) params.set("createdTo", createdTo);
  if (updatedFrom) params.set("updatedFrom", updatedFrom);
  if (updatedTo) params.set("updatedTo", updatedTo);
  const { data, isLoading } = useQuery({
    queryKey: ["products", search, selectedCategories, selectedUnits, status, createdFrom, createdTo, updatedFrom, updatedTo, page, pageSize],
    queryFn: () => get(`/products?${params.toString()}`),
  });
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
  const changeStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => patch(`/products/${id}`, { status }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }) });
  const editProduct = (product: any) => setForm({ id: product.id, name: product.name, sku: product.sku, categoryId: product.categoryId || product.category?.id || "", purchasePrice: product.purchasePrice, salePrice: product.salePrice, stock: product.stock, minStock: product.minStock, unit: product.unit || "шт" });
  const duplicateProduct = (product: any) => setForm({ name: `${product.name} (копия)`, sku: `${product.sku}-COPY-${Date.now().toString().slice(-5)}`.toUpperCase(), categoryId: product.categoryId || product.category?.id || "", purchasePrice: product.purchasePrice || 0, salePrice: product.salePrice || 0, stock: 0, minStock: product.minStock || 0, unit: product.unit || "шт" });
  const categoryOptions = (categories || []).map((category: any) => ({ value: category.id, label: category.name }));
  return <>
      <Header title="Товары" action={isAdmin ? <button className="button" onClick={() => setForm({ name: "", sku: "", categoryId: categories?.[0]?.id || "", purchasePrice: 0, salePrice: 0, stock: 0, minStock: 0, unit: "шт" })}><Plus size={16} /> Добавить товар</button> : undefined} />
    <ProductsCatalog
      rows={data?.items || []} categories={categoryOptions} isAdmin={isAdmin} isLoading={isLoading}
      total={data?.total || 0} page={page} pages={data?.pages || 1} pageSize={pageSize} search={search}
      selectedCategories={selectedCategories} selectedUnits={selectedUnits} status={status}
      createdFrom={createdFrom} createdTo={createdTo} updatedFrom={updatedFrom} updatedTo={updatedTo}
      onSearch={(value) => { setSearch(value); setPage(1); }}
      onCategories={(value) => { setSelectedCategories(value); setPage(1); }}
      onUnits={(value) => { setSelectedUnits(value); setPage(1); }}
      onStatus={(value) => { setStatus(value); setPage(1); }}
      onCreatedFrom={(value) => { setCreatedFrom(value); setPage(1); }} onCreatedTo={(value) => { setCreatedTo(value); setPage(1); }}
      onUpdatedFrom={(value) => { setUpdatedFrom(value); setPage(1); }} onUpdatedTo={(value) => { setUpdatedTo(value); setPage(1); }}
      onEdit={editProduct} onDuplicate={duplicateProduct} onArchive={(product) => archive.mutate(product.id)}
      onStatusChange={(product, nextStatus) => changeStatus.mutate({ id: product.id, status: nextStatus })}
      onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }}
    />
    {form && <Modal title={form.id ? "Изменить товар" : "Новый товар"} close={() => setForm(null)}><div className="form">{[["name", "Название"], ["sku", "Артикул"], ["purchasePrice", "Закупочная цена"], ["salePrice", "Цена продажи"], ["stock", "Количество"], ["minStock", "Минимальный остаток"], ["unit", "Единица"]].map(([key, label]) => <label key={key}>{key === "purchasePrice" || key === "salePrice" ? `${label} за ${form.unit}` : label}{key === "unit" ?
        <select className="select" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
          {!productUnits.includes(form.unit) && <option value={form.unit}>{form.unit}</option>}
          {productUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
        </select>
      : key === "purchasePrice" || key === "salePrice" ? <MoneyInput className="input" value={form[key]} onValueChange={(value) => setForm({ ...form, [key]: value })} />
      : <input className={`input ${key === "sku" ? "sku-input" : ""}`} type={key === "name" || key === "sku" ? "text" : "number"} min={key === "stock" || key === "minStock" ? "0" : undefined} step={key === "stock" || key === "minStock" ? quantityStep(form.unit) : undefined} value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />}</label>)}<label>Категория<select className="select" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{categories?.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>{mutation.isError && <div className="error">{(mutation.error as Error).message}</div>}<button className="button" onClick={() => mutation.mutate(form)}>{mutation.isPending ? "Сохранение..." : "Сохранить"}</button></Modal>}
  </>;
}
