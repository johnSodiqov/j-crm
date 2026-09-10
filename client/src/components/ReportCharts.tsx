import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "../utils/format";
import { useLanguage } from "../utils/i18n";

const colors = ["#6ca56a", "#b9e86c", "#8bb85d", "#3d5d46", "#d7a84a", "#b84439"];

export function ReportCharts({ data }: { data: any }) {
  const { t } = useLanguage();
  const [lineMetric, setLineMetric] = useState<"revenue" | "profit" | "units" | "salesCount">("revenue");
  const expensesByDay = Object.values((data?.expenseRows || []).reduce((days: any, expense: any) => { const date = new Date(expense.date).toISOString().slice(0, 10); days[date] = days[date] || { date, amount: 0 }; days[date].amount += Number(expense.amount); return days; }, {}));
  return <div className="report-charts" aria-label={t("Динамика по дням")}>
    <div className="card report-chart-card">
      <div className="report-chart-heading"><h2 className="display">Динамика по дням</h2><select className="select report-chart-select" value={lineMetric} onChange={(event) => setLineMetric(event.target.value as typeof lineMetric)}><option value="revenue">Выручка</option><option value="profit">Прибыль</option><option value="units">Единицы</option><option value="salesCount">Продажи</option></select></div>
      <div className="report-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.daily || []}><CartesianGrid stroke="#e4eae2" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(value: any) => lineMetric === "revenue" || lineMetric === "profit" ? money(value) : value} /><Line type="monotone" dataKey={lineMetric} name={lineMetric === "revenue" ? "Выручка" : lineMetric === "profit" ? "Прибыль" : lineMetric === "units" ? "Единицы" : "Продажи"} stroke="#3d5d46" strokeWidth={3} dot={{ r: 4, fill: "#b9e86c" }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div>
    </div>
    <div className="card report-chart-card"><h2 className="display">Продажи по сотрудникам</h2><div className="report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.employees || []}><CartesianGrid stroke="#e4eae2" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(value: any) => money(value)} /><Bar dataKey="revenue" name="Выручка" fill="#6ca56a" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
    <div className="card report-chart-card"><h2 className="display">Распределение по категориям</h2><div className="report-pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.categories || []} dataKey="revenue" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={3}>{(data.categories || []).map((item: any, index: number) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value: any) => money(value)} /><Legend /></PieChart></ResponsiveContainer></div></div>
    <div className="card report-chart-card"><h2 className="display">Расходы по дням</h2><div className="report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={expensesByDay}><CartesianGrid stroke="#e4eae2" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(value: any) => money(value)} /><Bar dataKey="amount" name="Расходы" fill="#b84439" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
  </div>;
}
