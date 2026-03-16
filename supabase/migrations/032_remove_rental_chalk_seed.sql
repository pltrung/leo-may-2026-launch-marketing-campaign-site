-- Remove seed products Rental Shoes and Chalk (bag) from inventory.
-- Variants are deleted first (cascades to inventory); then products with no variants left are removed.

DELETE FROM product_variants WHERE sku IN ('RENTAL_SHOES', 'CHALK_BAG');

DELETE FROM products
WHERE NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = products.id);
