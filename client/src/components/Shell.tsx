import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, CheckSquare, ClipboardList, Ellipsis, FileText, HandCoins, LayoutDashboard, LogOut, Menu, Moon, Package, Receipt, RotateCcw, ShoppingCart, Store, Sun, Tags, Truck, UserRound, Users, Warehouse, X } from "lucide-react";
import { getCurrentUser } from "../utils/format";
import { useLanguage } from "../utils/i18n";

const menu = [
  ["/", "Главная", LayoutDashboard], ["/products", "Товары", Package],
  ["/sales", "Продажи", ShoppingCart], ["/warehouse", "Склад", Warehouse],
  ["/todo", "Задачи", CheckSquare],
  ["/receipts", "Чеки", FileText],
  ["/customers", "Клиенты", UserRound],
  ["/returns", "Возвраты", RotateCcw], ["/warehouse-history", "История склада", Warehouse],
  ["/expenses", "Расходы", Receipt],
  ["/suppliers", "Поставщики", Store],
  ["/purchases", "Закупки", Truck],
  ["/debts", "Долги", HandCoins],
  ["/categories", "Категории", Tags], ["/reports", "Отчеты", BarChart3],
  ["/users", "Пользователи", Users],
  ["/audit", "Журнал", ClipboardList],
] as any[];

export function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { language, setLanguage, t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  useEffect(() => { setMobileOpen(false); setMoreOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);
  const visibleMenu = menu.filter(([path]) => !["/products", "/categories", "/users", "/audit"].includes(path) && (path !== "/reports" && path !== "/expenses" && path !== "/suppliers" && path !== "/purchases" && path !== "/debts" || currentUser?.role === "ADMIN"));
  const moreMenu = menu.filter(([path]) => ["/products", "/categories", "/users", "/audit"].includes(path)).filter(([path]) => path !== "/users" && path !== "/audit" || currentUser?.role === "ADMIN");
  return (
    <div className="shell">
      <button className="mobile-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={mobileOpen}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
      {mobileOpen && <button className="mobile-menu-overlay" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню" />}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">SHOP / CRM</div>
        <button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? t("Светлая тема") : t("Темная тема")} title={theme === "dark" ? t("Светлая тема") : t("Темная тема")}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === "dark" ? t("Светлая тема") : t("Темная тема")}</span>
        </button>
        <div className="language-toggle" role="group" aria-label="Язык"><button className={language === "ru" ? "active" : ""} type="button" onClick={() => setLanguage("ru")}>RU</button><button className={language === "uz" ? "active" : ""} type="button" onClick={() => setLanguage("uz")}>UZ</button></div>
        <nav className="nav">
          {visibleMenu.map(([path, label, Icon]) => (
            <Link className={location.pathname === path ? "active" : ""} to={path} key={path}>
              <Icon size={18} /><span>{t(label)}</span>
            </Link>
          ))}
          {moreMenu.map(([path, label, Icon]) => (
            <Link className="desktop-more-link" to={path} key={path}>
              <Icon size={18} /><span>{t(label)}</span>
            </Link>
          ))}
        </nav>
        <div className="more-nav">
          <button className={`more-toggle ${moreOpen || moreMenu.some(([path]) => location.pathname === path) ? "active" : ""}`} onClick={() => setMoreOpen(!moreOpen)}>
            <Ellipsis size={18} /><span>{t("Прочее")}</span>
          </button>
          {moreOpen && <div className="more-menu">{moreMenu.map(([path, label, Icon]) => <Link className={location.pathname === path ? "active" : ""} to={path} key={path} onClick={() => setMoreOpen(false)}><Icon size={18} /><span>{t(label)}</span></Link>)}</div>}
        </div>
        <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="logout">
          <LogOut size={18} /><span>{t("Выйти")}</span>
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
