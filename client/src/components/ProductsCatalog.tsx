import { ChevronDown, ChevronLeft, ChevronRight, Circle, Ellipsis, Package, Pencil, Search, X } from "lucide-react";
import { money } from "../utils/format";
import { quantityLabel } from "../utils/product";

type FilterOption = { value: string; label: string };

type MultiFilterProps = {
  label: string;
  options: FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
};

function MultiFilter({ label, options, value, onChange }: MultiFilterProps) {
  const toggle = (option: string) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  return (
    <div className="products-multi-filter">
      <details>
        <summary>{label}<ChevronDown size={14} /></summary>
        <div className="products-filter-menu">
          {options.map((option) => (
            <label key={option.value}>
              <input type="checkbox" checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </details>
      {value.length > 0 && <div className="products-filter-tags">
        {value.map((selected) => {
          const option = options.find((item) => item.value === selected);
          return <button key={selected} type="button" onClick={() => toggle(selected)} aria-label={`Удалить фильтр ${option?.label || selected}`}>
            {option?.label || selected}<X size={13} />
          </button>;
        })}
      </div>}
    </div>
  );
}

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category?: { name?: string };
  unit?: string;
  purchasePrice?: number;
  salePrice: number;
  stock: number;
  minStock: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ProductsCatalogProps = {
  rows: ProductRow[];
  categories: FilterOption[];
  isAdmin: boolean;
  isLoading: boolean;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  search: string;
  selectedCategories: string[];
  selectedUnits: string[];
  status: string;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  onSearch: (value: string) => void;
  onCategories: (value: string[]) => void;
  onUnits: (value: string[]) => void;
  onStatus: (value: string) => void;
  onCreatedFrom: (value: string) => void;
  onCreatedTo: (value: string) => void;
  onUpdatedFrom: (value: string) => void;
  onUpdatedTo: (value: string) => void;
  onEdit: (product: ProductRow) => void;
  onDuplicate: (product: ProductRow) => void;
  onArchive: (product: ProductRow) => void;
  onStatusChange: (product: ProductRow, status: "ACTIVE" | "INACTIVE") => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
};

function dateLabel(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StockCell({ product }: { product: ProductRow }) {
  const stock = Number(product.stock) || 0;
  const minimum = Number(product.minStock) || 0;
  const low = stock > 0 && stock <= minimum;
  const width = stock === 0 ? 0 : minimum > 0 ? Math.min(100, (stock / (minimum * 2)) * 100) : 100;
  const formattedStock = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(stock);
  return <div className="products-stock-cell">
    <span>{quantityLabel(formattedStock, product.unit)}</span>
    <div className={`products-stock-track${low ? " is-low" : ""}`} aria-label={low ? "Низкий остаток" : "Достаточный остаток"}>
      <span style={{ width: `${width}%` }} />
    </div>
  </div>;
}

function ProductActions({ product, onEdit, onDuplicate, onArchive, onStatusChange }: Pick<ProductsCatalogProps, "onEdit" | "onDuplicate" | "onArchive" | "onStatusChange"> & { product: ProductRow }) {
  const closeMenu = (event: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    action();
    event.currentTarget.closest("details")?.removeAttribute("open");
  };
  const isActive = product.status === "ACTIVE";
  return <div className="products-actions">
    <button className="products-icon-button" type="button" title="Быстрое редактирование" aria-label={`Быстрое редактирование: ${product.name}`} onClick={() => onEdit(product)}><Pencil size={15} /></button>
    <details className="products-action-menu">
      <summary aria-label={`Действия для ${product.name}`}><span>Actions</span><ChevronDown size={14} /></summary>
      <div>
        <button type="button" onClick={(event) => closeMenu(event, () => onDuplicate(product))}>Duplicate</button>
        <button type="button" onClick={(event) => closeMenu(event, () => onArchive(product))}>Archive</button>
        <button type="button" onClick={(event) => closeMenu(event, () => onEdit(product))}>Quick Edit</button>
        <button type="button" onClick={(event) => closeMenu(event, () => onStatusChange(product, isActive ? "INACTIVE" : "ACTIVE"))}>{isActive ? "Deactivate" : "Activate"}</button>
      </div>
    </details>
  </div>;
}

export function ProductsCatalog(props: ProductsCatalogProps) {
  const pageCount = Math.max(1, props.pages);
  return (
    <section className="products-panel">
      <div className="products-search">
        <Search size={18} />
        <input type="search" placeholder="Поиск по названию или SKU" value={props.search} onChange={(event) => props.onSearch(event.target.value)} />
      </div>

      <div className="products-filters">
        <MultiFilter label="Категория" options={props.categories} value={props.selectedCategories} onChange={props.onCategories} />
        <MultiFilter label="Единица" options={["шт", "кг", "г", "л", "мл", "м", "упак.", "коробка"].map((unit) => ({ value: unit, label: unit }))} value={props.selectedUnits} onChange={props.onUnits} />
        <label className="products-status-filter">Статус
          <select value={props.status} onChange={(event) => props.onStatus(event.target.value)}>
            <option value="ALL">Все статусы</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
        <fieldset className="products-date-filter"><legend>Дата добавления</legend><input type="date" aria-label="Добавлено с" value={props.createdFrom} onChange={(event) => props.onCreatedFrom(event.target.value)} /><span>—</span><input type="date" aria-label="Добавлено по" value={props.createdTo} onChange={(event) => props.onCreatedTo(event.target.value)} /></fieldset>
        <fieldset className="products-date-filter"><legend>Дата изменения</legend><input type="date" aria-label="Изменено с" value={props.updatedFrom} onChange={(event) => props.onUpdatedFrom(event.target.value)} /><span>—</span><input type="date" aria-label="Изменено по" value={props.updatedTo} onChange={(event) => props.onUpdatedTo(event.target.value)} /></fieldset>
      </div>

      <div className="products-table-scroll">
        <table className="products-table">
          <thead><tr>
            <th>НАЗВАНИЕ</th><th>АРТИКУЛ</th><th>КАТЕГОРИЯ</th><th>ЕДИНИЦА</th>
            {props.isAdmin && <th className="is-numeric">ЗАКУПКА</th>}
            <th className="is-numeric">ПРОДАЖА</th><th>ОСТАТОК</th><th>СТАТУС</th><th>ДАТА ДОБАВЛЕНИЯ</th><th>ДАТА ИЗМЕНЕНИЯ</th>
            {props.isAdmin && <th>ДЕЙСТВИЯ</th>}
          </tr></thead>
          <tbody className="products-desktop-rows">
            {props.isLoading ? <tr><td className="products-empty" colSpan={props.isAdmin ? 11 : 9}>Загрузка товаров...</td></tr> : props.rows.length ? props.rows.map((product) => {
              const active = product.status === "ACTIVE";
              const archived = product.status === "ARCHIVED";
              return <tr key={product.id}>
                <td><div className="products-name-cell"><span className="products-thumbnail"><Package size={17} /></span><span><strong>{product.name}</strong><small>{product.sku}</small></span></div></td>
                <td><code className="products-sku">{product.sku}</code></td>
                <td>{product.category?.name || "-"}</td>
                <td><span className="products-unit">{product.unit || "шт"}</span></td>
                {props.isAdmin && <td className="is-numeric">{money(product.purchasePrice)}</td>}
                <td className="is-numeric">{money(product.salePrice)}</td>
                <td><StockCell product={product} /></td>
                <td><span className={`products-status${active ? " is-active" : archived ? " is-archived" : " is-inactive"}`}><Circle size={9} fill="currentColor" />{product.status}</span></td>
                <td>{dateLabel(product.createdAt)}</td>
                <td>{dateLabel(product.updatedAt)}</td>
                {props.isAdmin && <td><ProductActions product={product} onEdit={props.onEdit} onDuplicate={props.onDuplicate} onArchive={props.onArchive} onStatusChange={props.onStatusChange} /></td>}
              </tr>;
            }) : <tr><td className="products-empty" colSpan={props.isAdmin ? 11 : 9}>Товары не найдены</td></tr>}
          </tbody>
        </table>
        <div className="products-mobile-rows">
          {props.isLoading ? <div className="products-mobile-empty">Загрузка товаров...</div> : props.rows.length ? props.rows.map((product) => {
            const active = product.status === "ACTIVE";
            const archived = product.status === "ARCHIVED";
            return <article className="products-mobile-card" key={product.id}>
              <div className="products-mobile-heading">
                <div className="products-name-cell"><span className="products-thumbnail"><Package size={17} /></span><span><strong>{product.name}</strong><small>{product.sku}</small></span></div>
                <span className={`products-status${active ? " is-active" : archived ? " is-archived" : " is-inactive"}`}><Circle size={9} fill="currentColor" />{product.status}</span>
              </div>
              <div className="products-mobile-meta"><span>{product.category?.name || "Без категории"}</span><span>{product.unit || "шт"}</span><span>Добавлен {dateLabel(product.createdAt)}</span></div>
              <div className="products-mobile-values">
                {props.isAdmin && <div><small>Закупка</small><strong>{money(product.purchasePrice)}</strong></div>}
                <div><small>Продажа</small><strong>{money(product.salePrice)}</strong></div>
                <div><small>Остаток</small><StockCell product={product} /></div>
              </div>
              <div className="products-mobile-footer"><span>Изменен {dateLabel(product.updatedAt)}</span>{props.isAdmin && <ProductActions product={product} onEdit={props.onEdit} onDuplicate={props.onDuplicate} onArchive={props.onArchive} onStatusChange={props.onStatusChange} />}</div>
            </article>;
          }) : <div className="products-mobile-empty">Товары не найдены</div>}
        </div>
      </div>

      <footer className="products-table-footer">
        <span>Всего: {props.total}</span>
        <div className="products-pagination">
          <button type="button" aria-label="Предыдущая страница" disabled={props.page <= 1} onClick={() => props.onPage(Math.max(1, props.page - 1))}><ChevronLeft size={17} /></button>
          <label>Страница <input type="number" min="1" max={pageCount} value={props.page || ""} onChange={(event) => props.onPage(Math.min(pageCount, Math.max(1, Number(event.target.value) || 1)))} /> из {pageCount}</label>
          <button type="button" aria-label="Следующая страница" disabled={props.page >= pageCount} onClick={() => props.onPage(Math.min(pageCount, props.page + 1))}><ChevronRight size={17} /></button>
        </div>
        <label className="products-page-size">Элементов на странице
          <select value={props.pageSize} onChange={(event) => props.onPageSize(Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select>
        </label>
      </footer>
    </section>
  );
}