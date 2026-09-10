import { money } from "../utils/format";

type PopularProduct = {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
  profit: number;
};

type Sale = {
  id: string;
  createdAt: string;
  user?: { name?: string };
  totalAmount: number;
  totalProfit: number;
  items: Array<{
    id: string;
    quantity: number;
    product: { name: string; sku?: string };
  }>;
};

export function MobilePopularProducts({ products }: { products: PopularProduct[] }) {
  if (!products.length) return <p className="muted mobile-empty">Нет данных</p>;
  return (
    <div className="mobile-analytics-list">
      {products.map((product) => (
        <article className="mobile-analytics-card" key={product.productId}>
          <div className="mobile-analytics-title">{product.name}</div>
          <div className="mobile-analytics-sku">SKU: {product.sku}</div>
          <div className="mobile-analytics-stats">
            <span>Продано <b>{product.quantity} шт.</b></span>
            <span>Выручка <b>{money(product.revenue)}</b></span>
            <span>Прибыль <b>{money(product.profit)}</b></span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function MobileSalesDetails({ sales }: { sales: Sale[] }) {
  if (!sales.length) return <p className="muted mobile-empty">Продаж за выбранный период нет</p>;
  return (
    <div className="mobile-analytics-list">
      {sales.map((sale) => {
        const units = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <article className="mobile-analytics-card sale-card" key={sale.id}>
            <div className="mobile-sale-date">{new Date(sale.createdAt).toLocaleString("ru-RU")}</div>
            <div className="mobile-sale-products">
              {sale.items.map((item) => (
                <div key={item.id}>
                  <div className="mobile-analytics-title">{item.product.name}</div>
                  <div className="mobile-analytics-sku">SKU: {item.product.sku || "-"}</div>
                </div>
              ))}
            </div>
            <div className="mobile-sale-person">
              <span>Сотрудник</span>
              <b>{sale.user?.name || "-"}</b>
            </div>
            <div className="mobile-sale-summary">
              <span>{units} шт.</span>
              <b>{money(sale.totalAmount)}</b>
              <span>Прибыль <b>{money(sale.totalProfit)}</b></span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
