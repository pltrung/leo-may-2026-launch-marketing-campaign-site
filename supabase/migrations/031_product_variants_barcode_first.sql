-- Product variants & barcode-first inventory
-- products: id, name, brand, category, image
-- product_variants: id, product_id, sku, size, barcode, price, cost (barcode unique, sku pattern PRODUCTCODE-SIZE)
-- inventory: variant_id, quantity, location

-- 1) Add brand to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text;

-- 2) Create product_variants
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  size text,
  barcode text,
  price int NOT NULL DEFAULT 0,
  cost int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_barcode_unique
  ON product_variants (barcode) WHERE barcode IS NOT NULL AND TRIM(barcode) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_product_sku
  ON product_variants (product_id, sku);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants (sku);

-- 3) Migrate existing products to one variant each (only if products still has sku/price/cost/barcode)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sku'
  ) THEN
    INSERT INTO product_variants (product_id, sku, size, barcode, price, cost)
    SELECT p.id, p.sku, NULL, p.barcode, p.price, p.cost FROM products p
    ON CONFLICT (product_id, sku) DO NOTHING;
  END IF;
END $$;

-- 4) Inventory: add variant_id, backfill, then switch (only if inventory still has product_id)
DROP INDEX IF EXISTS idx_inventory_product_size_unique;

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'product_id'
  ) THEN
    UPDATE inventory i
    SET variant_id = (SELECT pv.id FROM product_variants pv WHERE pv.product_id = i.product_id LIMIT 1)
    WHERE i.variant_id IS NULL AND i.product_id IS NOT NULL;

    ALTER TABLE inventory DROP COLUMN IF EXISTS product_id;
    ALTER TABLE inventory DROP COLUMN IF EXISTS size;
  END IF;

  DELETE FROM inventory WHERE variant_id IS NULL;
  ALTER TABLE inventory ALTER COLUMN variant_id SET NOT NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_variant_location_unique
  ON inventory (variant_id, (COALESCE(location, '')));

-- 5) Products: remove columns moved to variants
ALTER TABLE products DROP COLUMN IF EXISTS sku;
ALTER TABLE products DROP COLUMN IF EXISTS price;
ALTER TABLE products DROP COLUMN IF EXISTS cost;
ALTER TABLE products DROP COLUMN IF EXISTS barcode;

DROP INDEX IF EXISTS idx_products_sku;
DROP INDEX IF EXISTS idx_products_barcode;

-- 6) transaction_items: add variant_id for inventory deduction
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_items_variant_id ON transaction_items (variant_id);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Comment for SKU pattern: PRODUCTCODE-SIZE e.g. SCA100-41
COMMENT ON COLUMN product_variants.sku IS 'Format: PRODUCTCODE-SIZE e.g. SCA100-41';
