import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './common/auth.guard';
import { RoleGuard } from './common/role.guard';
import { Roles } from './common/auth.decorator';
import { CategoryDto, CreateUserDto, CustomerDto, DebtPaymentDto, ExpenseDto, LoginDto, ProductDto, PurchaseDto, SaleDto, SaleReturnDto, StockAdjustmentDto, SupplierDto, SupplierPaymentDto, TaskDto, UpdateCategoryDto, UpdateProductDto, UpdateUserDto } from './common/dto';
@Controller()
@UseGuards(AuthGuard, RoleGuard)
export class AppController {
  constructor(private service: AppService) {}
  @Post('auth/login') login(@Body() b:LoginDto) { return this.service.login(b.email, b.password); }
  @Get('products') products(@Req() req:any, @Query() q:any) { return this.service.products(q, req.user.role); }
  @Get('products/:id') product(@Req() req:any, @Param('id') id:string) { return this.service.product(id, req.user.role); }
  @Post('products') @Roles('ADMIN') createProduct(@Body() b:ProductDto) { return this.service.createProduct(b); }
  @Patch('products/:id') @Roles('ADMIN') updateProduct(@Param('id') id:string,@Body() b:UpdateProductDto) { return this.service.updateProduct(id,b); }
  @Delete('products/:id') @Roles('ADMIN') archive(@Param('id') id:string) { return this.service.archiveProduct(id); }
  @Get('categories') categories() { return this.service.categories(); }
  @Post('categories') @Roles('ADMIN') createCategory(@Body() b:CategoryDto) { return this.service.createCategory(b.name); }
  @Patch('categories/:id') @Roles('ADMIN') updateCategory(@Param('id') id:string,@Body() b:UpdateCategoryDto) { return this.service.updateCategory(id,b.name); }
  @Delete('categories/:id') @Roles('ADMIN') deleteCategory(@Param('id') id:string) { return this.service.deleteCategory(id); }
  @Get('sales') sales(@Req() req:any, @Query() q:any) { return this.service.sales(q, req.user.role); }
  @Get('sales/:id') sale(@Req() req:any, @Param('id') id:string) { return this.service.sale(id, req.user.role); }
  @Post('sales') createSale(@Req() req:any,@Body() b:SaleDto) { return this.service.createSale(req.user.sub,b); }
  @Post('returns') createReturn(@Req() req:any, @Body() b:SaleReturnDto) { return this.service.createReturn(req.user.sub, b); }
  @Get('returns') @Roles('ADMIN') returns(@Query() q:any) { return this.service.returns(q); }
  @Get('customers') customers(@Req() req:any, @Query('search') search?:string) { return this.service.customers(search, req.user.role); }
  @Get('customers/:id') customer(@Req() req:any, @Param('id') id:string) { return this.service.customer(id, req.user.role); }
  @Post('customers') createCustomer(@Body() b:CustomerDto) { return this.service.createCustomer(b); }
  @Get('expenses') @Roles('ADMIN') expenses(@Query() q:any) { return this.service.expenses(q); }
  @Post('expenses') @Roles('ADMIN') createExpense(@Req() req:any, @Body() b:ExpenseDto) { return this.service.createExpense(req.user.sub, b); }
  @Get('suppliers') @Roles('ADMIN') suppliers() { return this.service.suppliers(); }
  @Get('suppliers/:id') @Roles('ADMIN') supplier(@Param('id') id:string) { return this.service.supplier(id); }
  @Post('suppliers') @Roles('ADMIN') createSupplier(@Body() b:SupplierDto) { return this.service.createSupplier(b); }
  @Post('purchases') @Roles('ADMIN') createPurchase(@Req() req:any, @Body() b:PurchaseDto) { return this.service.createPurchase(req.user.sub, b); }
  @Post('suppliers/payment') @Roles('ADMIN') paySupplier(@Body() b:SupplierPaymentDto) { return this.service.paySupplier(b); }
  @Get('debts') @Roles('ADMIN') debts(@Query('status') status?:string) { return this.service.debts(status); }
  @Post('debts/payment') @Roles('ADMIN') payDebt(@Body() b:DebtPaymentDto) { return this.service.payDebt(b); }
  @Get('warehouse') warehouse(@Req() req:any) { return this.service.warehouse(req.user.role); }
  @Get('warehouse/:productId/movements') warehouseMovements(@Param('productId') productId:string) { return this.service.warehouseMovements(productId); }
  @Post('warehouse/adjustment') @Roles('ADMIN') adjustment(@Req() req:any,@Body() b:StockAdjustmentDto) { return this.service.adjustment(req.user.sub,b); }
  @Get('dashboard') dashboard(@Req() req:any) { return this.service.dashboard(req.user.role); }
  @Get('exchange-rate') @Roles('ADMIN') exchangeRate() { return this.service.exchangeRate(); }
  @Get('reports') @Roles('ADMIN') reports(@Query() q:any) { return this.service.reports(q); }
  @Get('reports/filters') reportFilters() { return this.service.reportFilters(); }
  @Get('audit') @Roles('ADMIN') audit(@Query() q:any) { return this.service.audit(q); }
  @Get('tasks') tasks() { return this.service.tasks(); }
  @Post('tasks') createTask(@Req() req:any, @Body() b:TaskDto) { return this.service.createTask(req.user.sub, b); }
  @Patch('tasks/:id/complete') completeTask(@Req() req:any, @Param('id') id:string) { return this.service.completeTask(id, req.user.sub); }
  @Get('users') @Roles('ADMIN') users() { return this.service.users(); }
  @Post('users') @Roles('ADMIN') createUser(@Body() b:CreateUserDto) { return this.service.createUser(b); }
  @Patch('users/:id') @Roles('ADMIN') updateUser(@Param('id') id:string,@Body() b:UpdateUserDto) { return this.service.updateUser(id,b); }
  @Delete('users/:id') @Roles('ADMIN') deleteUser(@Param('id') id:string) { return this.service.deleteUser(id); }
}
