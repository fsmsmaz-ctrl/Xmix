-- ══════════════════════════════════════════════════════════════════
--  Xmix — إعداد قاعدة البيانات الكامل (PostgreSQL / Supabase)
--  الصق هذا الملف كاملاً في Supabase SQL Editor ثم اضغط Run مرة واحدة.
--
--  ينشئ الجداول + يزرع بداية نظيفة فقط:
--    • رف قت عمان الرئيسي (بدون منتجات — تُضاف من لوحة التاجر)
--    • حساب مسؤول النظام:   admin@xmix.om
--    • حساب تاجر قت عمان:   owner@qatoman.om
--  لا يحتوي أي حسابات أو منتجات تجريبية.
--  آمن لإعادة التشغيل (يحذف القديم أولاً).
-- ══════════════════════════════════════════════════════════════════

BEGIN;

-- 1) حذف البيانات القديمة إن وُجدت
DROP TABLE IF EXISTS "OrderItem", "Order", "ProductImage", "Product", "User", "Company", "JoinRequest", "ContactMessage" CASCADE;

-- 2) إنشاء الجداول (مولّدة تلقائياً من prisma/schema.prisma)
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "taglineAr" TEXT NOT NULL,
    "taglineEn" TEXT NOT NULL,
    "descAr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "gradient" TEXT NOT NULL,
    "locationAr" TEXT NOT NULL,
    "locationEn" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descAr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "oldPrice" DOUBLE PRECISION,
    "emoji" TEXT NOT NULL,
    "gradient" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 20,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "reviews" INTEGER NOT NULL DEFAULT 12,
    "badgeAr" TEXT,
    "badgeEn" TEXT,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "images" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "mime" TEXT NOT NULL DEFAULT 'image/jpeg',
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cod',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "shipping" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "qty" INTEGER NOT NULL,
    "companyId" TEXT,
    "companyAr" TEXT,
    "companyEn" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) رف قت عمان الرئيسي (شركة معتمدة — بدون منتجات تجريبية)
INSERT INTO "Company" ("id","slug","nameAr","nameEn","taglineAr","taglineEn","descAr","descEn","category","emoji","color","gradient","locationAr","locationEn","rating","isFeatured","status","joinedAt") VALUES
('cmp_qat_oman_flagship', 'qat-oman', 'قت عمان', 'Qat Oman',
 'رفّك الزراعي الأول — من البذرة إلى الحصاد', 'Your First Agri Shelf — From Seed to Harvest',
 'قت عمان هي الرف الرئيسي والشركة الرائدة في سوق Xmix المتخصص بالمنتجات والخدمات الزراعية في سلطنة عُمان.',
 'Qat Oman is the flagship shelf of Xmix — Oman’s specialised marketplace for agricultural products and services.',
 'agri', '🌾', '#8B5CF6', 'linear-gradient(135deg,#7C3AED 0%,#4C1D95 100%)',
 'مسقط، سلطنة عُمان', 'Muscat, Oman', 4.9, TRUE, 'active', CURRENT_TIMESTAMP);

-- 4) حسابات النظام فقط (مسؤول النظام + تاجر قت عمان)
INSERT INTO "User" ("id","email","passwordHash","name","role","companyId","createdAt") VALUES
('usr_xmix_system_admin', 'admin@xmix.om', 'f884b81410aa2f6f03f0c8bc559e3aba:7a17d9fba63a6604866e607dc00174c5685d896ad92fac43fc444cb65d76e4c5e0cebfcd995b6aba752a485a3831ad99702d70c6e5378852d3746195c39075d9', 'مسؤول النظام', 'admin', NULL, CURRENT_TIMESTAMP),
('usr_qat_oman_owner', 'owner@qatoman.om', '20f9b0047f99154a18bd179ce95777bc:b0cf49d95b66dd2cb573c1c9224a3aecaf894e2e568bee5374a966c8104aae3f293dd5423f318e0586e0cd4018081507cd23560cb419c7c256aff57a726c843e', 'إدارة قت عمان', 'owner', 'cmp_qat_oman_flagship', CURRENT_TIMESTAMP);

COMMIT;
