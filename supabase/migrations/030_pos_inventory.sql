-- POS & Inventory: products, inventory, pos_transactions, transaction_items

-- Products (SKU master)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('shoes', 'chalk', 'merch', 'rental')),
  price int NOT NULL DEFAULT 0,
  cost int NOT NULL DEFAULT 0,
  barcode text,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- Inventory (quantity per product; size/location optional)
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size text,
  quantity int NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_id, COALESCE(size, ''))
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory (product_id);

-- POS transactions (retail revenue)
CREATE TABLE IF NOT EXISTS pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  total int NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('vietqr', 'cash')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed')),
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_member_id ON pos_transactions (member_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created_at ON pos_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_status ON pos_transactions (payment_status);

-- Transaction line items
CREATE TABLE IF NOT EXISTS transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  sku text NOT NULL,
  name text,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items (transaction_id);

-- RLS: admin only via service role; no direct client access
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- No policies: all access via service role in admin APIs

-- Seed default products for front desk (rental, chalk)
INSERT INTO products (name, sku, category, price, cost, barcode) VALUES
  ('Rental Shoes', 'RENTAL_SHOES', 'rental', 50000, 0, NULL),
  ('Chalk Bag', 'CHALK_BAG', 'chalk', 80000, 0, NULL)
ON CONFLICT (sku) DO NOTHING;
