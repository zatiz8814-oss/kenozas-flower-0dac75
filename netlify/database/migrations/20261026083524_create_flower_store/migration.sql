CREATE TABLE "accounts" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"is_admin" boolean DEFAULT false NOT NULL,
	"cart" jsonb DEFAULT '[]' NOT NULL,
	"wishlist" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" serial PRIMARY KEY,
	"actor" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"order_id" integer PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"type" text NOT NULL,
	"fulfillment" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"courier_note" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"payment" text NOT NULL,
	"payment_status" text DEFAULT 'Lunas' NOT NULL,
	"status" text DEFAULT 'Dikonfirmasi' NOT NULL,
	"subtotal" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"request_key" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"stock" integer NOT NULL,
	"category" text NOT NULL,
	"image" text NOT NULL,
	"tag" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promos" (
	"code" text PRIMARY KEY,
	"percent" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY,
	"customer_id" text NOT NULL,
	"product_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_accounts_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_accounts_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");
INSERT INTO categories (name) VALUES ('Mawar') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Tulip') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Lily') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Sunflower') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Bouquet') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Hampers') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Bunga Meja') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Bunga Wisuda') ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Bunga Ulang Tahun') ON CONFLICT DO NOTHING;
INSERT INTO products (name,description,price,stock,category,image,tag) VALUES ('Pink Whisper Bouquet','Rangkaian mawar pink lembut dan baby’s breath, dibungkus kertas premium dengan pita satin. Hadiah kecil dengan makna yang besar.','185000','24','Bouquet','/img/pink-bouquet.jpg','Bestseller');
INSERT INTO products (name,description,price,stock,category,image,tag) VALUES ('Blushing Rose','Mawar merah muda segar pilihan, dirangkai dengan eucalyptus yang harum. Manis untuk merayakan orang tersayang.','225000','18','Mawar','/img/rose.jpg','Favorit');
INSERT INTO products (name,description,price,stock,category,image,tag) VALUES ('Tulip Sweetheart','Tulip pink elegan dengan balutan lembut. Sebuah ungkapan sayang yang sederhana dan berkesan.','275000','12','Tulip','/img/tulip.jpg','Baru');
INSERT INTO products (name,description,price,stock,category,image,tag) VALUES ('Sunshine in a Bouquet','Bunga matahari ceria untuk membawa senyum dan semangat baru di setiap hari istimewa.','165000','20','Sunflower','/img/sunflower.jpg','');
INSERT INTO products (name,description,price,stock,category,image,tag) VALUES ('White Lily Garden','Lily putih yang anggun dengan dedaunan segar, cantik untuk rumah maupun hadiah yang berkesan.','245000','8','Lily','/img/lily.jpg','Baru');
INSERT INTO products (name,description,price,stock,category,image,tag) VALUES ('Little Love Hampers','Buket bunga segar mungil dalam kemasan hadiah cantik untuk momen penuh kasih.','325000','5','Hampers','/img/hero.png','Pilihan spesial');
INSERT INTO products (name,description,price,stock,category,image,tag) VALUES ('Graduation Bloom','Buket mawar pastel untuk merayakan langkah baru dan pencapaian luar biasa.','195000','16','Bunga Wisuda','/img/pink-bouquet.jpg','');
INSERT INTO products (name,description,price,stock,category,image,tag) VALUES ('Birthday Petals','Perpaduan mawar dan bunga musiman untuk mengucapkan selamat ulang tahun dengan penuh cinta.','215000','15','Bunga Ulang Tahun','/img/rose.jpg','');
INSERT INTO promos (code,percent,active) VALUES ('BLOOM10',10,true);
INSERT INTO settings (key,value) VALUES ('admin_name','haezaano'),('admin_hash','56ddb1aef7160e9f9d09a7464321c2aa:908882072cec1f4d0b5e1f05a9d3825c453b7dd739266185893e4b4f6a2c28f1ee878262e133b8067d893dad87cd0dd9022c1163c09516aefd5fb87c5b442ad0');
