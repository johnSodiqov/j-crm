import { Navigate, useLocation } from "react-router-dom";
import { Login } from "./components/Login";
import { Shell } from "./components/Shell";
import { Dashboard } from "./pages/Dashboard";
import { Products } from "./pages/Products";
import { Reports } from "./pages/Reports";
import { Sales } from "./pages/Sales";
import { Simple } from "./pages/Simple";
import { Audit } from "./pages/Audit";
import { Users } from "./pages/Users";
import { Expenses } from "./pages/Expenses";
import { Suppliers } from "./pages/Suppliers";
import { Debts } from "./pages/Debts";
import { Customers } from "./pages/Customers";
import { Purchases } from "./pages/Purchases";
import { Returns } from "./pages/Returns";
import { WarehouseHistory } from "./pages/WarehouseHistory";
import { Receipts } from "./pages/Receipts";
import { Warehouse } from "./pages/Warehouse";
import { Todo } from "./pages/Todo";

function Page() {
  const { pathname } = useLocation();
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const adminOnlyPaths = ["/reports", "/audit", "/users", "/expenses", "/suppliers", "/purchases", "/debts"];
  if (adminOnlyPaths.includes(pathname) && currentUser?.role !== "ADMIN") return <Navigate to="/" replace />;
  if (pathname === "/") return <Dashboard />;
  if (pathname === "/products") return <Products />;
  if (pathname === "/sales") return <Sales />;
  if (pathname === "/reports") return <Reports />;
  if (pathname === "/audit") return <Audit />;
  if (pathname === "/users") return <Users />;
  if (pathname === "/expenses") return <Expenses />;
  if (pathname === "/suppliers") return <Suppliers />;
  if (pathname === "/debts") return <Debts />;
  if (pathname === "/customers") return <Customers />;
  if (pathname === "/purchases") return <Purchases />;
  if (pathname === "/returns") return <Returns />;
  if (pathname === "/warehouse-history") return <WarehouseHistory />;
  if (pathname === "/receipts") return <Receipts />;
  if (pathname === "/warehouse") return <Warehouse />;
  if (pathname === "/todo") return <Todo />;
  return <Simple type={pathname.slice(1)} />;
}

export default function App() {
  const { pathname } = useLocation();
  if (pathname === "/login" || !localStorage.getItem("token")) return <Login />;
  return <Shell><Page /></Shell>;
}
