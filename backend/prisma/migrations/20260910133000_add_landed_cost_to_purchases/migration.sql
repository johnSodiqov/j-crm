ALTER TABLE "SupplierPurchase"
ADD COLUMN "logisticsCost" DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE "PurchaseItem"
ADD COLUMN "actualUnitCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "actualTotal" DECIMAL(14,2) NOT NULL DEFAULT 0;

UPDATE "PurchaseItem"
SET "actualUnitCost" = "unitCost",
    "actualTotal" = "total";
