import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { get } from "../api/client";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { money } from "../utils/format";
import { useLanguage } from "../utils/i18n";

function MetricLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return <Link to={to} className="card metric-link" aria-label={`${label}: перейти в раздел`}><div className="label">{label}</div><div className="metric">{children}</div></Link>;
}

export function Dashboard() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => get("/dashboard") });
  const isAdmin = JSON.parse(localStorage.getItem("user") || "{}").role === "ADMIN";
  const { data: exchangeRate } = useQuery({ queryKey: ["exchange-rate"], queryFn: () => get("/exchange-rate"), enabled: isAdmin, staleTime: 15 * 60 * 1000 });

  if (isLoading) return <p>{t("Загрузка...")}</p>;

  const dashboard = data || {};

  return <>
    <Header title="Обзор" />
    <div className="grid grid4">
      <MetricLink to="/receipts" label={t("Продажи сегодня")}>{dashboard.today?._count || 0}</MetricLink>
      <MetricLink to="/receipts" label={t("Выручка сегодня")}>{money(dashboard.today?._sum?.totalAmount)}</MetricLink>
      {isAdmin && <MetricLink to="/reports" label={t("Прибыль сегодня")}>{money(dashboard.today?._sum?.totalProfit)}</MetricLink>}
      <MetricLink to="/products" label={t("Активных товаров")}>{dashboard.products || 0}</MetricLink>

      {isAdmin && <>
        <MetricLink to="/customers" label={t("Клиентов")}>{dashboard.customers || 0}</MetricLink>
        <MetricLink to="/debts" label={t("Долги клиентов")}>{money(dashboard.customerDebt)}</MetricLink>
        <MetricLink to="/suppliers" label={t("Долги поставщикам")}>{money(dashboard.supplierDebt)}</MetricLink>
        <MetricLink to="/reports" label={t("Денежный остаток")}>{money(dashboard.cash)}</MetricLink>
        <MetricLink to="/receipts" label={t("Продаж за месяц")}>{dashboard.month?.salesCount || 0}</MetricLink>
        <MetricLink to="/expenses" label={t("Расходы за месяц")}>{money(dashboard.month?.expenses)}</MetricLink>
        <MetricLink to="/receipts" label={t("Выручка за месяц")}>{money(dashboard.month?.revenue)}</MetricLink>
        <MetricLink to="/reports" label={t("Прибыль за месяц")}>{money(dashboard.month?.profit)}</MetricLink>
        <div className="card">
          <div className="label">{t("Курс USD")}</div>
          <div className="metric">{exchangeRate ? `${Number(exchangeRate.sell).toLocaleString("ru-RU")} сум` : "Нет данных"}</div>
          <div className="muted">{t("Покупка")}: {exchangeRate ? `${Number(exchangeRate.buy).toLocaleString("ru-RU")} сум` : "-"}</div>
          <div className="muted">{exchangeRate?.updatedAt ? new Date(exchangeRate.updatedAt).toLocaleString("ru-RU") : ""}</div>
        </div>
      </>}
    </div>

    <div className="grid grid2" style={{ marginTop: 16 }}>
      <div className="card"><h2 className="display">{t("Продажи за 7 дней")}</h2><div className="chart">{(dashboard.weekly || []).map((item: any, index: number) => <div className="bar" key={index} style={{ height: `${Math.max(8, Math.min(100, Number(item.totalAmount) / 1000))}%` }} title={money(item.totalAmount)} />)}</div></div>
      <div className="card"><h2 className="display">{t("Низкий остаток")}</h2><Table rows={dashboard.low || []} cols={["name", "stock", "minStock"]} labels={["Товар", "Остаток", "Минимум"]} /></div>
    </div>
    <div className="card" style={{ marginTop: 16 }}><h2 className="display">{t("Последние продажи")}</h2><Table rows={dashboard.recent || []} cols={["id", "totalAmount", "createdAt"]} labels={["Номер", "Сумма", "Дата"]} /></div>
  </>;
}
