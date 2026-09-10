import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "../api/client";
import { Header } from "../components/Header";
import { MobilePopularProducts, MobileSalesDetails } from "../components/MobileAnalyticsCards";
import { ReportCharts } from "../components/ReportCharts";
import { Table } from "../components/Table";
import { money } from "../utils/format";
import { useLanguage } from "../utils/i18n";

export function Reports() {
  const { t } = useLanguage();
  const today = new Date();
  const initialFrom = new Date(today.getTime() - 6 * 86400000);
  const [from, setFrom] = useState(initialFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [appliedFrom, setAppliedFrom] = useState(from);
  const [appliedTo, setAppliedTo] = useState(to);
  const [filterError, setFilterError] = useState("");
  const [userId, setUserId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const { data: filterOptions } = useQuery({ queryKey: ["report-filters"], queryFn: () => get("/reports/filters") });
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", appliedFrom, appliedTo, userId, categoryId],
    queryFn: () => get(`/reports?from=${appliedFrom}&to=${appliedTo}${userId ? `&userId=${userId}` : ""}${categoryId ? `&categoryId=${categoryId}` : ""}`),
  });
  const applyPeriod = () => {
    if (!from || !to || from > to) {
      setFilterError(t("Дата начала не может быть позже даты окончания"));
      return;
    }
    setFilterError("");
    setAppliedFrom(from);
    setAppliedTo(to);
  };
  const setPeriod = (days: number) => {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    setFrom(start.toISOString().slice(0, 10));
    setTo(new Date().toISOString().slice(0, 10));
    setFilterError("");
    setAppliedFrom(start.toISOString().slice(0, 10));
    setAppliedTo(new Date().toISOString().slice(0, 10));
  };
  const setYesterday = () => { const date = new Date(); date.setDate(date.getDate() - 1); const value = date.toISOString().slice(0, 10); setFrom(value); setTo(value); setAppliedFrom(value); setAppliedTo(value); setFilterError(""); };
  const setCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay() || 7;
    const start = new Date(today);
    start.setDate(today.getDate() - day + 1);
    const startValue = start.toISOString().slice(0, 10);
    const endValue = today.toISOString().slice(0, 10);
    setFrom(startValue); setTo(endValue); setAppliedFrom(startValue); setAppliedTo(endValue); setFilterError("");
  };
  const setMonth = (offset: number) => { const date = new Date(); date.setMonth(date.getMonth() + offset, 1); const start = new Date(date); const end = new Date(date.getFullYear(), date.getMonth() + 1, 0); setFrom(start.toISOString().slice(0, 10)); setTo(end.toISOString().slice(0, 10)); setFilterError(""); setAppliedFrom(start.toISOString().slice(0, 10)); setAppliedTo(end.toISOString().slice(0, 10)); };
  const changePercent = (current: number, previous: number) => previous ? `${(((current - previous) / previous) * 100).toFixed(1)}%` : current ? "+100%" : "0%";
  const exportExcel = async () => {
    if (!data) return;
    const XLSX = await import("xlsx");
    const salesRows = data.sales.flatMap((sale: any) => sale.items.map((item: any) => ({
      Дата: new Date(sale.createdAt).toLocaleDateString("ru-RU"),
      Время: new Date(sale.createdAt).toLocaleTimeString("ru-RU"),
      Сотрудник: sale.user?.name || "-",
      Товар: item.product.name,
      SKU: item.product.sku,
      Количество: item.quantity,
      Сумма: Number(item.total),
      Прибыль: Number(item.profit),
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Период: `${appliedFrom} — ${appliedTo}`, "Общая выручка": Number(data.revenue), "Общая прибыль": Number(data.profit), "Количество продаж": data.salesCount, "Продано единиц": data.units }]), "Сводка");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(salesRows), "Продажи");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.popular.map((item: any) => ({ Товар: item.name, SKU: item.sku, "Количество продаж": item.quantity, "Продано единиц": item.quantity, Выручка: Number(item.revenue), Прибыль: Number(item.profit) }))), "Товары");
    XLSX.writeFile(workbook, `отчет-${appliedFrom}-${appliedTo}.xlsx`);
  };
  const exportPdf = async () => {
    if (!data) return;
    const [{ jsPDF }] = await Promise.all([import("jspdf")]);
    const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
    const productRows = data.popular.map((item: any) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.sku)}</td><td>${item.quantity} шт.</td><td>${money(item.revenue)}</td><td>${money(item.profit)}</td></tr>`).join("");
    const saleRows = data.sales.flatMap((sale: any) => sale.items.map((item: any) => `<tr><td>${new Date(sale.createdAt).toLocaleString("ru-RU")}</td><td>${escapeHtml(sale.user?.name || "-")}</td><td>${escapeHtml(item.product.name)}<br><small>SKU: ${escapeHtml(item.product.sku)}</small></td><td>${item.quantity} шт.</td><td>${money(item.total)}</td><td>${money(item.profit)}</td></tr>`)).join("");
    const sheet = document.createElement("div");
    sheet.innerHTML = `<style>body{font-family:Arial,sans-serif;color:#17211c}h1{font-size:22px}h2{font-size:15px;margin:18px 0 8px}p{font-size:11px}table{width:100%;border-collapse:collapse;font-size:9px}th,td{border:1px solid #ccd5cc;padding:5px;text-align:left}th{background:#edf5e5}small{color:#66736a}</style><h1>Отчет о продажах</h1><p>Период: ${appliedFrom} — ${appliedTo}</p><h2>Сводка</h2><table><tr><th>Выручка</th><th>Прибыль</th><th>Продано единиц</th><th>Количество продаж</th></tr><tr><td>${money(data.revenue)}</td><td>${money(data.profit)}</td><td>${data.units}</td><td>${data.salesCount}</td></tr></table><h2>Самые продаваемые товары</h2><table><tr><th>Товар</th><th>SKU</th><th>Кол-во</th><th>Выручка</th><th>Прибыль</th></tr>${productRows || '<tr><td colspan="5">За выбранный период продаж нет</td></tr>'}</table><h2>Детализация продаж</h2><table><tr><th>Дата</th><th>Сотрудник</th><th>Товар</th><th>Кол-во</th><th>Сумма</th><th>Прибыль</th></tr>${saleRows || '<tr><td colspan="6">За выбранный период продаж нет</td></tr>'}</table>`;
    Object.assign(sheet.style, { position: "absolute", left: "-10000px", top: "0", width: "1000px", padding: "24px", background: "#fff" });
    document.body.appendChild(sheet);
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    await pdf.html(sheet, { margin: 24, autoPaging: "text", html2canvas: { scale: 0.8 }, callback: (document) => document.save(`отчет-${appliedFrom}-${appliedTo}.pdf`) });
    sheet.remove();
  };

  return (
    <>
      <Header title="Отчеты" />
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="report-filters">
          <div className="report-periods">
            <button className="button secondary" onClick={() => setPeriod(1)}>{t("Сегодня")}</button><button className="button secondary" onClick={setYesterday}>{t("Вчера")}</button><button className="button secondary" onClick={setCurrentWeek}>{t("Текущая неделя")}</button><button className="button secondary" onClick={() => setPeriod(30)}>{t("30 дней")}</button>
            <button className="button secondary" onClick={() => setMonth(0)}>{t("Этот месяц")}</button><button className="button secondary" onClick={() => setMonth(-1)}>{t("Прошлый месяц")}</button>
          </div>
          <div className="report-dates">
            <label>{t("От")}<input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label>{t("До")}<input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          </div>
          <div className="report-entity-filters"><select className="select" value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">{t("Все сотрудники")}</option>{filterOptions?.users?.map((user: any) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><select className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">{t("Все категории")}</option>{filterOptions?.categories?.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <button className="button" onClick={applyPeriod}>{t("Применить")}</button>
          <div className="report-exports"><button className="button secondary" onClick={exportExcel} disabled={!data || isLoading}>{t("Экспорт в Excel")}</button><button className="button secondary" onClick={exportPdf} disabled={!data || isLoading}>{t("Экспорт в PDF")}</button></div>
        </div>
      </div>
      {filterError && <div className="error report-filter-error">{filterError}</div>}
      {isLoading ? <p>{t("Загрузка...")}</p> : error ? <div className="error">{t("Не удалось загрузить отчет")}</div> : (
        <>
          <div className="grid grid4">
            <div className="card"><div className="label">{t("Продаж")}</div><div className="metric">{data?.salesCount || 0}</div></div>
            <div className="card"><div className="label">{t("Выручка")}</div><div className="metric">{money(data?.revenue)}</div></div>
            <div className="card"><div className="label">{t("Прибыль")}</div><div className="metric">{money(data?.profit)}</div></div>
            <div className="card"><div className="label">{t("Продано единиц")}</div><div className="metric">{data?.units || 0}</div></div>
            <div className="card"><div className="label">{t("Средний чек")}</div><div className="metric">{money(data?.averageCheck)}</div></div>
          </div>
          <div className="grid grid4" style={{ marginTop: 16 }}>
            <div className="card"><div className="label">{t("Себестоимость")}</div><div className="metric">{money(data?.cost)}</div></div>
            <div className="card"><div className="label">{t("Расходы")}</div><div className="metric">{money(data?.expenses)}</div></div>
            <div className="card"><div className="label">{t("Итоговая прибыль")}</div><div className="metric">{money(data?.netProfit)}</div></div>
            <div className="card"><div className="label">{t("Баланс периода")}</div><div className="metric">{money(data?.balance)}</div></div>
          </div>
          <div className="report-comparison"><span>К предыдущему периоду:</span><b>{changePercent(Number(data?.revenue || 0), Number(data?.previous?.revenue || 0))} выручка</b><b>{changePercent(Number(data?.profit || 0), Number(data?.previous?.profit || 0))} прибыль</b><b>{(data?.salesCount || 0) - (data?.previous?.salesCount || 0) >= 0 ? "+" : ""}{(data?.salesCount || 0) - (data?.previous?.salesCount || 0)} продаж</b></div>
          <div className="card report-balance-card"><div><h2 className="display">{t("Финансовый баланс")}</h2><p className="muted">{appliedFrom} — {appliedTo}</p></div><div className="report-balance-grid"><div><span className="label">{t("Выручка")}</span><b>{money(data?.balanceDetails?.revenue ?? data?.revenue)}</b></div><div><span className="label">{t("Себестоимость")}</span><b>{money(data?.balanceDetails?.cost ?? data?.cost)}</b></div><div><span className="label">{t("Расходы")}</span><b>{money(data?.balanceDetails?.expenses ?? data?.expenses)}</b></div><div><span className="label">{t("Логистика")}</span><b>{money(data?.balanceDetails?.logistics ?? data?.logistics)}</b></div><div><span className="label">{t("Итоговая прибыль")}</span><b className={Number(data?.balanceDetails?.netProfit ?? data?.netProfit) >= 0 ? "positive" : "negative"}>{money(data?.balanceDetails?.netProfit ?? data?.netProfit)}</b></div><div><span className="label">{t("Денежные поступления")}</span><b>{money(data?.balanceDetails?.cashIn)}</b></div><div><span className="label">{t("Денежные расходы")}</span><b>{money(data?.balanceDetails?.cashOut)}</b></div><div><span className="label">{t("Денежный баланс")}</span><b className={Number(data?.balanceDetails?.cashBalance) >= 0 ? "positive" : "negative"}>{money(data?.balanceDetails?.cashBalance)}</b></div><div><span className="label">{t("Возвраты")}</span><b>{money(data?.balanceDetails?.returns)}</b></div></div></div>
          <ReportCharts data={data} />
          <div className="grid grid2" style={{ marginTop: 18 }}>
            <div className="card"><h2 className="display">Продажи по способам оплаты</h2><Table rows={data?.paymentMethods || []} cols={["method", "amount"]} labels={["Способ оплаты", "Сумма"]} /></div>
            <div className="card"><h2 className="display">Расходы по категориям</h2><Table rows={data?.expensesByCategory || []} cols={["category", "amount"]} labels={["Категория", "Сумма"]} /></div>
          </div>
          <div className="card" style={{ marginTop: 18 }}><h2 className="display">Склад за период</h2><div className="grid grid4"><div><div className="label">Товаров</div><b className="metric">{data?.stock?.products || 0}</b></div><div><div className="label">Стоимость по себестоимости</div><b className="metric">{money(data?.stock?.value)}</b></div><div><div className="label">Низкий остаток</div><b className="metric">{data?.stock?.low?.length || 0}</b></div><div><div className="label">Нет в наличии</div><b className="metric">{data?.stock?.out?.length || 0}</b></div></div></div>
          <div className="card" style={{ marginTop: 18 }}><h2 className="display">Расходы по датам</h2><Table rows={data?.expenseRows || []} cols={["date", "category", "amount", "comment"]} labels={["Дата", "Категория", "Сумма", "Комментарий"]} /></div>
          <div className="card" style={{ marginTop: 18 }}>
            <h2 className="display">Самые продаваемые товары</h2>
            <div className="analytics-table-desktop"><Table rows={data?.popular || []} cols={["name", "sku", "quantity", "revenue", "profit"]} labels={["Товар", "SKU", "Кол-во", "Выручка", "Прибыль"]} /></div>
            <div className="analytics-cards-mobile"><MobilePopularProducts products={data?.popular || []} /></div>
          </div>
          <div className="card" style={{ marginTop: 18 }}>
            <h2 className="display">Детализация продаж</h2>
            <div className="analytics-table-desktop" style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>Время</th><th>Сотрудник</th><th>Товары</th><th>Единиц</th><th>Сумма</th><th>Прибыль</th></tr></thead><tbody>{data?.sales?.length ? data.sales.map((sale: any) => <tr key={sale.id}><td>{new Date(sale.createdAt).toLocaleString("ru-RU")}</td><td>{sale.user?.name || "-"}</td><td>{sale.items.map((item: any) => <div key={item.id}>{item.product.name} × {item.quantity} <span className="muted">({money(item.salePrice)})</span></div>)}</td><td>{sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}</td><td>{money(sale.totalAmount)}</td><td>{money(sale.totalProfit)}</td></tr>) : <tr><td colSpan={6} className="muted">Продаж за выбранный период нет</td></tr>}</tbody></table></div>
            <div className="analytics-cards-mobile"><MobileSalesDetails sales={data?.sales || []} /></div>
          </div>
        </>
      )}
    </>
  );
}
