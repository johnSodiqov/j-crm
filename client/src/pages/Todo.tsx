import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCheck, Plus } from "lucide-react";
import { get, patch, post } from "../api/client";
import { Header } from "../components/Header";
import { useLanguage } from "../utils/i18n";

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "-";
}

export function Todo() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: tasks, isLoading, error } = useQuery({ queryKey: ["tasks"], queryFn: () => get("/tasks") });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const create = useMutation({
    mutationFn: () => post("/tasks", { title, description }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
  const complete = useMutation({
    mutationFn: (id: string) => patch(`/tasks/${id}/complete`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const pending = (tasks || []).filter((task: any) => task.status === "TODO");
  const done = (tasks || []).filter((task: any) => task.status === "DONE");
  const taskCard = (task: any, completed = false) => <article className={`task-card${completed ? " is-done" : ""}`} key={task.id}>
    <div className="task-card-main">
      <div className="task-card-title">{task.title}</div>
      {task.description && <p className="task-card-description">{task.description}</p>}
    </div>
    <div className="task-card-meta">
      <span>{t("Добавил")}: <b>{task.createdBy?.name || "-"}</b></span>
      <span>{t("Создано")}: <b>{dateTime(task.createdAt)}</b></span>
      {completed && <><span>{t("Сделал")}: <b>{task.completedBy?.name || "-"}</b></span><span>{t("Завершено")}: <b>{dateTime(task.completedAt)}</b></span></>}
    </div>
    {!completed && <button className="button secondary task-complete" type="button" onClick={() => complete.mutate(task.id)} disabled={complete.isPending} title={t("Выполнено")}><Check size={16} /> {t("Выполнено")}</button>}
  </article>;

  return <>
    <Header title="Задачи" />
    <div className="todo-layout">
      <section className="card todo-create-card">
        <div className="todo-section-heading"><ClipboardCheck size={20} /><h2 className="display">{t("Новая задача")}</h2></div>
        <form className="todo-form" onSubmit={(event) => { event.preventDefault(); if (title.trim()) create.mutate(); }}>
          <label>{t("Название")}<input className="input" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например: проверить остатки" /></label>
          <label>{t("Описание")}<textarea className="input todo-description-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Дополнительные детали" rows={4} /></label>
          {create.isError && <div className="error">{(create.error as Error).message}</div>}
          <button className="button" type="submit" disabled={!title.trim() || create.isPending}><Plus size={16} /> {create.isPending ? t("Добавление...") : t("Добавить задачу")}</button>
        </form>
      </section>
      <section className="todo-list-column">
        <div className="todo-section-heading"><h2 className="display">{t("Новые задачи")} <span className="todo-count">{pending.length}</span></h2></div>
        {isLoading ? <div className="card"><p className="muted">{t("Загрузка...")}</p></div> : error ? <div className="error">{t("Не удалось загрузить задачи")}: {(error as Error).message}</div> : pending.length ? pending.map((task: any) => taskCard(task)) : <div className="card"><p className="muted">{t("Новых задач нет")}</p></div>}
        <div className="todo-section-heading todo-done-heading"><h2 className="display">{t("Сделано")} <span className="todo-count">{done.length}</span></h2></div>
        {done.length ? done.map((task: any) => taskCard(task, true)) : <div className="card"><p className="muted">{t("Выполненных задач пока нет")}</p></div>}
      </section>
    </div>
  </>;
}
