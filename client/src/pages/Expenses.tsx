import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { get, post } from "../api/client";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { money } from "../utils/format";
import { useLanguage } from "../utils/i18n";

const categories = ["Коммунальные услуги", "Зарплата", "Обед", "Налоги", "Расходники", "Инвентарь", "Наймит", "Личные расходы учредителей", "Другие расходы"];

export function Expenses() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["expenses"], queryFn: () => get("/expenses") });
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const create = useMutation({ mutationFn: () => post("/expenses", { category, amount: Number(amount), date, comment }), onSuccess: () => { setAmount(""); setComment(""); queryClient.invalidateQueries({ queryKey: ["expenses"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } });
  return <><Header title="Расходы" /><div className="card"><form className="grid grid4" onSubmit={(event) => { event.preventDefault(); if (Number(amount) > 0) create.mutate(); }}><label className="label">{t("Категория")}<select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{t(item)}</option>)}</select></label><label className="label">{t("Сумма")}<input className="input" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label><label className="label">{t("Дата")}<input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label className="label">{t("Комментарий")}<input className="input" value={comment} onChange={(event) => setComment(event.target.value)} /></label><button className="button" type="submit" disabled={create.isPending}><Plus size={16} /> {t("Добавить расход")}</button></form>{create.isError && <div className="error">{(create.error as Error).message}</div>}</div><div className="card" style={{ marginTop: 16 }}>{isLoading ? <p>{t("Загрузка...")}</p> : <Table rows={data || []} cols={["category", "amount", "date", "comment", "responsible"]} labels={["Категория", "Сумма", "Дата", "Комментарий", "Ответственный"]} />}</div></>;
}
