import { useQuery } from "@tanstack/react-query";
import { get } from "../api/client";
import { Header } from "../components/Header";
import { Table } from "../components/Table";

export function Audit() {
  const { data, isLoading, error } = useQuery({ queryKey: ["audit"], queryFn: () => get("/audit?limit=200") });
  return <>
    <Header title="Журнал действий" />
    <div className="card">
      {isLoading ? <p>Загрузка журнала...</p> : error ? <div className="error">Не удалось загрузить журнал</div> : <Table rows={data || []} cols={["createdAt", "user", "method", "path", "statusCode", "ip"]} labels={["Дата", "Пользователь", "Метод", "Путь", "Статус", "IP"]} />}
    </div>
  </>;
}
