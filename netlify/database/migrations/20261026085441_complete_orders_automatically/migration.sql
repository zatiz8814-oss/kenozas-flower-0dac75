ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'Selesai';
--> statement-breakpoint
UPDATE orders SET status = 'Selesai', payment_status = 'Lunas', updated_at = NOW()
WHERE status IN ('Menunggu Konfirmasi', 'Dikonfirmasi', 'Diproses', 'Siap Diambil/Dikirim');
--> statement-breakpoint
-- Adjust the original catalog only; preserve custom prices and historical invoice items.
UPDATE products AS p SET price = v.new_price
FROM (VALUES
  ('Pink Whisper Bouquet', 185000, 55000),
  ('Blushing Rose', 225000, 65000),
  ('Tulip Sweetheart', 275000, 85000),
  ('Sunshine in a Bouquet', 165000, 45000),
  ('White Lily Garden', 245000, 75000),
  ('Little Love Hampers', 325000, 99000),
  ('Graduation Bloom', 195000, 59000),
  ('Birthday Petals', 215000, 69000)
) AS v(name, old_price, new_price)
WHERE p.name = v.name AND p.price = v.old_price;
