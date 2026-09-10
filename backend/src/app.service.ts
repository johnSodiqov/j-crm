import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DebtStatus, PaymentMethod, Prisma, ProductStatus, StockMovementType } from '@prisma/client';
import Decimal from 'decimal.js';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AppService {
  private exchangeRateCache: { buy: number; sell: number; updatedAt: string } | null = null;
  constructor(private db: PrismaService, private jwt: JwtService) {}
  private clean<T>(value: T): T { return JSON.parse(JSON.stringify(value, (_, v) => typeof v === 'object' && v?.constructor?.name === 'Decimal' ? Number(v) : v)); }
  async exchangeRate() {
    try {
      const response = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/');
      if (!response.ok) throw new Error('Курс недоступен');
      const [currency] = await response.json() as [{ Rate: string }];
      const rate = Number(currency?.Rate);
      if (!rate) throw new Error('Некорректный курс');
      this.exchangeRateCache = { buy: rate, sell: rate, updatedAt: new Date().toISOString() };
    } catch { if (!this.exchangeRateCache) throw new BadRequestException('Не удалось получить курс USD'); }
    return this.exchangeRateCache;
  }
  async login(email: string, password: string) { const user = await this.db.user.findUnique({ where: { email } }); if (!user || !user.active || !(await bcrypt.compare(password, user.password))) throw new ConflictException('Неверный email или пароль'); const safe = { id: user.id, name: user.name, email: user.email, role: user.role }; return { accessToken: this.jwt.sign({ sub: user.id, email: user.email, role: user.role }), user: safe }; }
  async products(query: any, role?: string) { const where: Prisma.ProductWhereInput = { ...(query.includeArchived ? {} : { status: ProductStatus.ACTIVE }), ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { sku: { contains: query.search, mode: 'insensitive' } }] } : {}), ...(query.categoryId ? { categoryId: query.categoryId } : {}) }; const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 10)); const [items, total] = await this.db.$transaction([this.db.product.findMany({ where, include: { category: true }, orderBy: { [query.sort || 'createdAt']: query.order === 'asc' ? 'asc' : 'desc' }, skip: (page - 1) * limit, take: limit }), this.db.product.count({ where })]); const safeItems = role === 'ADMIN' ? items : items.map(({ purchasePrice, ...item }) => item); return { items: this.clean(safeItems), total, page, limit, pages: Math.ceil(total / limit) }; }
  async product(id: string, role?: string) { const p = await this.db.product.findUnique({ where: { id }, include: { category: true } }); if (!p) throw new NotFoundException('Товар не найден'); if (role !== 'ADMIN') { const { purchasePrice, ...safe } = p; return this.clean(safe); } return this.clean(p); }
  async createProduct(data: any) { if (data.purchasePrice < 0 || data.salePrice < 0 || data.stock < 0 || data.minStock < 0) throw new BadRequestException('Цены и количество не могут быть отрицательными'); const payload = { ...data, sku: String(data.sku).trim().toUpperCase(), purchasePrice: new Decimal(data.purchasePrice), salePrice: new Decimal(data.salePrice) }; if (!payload.sku) throw new BadRequestException('Артикул обязателен'); try { return this.clean(await this.db.product.create({ data: payload, include: { category: true } })); } catch (e: any) { if (e.code === 'P2002') throw new ConflictException('SKU уже используется'); throw e; } }
  async updateProduct(id: string, data: any) { if (data.purchasePrice !== undefined && data.purchasePrice < 0 || data.salePrice !== undefined && data.salePrice < 0 || data.stock !== undefined && data.stock < 0) throw new BadRequestException('Значения не могут быть отрицательными'); const payload = { ...data }; if (payload.sku !== undefined) { payload.sku = String(payload.sku).trim().toUpperCase(); if (!payload.sku) throw new BadRequestException('Артикул обязателен'); } if (payload.purchasePrice !== undefined) payload.purchasePrice = new Decimal(payload.purchasePrice); if (payload.salePrice !== undefined) payload.salePrice = new Decimal(payload.salePrice); try { return this.clean(await this.db.product.update({ where: { id }, data: payload, include: { category: true } })); } catch (e: any) { if (e.code === 'P2002') throw new ConflictException('SKU уже используется'); throw new NotFoundException('Товар не найден'); } }
  async archiveProduct(id: string) { return this.updateProduct(id, { status: ProductStatus.ARCHIVED }); }
  categories() { return this.db.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: 'asc' } }); }
  async createCategory(name: string) { try { return await this.db.category.create({ data: { name } }); } catch { throw new ConflictException('Категория уже существует'); } }
  async updateCategory(id: string, name: string) { try { return await this.db.category.update({ where: { id }, data: { name } }); } catch { throw new NotFoundException('Категория не найдена'); } }
  async deleteCategory(id: string) { const count = await this.db.product.count({ where: { categoryId: id } }); if (count) throw new ConflictException('Нельзя удалить категорию с товарами'); await this.db.category.delete({ where: { id } }); return { ok: true }; }
  async sales(query: any, role?: string) { const items = await this.db.sale.findMany({ include: { user: { select: { name: true } }, items: { include: { product: true } }, payments: true }, orderBy: { createdAt: 'desc' }, take: Math.min(100, Number(query.limit) || 50) }); const safe = role === 'ADMIN' ? items : items.map(({ totalProfit, ...sale }) => ({ ...sale, items: sale.items.map(({ purchasePrice, profit, ...line }) => ({ ...line, product: (({ purchasePrice, ...product }) => product)(line.product) })) })); return this.clean(safe); }
  async sale(id: string, role?: string) { const item = await this.db.sale.findUnique({ where: { id }, include: { user: { select: { name: true } }, items: { include: { product: true } }, payments: true } }); if (!item) throw new NotFoundException('Продажа не найдена'); if (role !== 'ADMIN') { const { totalProfit, ...sale } = item; return this.clean({ ...sale, items: sale.items.map(({ purchasePrice, profit, ...line }) => ({ ...line, product: (({ purchasePrice, ...product }) => product)(line.product) })) }); } return this.clean(item); }
  async customers(search?: string, role?: string) { const customers = await this.db.customer.findMany({ where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : undefined, include: { _count: { select: { sales: true } }, debts: { where: { status: DebtStatus.ACTIVE }, select: { amount: true, paidAmount: true } } }, orderBy: { name: 'asc' } }); return this.clean(role === 'ADMIN' ? customers : customers.map(({ debts, ...customer }) => customer)); }
  async createCustomer(data: any) { return this.clean(await this.db.customer.create({ data: { name: data.name.trim(), phone: data.phone?.trim() || undefined, address: data.address?.trim() || undefined } })); }
  async customer(id: string, role?: string) { const customer = await this.db.customer.findUnique({ where: { id }, include: { sales: { include: { items: { include: { product: { select: { name: true } } } }, payments: true }, orderBy: { createdAt: 'desc' } }, debts: { include: { payments: true }, orderBy: { createdAt: 'desc' } }, payments: { orderBy: { createdAt: 'desc' } } } }); if (!customer) throw new NotFoundException('Клиент не найден'); if (role !== 'ADMIN') { const { debts, payments, ...safeCustomer } = customer; return this.clean({ ...safeCustomer, sales: safeCustomer.sales.map(({ totalAmount, totalProfit, payments: salePayments, ...sale }) => ({ ...sale, items: sale.items.map(({ total, profit, purchasePrice, ...item }) => item) })) }); } return this.clean(customer); }
  async expenses(query: any) { const where: Prisma.ExpenseWhereInput = { ...(query.from || query.to ? { date: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}) }; return this.clean(await this.db.expense.findMany({ where, include: { responsible: { select: { name: true } } }, orderBy: { date: 'desc' } })); }
  async createExpense(userId: string, data: any) { if (data.amount <= 0) throw new BadRequestException('Сумма расхода должна быть больше нуля'); const date = data.date ? new Date(data.date) : new Date(); if (Number.isNaN(date.getTime())) throw new BadRequestException('Некорректная дата расхода'); return this.clean(await this.db.expense.create({ data: { category: data.category.trim(), amount: new Decimal(data.amount), date, comment: data.comment?.trim() || undefined, responsibleId: userId } })); }
  async suppliers() { return this.clean(await this.db.supplier.findMany({ include: { purchases: { include: { items: true }, orderBy: { createdAt: 'desc' } } }, orderBy: { name: 'asc' } })); }
  async supplier(id: string) { const supplier = await this.db.supplier.findUnique({ where: { id }, include: { purchases: { include: { items: { include: { product: { select: { name: true, sku: true } } } }, payments: true }, orderBy: { createdAt: 'desc' } }, payments: { orderBy: { createdAt: 'desc' } } } }); if (!supplier) throw new NotFoundException('Поставщик не найден'); return this.clean(supplier); }
  async createSupplier(data: any) { return this.clean(await this.db.supplier.create({ data: { name: data.name.trim(), phone: data.phone?.trim() || undefined, contactPerson: data.contactPerson?.trim() || undefined, comment: data.comment?.trim() || undefined } })); }
  async createPurchase(userId: string, input: any) {
    if (!input.items?.length) throw new BadRequestException('Добавьте товары в закупку');
    return this.db.$transaction(async tx => {
      if (!await tx.supplier.findUnique({ where: { id: input.supplierId } })) throw new NotFoundException('Поставщик не найден');
      let total = new Decimal(0); const items: any[] = [];
      for (const line of input.items) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product) throw new NotFoundException('Товар не найден');
        const itemTotal = new Decimal(line.unitCost).mul(line.quantity); total = total.add(itemTotal);
        items.push({ productId: line.productId, quantity: line.quantity, unitCost: line.unitCost, total: itemTotal });
        await tx.stockMovement.create({ data: { productId: line.productId, userId, type: StockMovementType.PURCHASE, quantity: line.quantity, beforeStock: product.stock, afterStock: product.stock + line.quantity, reason: 'Закупка' } });
      }
      const logisticsCost = new Decimal(input.logisticsCost || 0);
      const paid = new Decimal(input.paidAmount || 0);
      if (paid.gt(total)) throw new BadRequestException('Оплата не может превышать сумму закупки');
      const actualItems = items.map((item) => {
        const share = total.isZero() ? new Decimal(0) : logisticsCost.mul(item.total).div(total);
        const actualTotal = new Decimal(item.total).add(share);
        const actualUnitCost = actualTotal.div(item.quantity);
        return { ...item, actualUnitCost, actualTotal };
      });
      for (const item of actualItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundException('Товар не найден');
        const previousStockValue = new Decimal(product.stock).mul(product.purchasePrice.toString());
        const incomingStockValue = new Decimal(item.actualTotal.toString());
        const nextStock = product.stock + item.quantity;
        const weightedCost = nextStock > 0 ? previousStockValue.add(incomingStockValue).div(nextStock) : item.actualUnitCost;
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity }, purchasePrice: weightedCost } });
      }
      return this.clean(await tx.supplierPurchase.create({ data: { supplierId: input.supplierId, userId, totalAmount: total, logisticsCost, paidAmount: paid, dueDate: input.dueDate ? new Date(input.dueDate) : undefined, items: { create: actualItems }, payments: paid.gt(0) ? { create: { supplierId: input.supplierId, amount: paid, method: PaymentMethod.CASH } } : undefined }, include: { items: true, payments: true } }));
    });
  }
  async paySupplier(input: any) {
    return this.db.$transaction(async tx => {
      const purchase = await tx.supplierPurchase.findUnique({ where: { id: input.purchaseId } });
      if (!purchase) throw new NotFoundException('Закупка не найдена');
      const amount = new Decimal(input.amount); const remaining = new Decimal(purchase.totalAmount.toString()).sub(purchase.paidAmount.toString());
      if (amount.gt(remaining)) throw new BadRequestException('Платеж превышает долг поставщику');
      const updated = new Decimal(purchase.paidAmount.toString()).add(amount);
      await tx.supplierPurchase.update({ where: { id: purchase.id }, data: { paidAmount: updated } });
      return this.clean(await tx.supplierPayment.create({ data: { supplierId: purchase.supplierId, purchaseId: purchase.id, amount, method: input.method } }));
    });
  }
  async debts(status?: string) {
    const debts = await this.db.customerDebt.findMany({ where: status === 'PAID' ? { status: DebtStatus.PAID } : status === 'ACTIVE' ? { status: DebtStatus.ACTIVE } : undefined, include: { customer: true, sale: { select: { id: true, createdAt: true, totalAmount: true } }, payments: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' } });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.clean(debts.map(debt => ({ ...debt, remaining: Number(debt.amount) - Number(debt.paidAmount), overdue: debt.status === DebtStatus.ACTIVE && !!debt.dueDate && debt.dueDate < today, upcoming: debt.status === DebtStatus.ACTIVE && !!debt.dueDate && debt.dueDate >= today && debt.dueDate.getTime() - today.getTime() <= 3 * 86400000 })));
  }
  async payDebt(input: any) {
    return this.db.$transaction(async tx => {
      const debt = await tx.customerDebt.findUnique({ where: { id: input.debtId } });
      if (!debt) throw new NotFoundException('Долг не найден');
      const remaining = new Decimal(debt.amount.toString()).sub(debt.paidAmount.toString());
      const amount = new Decimal(input.amount);
      if (amount.gt(remaining)) throw new BadRequestException('Платеж превышает остаток долга');
      const paidAmount = new Decimal(debt.paidAmount.toString()).add(amount);
      await tx.customerDebt.update({ where: { id: debt.id }, data: { paidAmount, status: paidAmount.gte(debt.amount) ? DebtStatus.PAID : DebtStatus.ACTIVE } });
      return this.clean(await tx.customerPayment.create({ data: { customerId: debt.customerId, debtId: debt.id, method: input.method, amount } }));
    });
  }
  async createSale(userId: string, input: any) {
    if (!input.items?.length) throw new BadRequestException('Корзина пуста');
    return this.db.$transaction(async tx => {
      let total = new Decimal(0), profit = new Decimal(0);
      const rows: any[] = [];
      for (const line of input.items) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product || product.status === ProductStatus.ARCHIVED) throw new NotFoundException('Товар не найден');
        if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new BadRequestException('Количество должно быть положительным целым');
        if (product.stock < line.quantity) throw new BadRequestException(`Недостаточно товара: ${product.name}`);
        const rowTotal = new Decimal(product.salePrice.toString()).mul(line.quantity);
        const rowProfit = new Decimal(product.salePrice.toString()).sub(product.purchasePrice.toString()).mul(line.quantity);
        total = total.add(rowTotal); profit = profit.add(rowProfit);
        rows.push({ productId: product.id, quantity: line.quantity, purchasePrice: product.purchasePrice, salePrice: product.salePrice, total: rowTotal, profit: rowProfit });
        await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: line.quantity } } });
        await tx.stockMovement.create({ data: { productId: product.id, userId, type: StockMovementType.SALE, quantity: line.quantity, beforeStock: product.stock, afterStock: product.stock - line.quantity, reason: 'Продажа' } });
      }
      const method = input.paymentMethod || PaymentMethod.CASH;
      const payments = input.payments?.length ? input.payments : [{ method, amount: total.toNumber() }];
      const paid = payments.reduce((sum: Decimal, payment: any) => sum.add(payment.amount), new Decimal(0));
      if (!paid.eq(total)) throw new BadRequestException('Сумма способов оплаты должна совпадать с суммой чека');
      const debtPayment = payments.find((payment: any) => payment.method === PaymentMethod.DEBT);
      if (debtPayment && !input.customerId) throw new BadRequestException('Для продажи в долг выберите клиента');
      if (input.customerId && !await tx.customer.findUnique({ where: { id: input.customerId } })) throw new NotFoundException('Клиент не найден');
      const sale = await tx.sale.create({ data: { userId, customerId: input.customerId, paymentMethod: payments.length > 1 ? PaymentMethod.MIXED : method, dueDate: input.dueDate ? new Date(input.dueDate) : undefined, totalAmount: total.toFixed(2), totalProfit: profit.toFixed(2), items: { create: rows }, payments: { create: payments.map((payment: any) => ({ method: payment.method, amount: payment.amount })) } }, include: { items: true, payments: true } });
      if (debtPayment) await tx.customerDebt.create({ data: { customerId: input.customerId, saleId: sale.id, amount: debtPayment.amount, dueDate: input.dueDate ? new Date(input.dueDate) : undefined, status: DebtStatus.ACTIVE } });
      return this.clean(sale);
    });
  }
  async createReturn(userId: string, input: any) {
    return this.db.$transaction(async tx => {
      const sale = await tx.sale.findUnique({ where: { id: input.saleId }, include: { items: true } });
      if (!sale) throw new NotFoundException('Продажа не найдена');
      const item = sale.items.find(row => row.productId === input.productId);
      if (!item) throw new BadRequestException('Товар отсутствует в чеке');
      const returned = await tx.saleReturnItem.aggregate({ where: { return: { saleId: sale.id }, productId: item.productId }, _sum: { quantity: true } });
      if ((returned._sum.quantity || 0) + input.quantity > item.quantity) throw new BadRequestException('Нельзя вернуть больше проданного количества');
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException('Товар не найден');
      const result = await tx.saleReturn.create({ data: { saleId: sale.id, userId, reason: input.reason.trim(), items: { create: { productId: item.productId, quantity: input.quantity, amount: new Decimal(item.salePrice.toString()).mul(input.quantity) } } }, include: { items: true } });
      await tx.product.update({ where: { id: product.id }, data: { stock: { increment: input.quantity } } });
      await tx.stockMovement.create({ data: { productId: product.id, userId, type: StockMovementType.RETURN, quantity: input.quantity, beforeStock: product.stock, afterStock: product.stock + input.quantity, reason: input.reason, saleId: sale.id } });
      return this.clean(result);
    });
  }
  async returns(query: any) { return this.clean(await this.db.saleReturn.findMany({ where: query.saleId ? { saleId: query.saleId } : undefined, include: { sale: { select: { id: true, createdAt: true } }, items: { include: { product: { select: { name: true, sku: true } } } } }, orderBy: { createdAt: 'desc' } })); }
  async warehouseMovements(productId: string) { return this.clean(await this.db.stockMovement.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: 100 })); }
  async warehouse(role?: string) { const products = await this.db.product.findMany({ where: { status: ProductStatus.ACTIVE }, include: { adjustments: { orderBy: { createdAt: 'desc' }, take: 10 } }, orderBy: { stock: 'asc' } }); return this.clean(products.map(({ purchasePrice, ...p }) => ({ ...(role === 'ADMIN' ? { purchasePrice } : {}), ...p, stockStatus: p.stock === 0 ? 'Нет в наличии' : p.stock <= p.minStock ? 'Мало' : 'В наличии' })));
  }
  async adjustment(userId: string, input: any) { if (input.newStock < 0) throw new BadRequestException('Количество не может быть отрицательным'); return this.db.$transaction(async tx => { const p = await tx.product.findUnique({ where: { id: input.productId } }); if (!p) throw new NotFoundException('Товар не найден'); await tx.product.update({ where: { id: p.id }, data: { stock: input.newStock } }); await tx.stockMovement.create({ data: { productId: p.id, userId, type: StockMovementType.ADJUSTMENT, quantity: Math.abs(input.newStock - p.stock), beforeStock: p.stock, afterStock: input.newStock, reason: input.reason } }); return tx.stockAdjustment.create({ data: { productId: p.id, userId, previousStock: p.stock, newStock: input.newStock, reason: input.reason } }); }); }
  async dashboard(role?: string) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const week = new Date(start); week.setDate(week.getDate() - 6);
    const [today, monthSales, monthExpenses, monthReturns, totalReturns, totalExpenses, customerCount, customerDebt, supplierDebt, payments, customerPayments, purchases, monthLogistics, totalLogistics, products, recent, weekly, popular] = await Promise.all([
      this.db.sale.aggregate({ where: { createdAt: { gte: start } }, _count: true, _sum: { totalAmount: true, totalProfit: true } }),
      this.db.sale.aggregate({ where: { createdAt: { gte: monthStart } }, _count: true, _sum: { totalAmount: true, totalProfit: true } }),
      this.db.expense.aggregate({ where: { date: { gte: monthStart } }, _sum: { amount: true } }),
      this.db.saleReturnItem.findMany({ where: { return: { createdAt: { gte: monthStart } } }, include: { return: { include: { sale: { include: { items: true } } } } } }),
      this.db.saleReturnItem.aggregate({ _sum: { amount: true } }),
      this.db.expense.aggregate({ _sum: { amount: true } }),
      this.db.customer.count(),
      this.db.customerDebt.aggregate({ where: { status: DebtStatus.ACTIVE }, _sum: { amount: true, paidAmount: true } }),
      this.db.supplierPurchase.aggregate({ _sum: { totalAmount: true, paidAmount: true } }),
      this.db.salePayment.aggregate({ where: { method: { not: PaymentMethod.DEBT } }, _sum: { amount: true } }),
      this.db.customerPayment.aggregate({ _sum: { amount: true } }),
      this.db.supplierPurchase.aggregate({ _sum: { paidAmount: true } }),
      this.db.supplierPurchase.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { logisticsCost: true } }),
      this.db.supplierPurchase.aggregate({ _sum: { logisticsCost: true } }),
      this.db.product.count({ where: { status: ProductStatus.ACTIVE } }),
      this.db.sale.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } }),
      this.db.sale.findMany({ where: { createdAt: { gte: week } }, select: { createdAt: true, totalAmount: true } }),
      this.db.saleItem.groupBy({ by: ['productId'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
    ]);
    const receivable = Number(customerDebt._sum.amount || 0) - Number(customerDebt._sum.paidAmount || 0);
    const payable = Number(supplierDebt._sum.totalAmount || 0) - Number(supplierDebt._sum.paidAmount || 0);
    const cash = Number(payments._sum.amount || 0) + Number(customerPayments._sum.amount || 0) - Number(purchases._sum.paidAmount || 0) - Number(totalLogistics._sum.logisticsCost || 0) - Number(totalExpenses._sum.amount || 0) - Number(totalReturns._sum.amount || 0);
    const low = await this.db.product.findMany({ where: { status: ProductStatus.ACTIVE }, orderBy: { stock: 'asc' }, take: 5 });
    const safeRecent = role === 'ADMIN' ? recent : recent.map(({ totalAmount, totalProfit, ...sale }) => sale);
    const result: any = { today: role === 'ADMIN' ? today : { _count: today._count }, products, recent: safeRecent, weekly: role === 'ADMIN' ? weekly : [], low };
    const returnedRevenue = monthReturns.reduce((sum, item) => sum + Number(item.amount), 0);
    const returnedProfit = monthReturns.reduce((sum, item) => { const saleItem = item.return.sale.items.find(saleLine => saleLine.productId === item.productId); return sum + (Number(item.amount) - Number(saleItem?.purchasePrice || 0) * item.quantity); }, 0);
    if (role === 'ADMIN') Object.assign(result, { month: { salesCount: monthSales._count, revenue: Number(monthSales._sum.totalAmount || 0) - returnedRevenue, profit: Number(monthSales._sum.totalProfit || 0) - returnedProfit - Number(monthExpenses._sum.amount || 0), grossProfit: Number(monthSales._sum.totalProfit || 0) - returnedProfit, expenses: monthExpenses._sum.amount, logistics: Number(monthLogistics._sum.logisticsCost || 0), returns: returnedRevenue }, customers: customerCount, customerDebt: receivable, supplierDebt: payable, cash, popular });
    return this.clean(result);
  }
  async reports(query: any) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 6 * 86400000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new BadRequestException('Некорректный период отчета');
    to.setHours(23, 59, 59, 999); from.setHours(0, 0, 0, 0);
    const saleWhere: Prisma.SaleWhereInput = { createdAt: { gte: from, lte: to }, ...(query.userId ? { userId: query.userId } : {}), ...(query.categoryId ? { items: { some: { product: { categoryId: query.categoryId } } } } : {}) };
    const sales = await this.db.sale.findMany({ where: saleWhere, include: { user: { select: { name: true } }, payments: true, items: { include: { product: { select: { name: true, sku: true, unit: true, category: { select: { name: true } } } } } } }, orderBy: { createdAt: 'desc' } });
    const allItems = sales.flatMap(s => s.items);
    const grouped = new Map<string, { productId: string; name: string; sku: string; quantity: number; revenue: number; profit: number }>();
    for (const item of allItems) { const current = grouped.get(item.productId) || { productId: item.productId, name: item.product.name, sku: item.product.sku, quantity: 0, revenue: 0, profit: 0 }; current.quantity += item.quantity; current.revenue += Number(item.total); current.profit += Number(item.profit); grouped.set(item.productId, current); }
    const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, salesCount: 0, units: 0, revenue: 0 }));
    for (const sale of sales) { const bucket = hourly[new Date(sale.createdAt).getHours()]; bucket.salesCount += 1; bucket.revenue += Number(sale.totalAmount); bucket.units += sale.items.reduce((sum, item) => sum + item.quantity, 0); }
    const dailyMap = new Map<string, { date: string; salesCount: number; units: number; revenue: number; profit: number }>();
    const employeeMap = new Map<string, { name: string; salesCount: number; revenue: number; profit: number }>();
    const categoryMap = new Map<string, { name: string; units: number; revenue: number }>();
    for (const sale of sales) {
      const date = new Date(sale.createdAt).toISOString().slice(0, 10);
      const units = sale.items.reduce((sum, item) => sum + item.quantity, 0);
      const day = dailyMap.get(date) || { date, salesCount: 0, units: 0, revenue: 0, profit: 0 };
      day.salesCount += 1; day.units += units; day.revenue += Number(sale.totalAmount); day.profit += Number(sale.totalProfit); dailyMap.set(date, day);
      const employee = employeeMap.get(sale.userId) || { name: sale.user.name, salesCount: 0, revenue: 0, profit: 0 };
      employee.salesCount += 1; employee.revenue += Number(sale.totalAmount); employee.profit += Number(sale.totalProfit); employeeMap.set(sale.userId, employee);
      for (const item of sale.items) { const name = item.product.category?.name || 'Без категории'; const category = categoryMap.get(name) || { name, units: 0, revenue: 0 }; category.units += item.quantity; category.revenue += Number(item.total); categoryMap.set(name, category); }
    }
    const periodLength = to.getTime() - from.getTime() + 1;
    const previousTo = new Date(from.getTime() - 1); const previousFrom = new Date(from.getTime() - periodLength);
    const previous = await this.db.sale.aggregate({ where: { ...saleWhere, createdAt: { gte: previousFrom, lte: previousTo } }, _count: true, _sum: { totalAmount: true, totalProfit: true } });
    const [expenseRows, stockRows, customerPaymentRows, supplierPaymentRows, purchaseRows] = await Promise.all([
      this.db.expense.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: 'asc' } }),
      this.db.product.findMany({ where: { status: ProductStatus.ACTIVE }, select: { id: true, name: true, sku: true, stock: true, minStock: true, purchasePrice: true, salePrice: true }, orderBy: { stock: 'asc' } }),
      this.db.customerPayment.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { amount: true } }),
      this.db.supplierPayment.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { amount: true } }),
      this.db.supplierPurchase.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { logisticsCost: true } }),
    ]);
    const paymentMap = new Map<string, number>();
    sales.forEach(sale => sale.payments?.forEach((payment: any) => paymentMap.set(payment.method, (paymentMap.get(payment.method) || 0) + Number(payment.amount))));
    const expenseMap = new Map<string, number>();
    expenseRows.forEach(expense => expenseMap.set(expense.category, (expenseMap.get(expense.category) || 0) + Number(expense.amount)));
    const revenue = sales.reduce((n, s) => n + Number(s.totalAmount), 0);
    const profit = sales.reduce((n, s) => n + Number(s.totalProfit), 0);
    const expenses = expenseRows.reduce((n, expense) => n + Number(expense.amount), 0);
    const customerPayments = customerPaymentRows.reduce((n, payment) => n + Number(payment.amount), 0);
    const supplierPayments = supplierPaymentRows.reduce((n, payment) => n + Number(payment.amount), 0);
    const logistics = purchaseRows.reduce((n, purchase) => n + Number(purchase.logisticsCost), 0);
    const cashSales = sales.reduce((n, sale) => n + (sale.payments || []).filter(payment => payment.method !== PaymentMethod.DEBT).reduce((sum, payment) => sum + Number(payment.amount), 0), 0);
    const returnedRevenue = await this.db.saleReturnItem.aggregate({ where: { return: { createdAt: { gte: from, lte: to } } }, _sum: { amount: true } });
    const returns = Number(returnedRevenue._sum.amount || 0);
    const cashIn = cashSales + customerPayments;
    const cashOut = supplierPayments + logistics + expenses + returns;
    return this.clean({ from, to, salesCount: sales.length, revenue, profit, cost: revenue - profit, expenses, logistics, netProfit: profit - expenses, balance: revenue - expenses, balanceDetails: { revenue, cost: revenue - profit, expenses, logistics, netProfit: profit - expenses, cashIn, cashOut, cashBalance: cashIn - cashOut, returns }, averageCheck: sales.length ? revenue / sales.length : 0, units: allItems.reduce((n, i) => n + i.quantity, 0), hourly, daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)), employees: Array.from(employeeMap.values()).sort((a, b) => b.revenue - a.revenue), categories: Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue), paymentMethods: Array.from(paymentMap.entries()).map(([method, amount]) => ({ method, amount })), expensesByCategory: Array.from(expenseMap.entries()).map(([category, amount]) => ({ category, amount })), expenseRows, stock: { products: stockRows.length, value: stockRows.reduce((n, product) => n + product.stock * Number(product.purchasePrice), 0), low: stockRows.filter(product => product.stock > 0 && product.stock <= product.minStock), out: stockRows.filter(product => product.stock === 0) }, previous: { salesCount: previous._count, revenue: Number(previous._sum.totalAmount || 0), profit: Number(previous._sum.totalProfit || 0) }, popular: Array.from(grouped.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10), sales });
  }
  async reportFilters() { const [users, categories] = await Promise.all([this.db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }), this.db.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })]); return { users, categories }; }
  async audit(query: any) { const limit = Math.min(200, Math.max(1, Number(query.limit) || 100)); return this.db.auditLog.findMany({ take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } } } }); }
  async tasks() {
    return this.clean(await this.db.task.findMany({
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        completedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }));
  }
  async createTask(userId: string, data: any) {
    const title = data.title?.trim();
    if (!title) throw new BadRequestException('Название задачи обязательно');
    return this.clean(await this.db.task.create({
      data: { title, description: data.description?.trim() || undefined, createdById: userId },
      include: { createdBy: { select: { id: true, name: true, email: true } }, completedBy: { select: { id: true, name: true, email: true } } },
    }));
  }
  async completeTask(id: string, userId: string) {
    const task = await this.db.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Задача не найдена');
    if (task.status === 'DONE') return this.clean(task);
    return this.clean(await this.db.task.update({
      where: { id },
      data: { status: 'DONE', completedById: userId, completedAt: new Date() },
      include: { createdBy: { select: { id: true, name: true, email: true } }, completedBy: { select: { id: true, name: true, email: true } } },
    }));
  }
  async users() { return this.db.user.findMany({ select: { id:true,name:true,email:true,role:true,active:true,createdAt:true }, orderBy: { createdAt: 'desc' } }); }
  async createUser(data: any) { return this.db.user.create({ data: { ...data, password: await bcrypt.hash(data.password, 10) }, select: { id:true,name:true,email:true,role:true,active:true } }); }
  async updateUser(id: string, data: any) { const payload = { ...data }; if (payload.password) payload.password = await bcrypt.hash(payload.password, 10); else delete payload.password; return this.db.user.update({ where: { id }, data: payload, select: { id:true,name:true,email:true,role:true,active:true } }); }
  deleteUser(id: string) { return this.db.user.update({ where: { id }, data: { active: false }, select: { id:true,active:true } }); }
}
