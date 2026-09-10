import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { get, patch, post } from "../api/client";
import { Header } from "../components/Header";
import { Modal } from "../components/Modal";
import { Table } from "../components/Table";
import { getCurrentUser } from "../utils/format";

export function Simple({ type }: { type: string }) {
  const currentUser = getCurrentUser();
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [type], queryFn: () => get("/" + type) });
  const categoryMutation = useMutation({ mutationFn: () => post("/categories", { name: categoryName.trim() }), onSuccess: () => { setCategoryName(""); queryClient.invalidateQueries({ queryKey: ["categories"] }); } });
  const categoryEditMutation = useMutation({ mutationFn: () => patch(`/categories/${editingCategory.id}`, { name: editingCategory.name.trim() }), onSuccess: () => { setEditingCategory(null); queryClient.invalidateQueries({ queryKey: ["categories"] }); } });
  const title = type === "warehouse" ? "Склад" : type === "categories" ? "Категории" : "Пользователи";
  return <><Header title={title} action={type === "categories" && currentUser?.role === "ADMIN" ? <form className="category-create" onSubmit={(event) => { event.preventDefault(); if (categoryName.trim()) categoryMutation.mutate(); }}><input className="input" placeholder="Название категории" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} disabled={categoryMutation.isPending} /><button className="button" type="submit" disabled={!categoryName.trim() || categoryMutation.isPending}><Plus size={16} /> Добавить</button></form> : undefined} />{type === "categories" && categoryMutation.isError && <div className="error category-error">{(categoryMutation.error as Error).message}</div>}<div className="card">{isLoading ? <p>Загрузка...</p> : type === "warehouse" ? <Table rows={data || []} cols={["name", "stock", "minStock", "stockStatus"]} labels={["Товар", "Остаток", "Минимум", "Статус"]} /> : type === "categories" ? <Table rows={data || []} cols={["name", "_count"]} labels={["Категория", "Товаров"]} actions={currentUser?.role === "ADMIN" ? (category) => <button className="button secondary" title="Редактировать категорию" aria-label={`Редактировать ${category.name}`} onClick={() => setEditingCategory({ id: category.id, name: category.name })}><Pencil size={15} /></button> : undefined} /> : <Table rows={data || []} cols={["name", "email", "role", "active"]} labels={["Имя", "Email", "Роль", "Статус"]} />}</div>{editingCategory && <Modal title="Изменить категорию" close={() => setEditingCategory(null)}><form className="category-edit" onSubmit={(event) => { event.preventDefault(); if (editingCategory.name.trim()) categoryEditMutation.mutate(); }}><label>Название категории<input className="input" value={editingCategory.name} onChange={(event) => setEditingCategory({ ...editingCategory, name: event.target.value })} autoFocus disabled={categoryEditMutation.isPending} /></label>{categoryEditMutation.isError && <div className="error">{(categoryEditMutation.error as Error).message}</div>}<button className="button" type="submit" disabled={!editingCategory.name.trim() || categoryEditMutation.isPending}>{categoryEditMutation.isPending ? "Сохранение..." : "Сохранить"}</button></form></Modal>}</>;
}
