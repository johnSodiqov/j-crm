import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { get, patch } from "../api/client";
import { Header } from "../components/Header";
import { Modal } from "../components/Modal";
import { Table } from "../components/Table";
import { getCurrentUser } from "../utils/format";

export function Users() {
  const currentUser = getCurrentUser();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<any>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => get("/users"),
    enabled: currentUser?.role === "ADMIN",
  });
  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: editingUser.name.trim(),
        email: editingUser.email.trim(),
        role: editingUser.role,
        active: editingUser.active,
        ...(editingUser.password ? { password: editingUser.password } : {}),
      };
      return patch(`/users/${editingUser.id}`, payload);
    },
    onSuccess: () => {
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (currentUser?.role !== "ADMIN") return <div className="error">Недостаточно прав</div>;
  return (
    <>
      <Header title="Пользователи" />
      <div className="card">
        {isLoading ? <p>Загрузка...</p> : error ? <div className="error">Не удалось загрузить пользователей</div> : <Table rows={data || []} cols={["name", "email", "role", "active", "createdAt"]} labels={["Имя", "Email", "Роль", "Статус", "Добавлен"]} actions={(employee) => <button className="button secondary" title="Редактировать сотрудника" aria-label={`Редактировать ${employee.name}`} onClick={() => setEditingUser({ id: employee.id, name: employee.name, email: employee.email, role: employee.role, active: employee.active, password: "" })}><Pencil size={15} /></button>} />}
      </div>
      {editingUser && <Modal title="Изменить сотрудника" close={() => setEditingUser(null)}><form className="user-edit-form" onSubmit={(event) => { event.preventDefault(); if (editingUser.name.trim() && editingUser.email.trim()) mutation.mutate(); }}><label>Имя<input className="input" value={editingUser.name} onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })} autoFocus disabled={mutation.isPending} /></label><label>Email<input className="input" type="email" value={editingUser.email} onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} disabled={mutation.isPending} /></label><label>Роль<select className="select" value={editingUser.role} onChange={(event) => setEditingUser({ ...editingUser, role: event.target.value })} disabled={mutation.isPending}><option value="SELLER">Продавец</option><option value="ADMIN">Администратор</option></select></label><label className="user-active"><input type="checkbox" checked={editingUser.active} onChange={(event) => setEditingUser({ ...editingUser, active: event.target.checked })} disabled={mutation.isPending} /> Активный сотрудник</label><label>Новый пароль <span className="muted">(необязательно)</span><input className="input" type="password" minLength={6} value={editingUser.password} onChange={(event) => setEditingUser({ ...editingUser, password: event.target.value })} disabled={mutation.isPending} /></label>{mutation.isError && <div className="error">{(mutation.error as Error).message}</div>}<button className="button" type="submit" disabled={!editingUser.name.trim() || !editingUser.email.trim() || mutation.isPending}>{mutation.isPending ? "Сохранение..." : "Сохранить"}</button></form></Modal>}
    </>
  );
}
