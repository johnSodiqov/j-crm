import { IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, Role } from '@prisma/client';
export class LoginDto { @IsEmail() email!: string; @IsString() @MinLength(6) password!: string; }
export class ProductDto { @IsString() @IsNotEmpty() name!: string; @Matches(/^[A-Za-z0-9_-]+$/) sku!: string; @IsString() @IsNotEmpty() categoryId!: string; @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) purchasePrice!: number; @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) salePrice!: number; @Type(() => Number) @IsInt() @Min(0) stock!: number; @Type(() => Number) @IsInt() @Min(0) minStock!: number; @IsOptional() @IsString() @IsNotEmpty() unit?: string; }
export class UpdateProductDto { @IsOptional() @IsString() @IsNotEmpty() name?: string; @IsOptional() @Matches(/^[A-Za-z0-9_-]+$/) sku?: string; @IsOptional() @IsString() @IsNotEmpty() categoryId?: string; @IsOptional() @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) purchasePrice?: number; @IsOptional() @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) salePrice?: number; @IsOptional() @Type(() => Number) @IsInt() @Min(0) stock?: number; @IsOptional() @Type(() => Number) @IsInt() @Min(0) minStock?: number; @IsOptional() @IsString() @IsNotEmpty() unit?: string; }
export class SaleLineDto { @IsString() @IsNotEmpty() productId!: string; @Type(() => Number) @IsInt() @Min(1) quantity!: number; }
export class SalePaymentDto { @IsEnum(PaymentMethod) method!: PaymentMethod; @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) amount!: number; }
export class SaleDto {
	@IsArray() @IsNotEmpty() @ValidateNested({ each: true }) @Type(() => SaleLineDto) items!: SaleLineDto[];
	@IsOptional() @IsString() customerId?: string;
	@IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
	@IsOptional() @IsDateString() dueDate?: string;
	@IsOptional() @ValidateNested({ each: true }) @Type(() => SalePaymentDto) payments?: SalePaymentDto[];
}
export class CategoryDto { @IsString() @IsNotEmpty() name!: string; }
export class UpdateCategoryDto { @IsString() @IsNotEmpty() name!: string; }
export class CustomerDto { @IsString() @IsNotEmpty() name!: string; @IsOptional() @Matches(/^\+?[0-9 ()-]{7,20}$/) phone?: string; @IsOptional() @IsString() address?: string; }
export class ExpenseDto { @IsString() @IsNotEmpty() category!: string; @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) amount!: number; @IsOptional() @IsDateString() date?: string; @IsOptional() @IsString() comment?: string; }
export class SupplierDto { @IsString() @IsNotEmpty() name!: string; @IsOptional() @Matches(/^\+?[0-9 ()-]{7,20}$/) phone?: string; @IsOptional() @IsString() contactPerson?: string; @IsOptional() @IsString() comment?: string; }
export class PurchaseLineDto { @IsString() @IsNotEmpty() productId!: string; @Type(() => Number) @IsInt() @Min(1) quantity!: number; @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) unitCost!: number; }
export class PurchaseDto { @IsString() @IsNotEmpty() supplierId!: string; @IsArray() @IsNotEmpty() @ValidateNested({ each: true }) @Type(() => PurchaseLineDto) items!: PurchaseLineDto[]; @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) paidAmount!: number; @IsOptional() @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) logisticsCost?: number; @IsOptional() @IsDateString() dueDate?: string; }
export class DebtPaymentDto { @IsString() debtId!: string; @Type(() => Number) @IsNumber() @Min(0.01) amount!: number; @IsEnum(PaymentMethod) method!: PaymentMethod; }
export class SupplierPaymentDto { @IsString() purchaseId!: string; @Type(() => Number) @IsNumber() @Min(0.01) amount!: number; @IsEnum(PaymentMethod) method!: PaymentMethod; }
export class SaleReturnDto { @IsString() @IsNotEmpty() saleId!: string; @IsString() @IsNotEmpty() productId!: string; @Type(() => Number) @IsInt() @Min(1) quantity!: number; @IsString() @IsNotEmpty() reason!: string; }
export class StockAdjustmentDto { @IsString() @IsNotEmpty() productId!: string; @Type(() => Number) @IsInt() @Min(0) newStock!: number; @IsString() @IsNotEmpty() reason!: string; }
export class UpdateUserDto { @IsOptional() @IsString() @IsNotEmpty() name?: string; @IsOptional() @IsEmail() email?: string; @IsOptional() @IsEnum(Role) role?: Role; @IsOptional() @IsBoolean() active?: boolean; @IsOptional() @IsString() @MinLength(6) password?: string; }
export class CreateUserDto { @IsString() @IsNotEmpty() name!: string; @IsEmail() email!: string; @IsString() @MinLength(6) password!: string; @IsOptional() @IsEnum(Role) role?: Role; }
export class TaskDto { @IsString() @IsNotEmpty() title!: string; @IsOptional() @IsString() description?: string; }