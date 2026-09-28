"""Wipe all transactional test data so the app starts fresh for testing:
vendors, products (+ photos), variants and their sizes, carts, and every
purchase order. IDs restart from 1 (first new order is PO-1 again).

KEPT: users, roles/permissions, and master data - category, color (with
swatch codes), pattern, gender, size, gst_master.

Take a backup first (see backend/backups/). Run from the backend/ folder:
    python scripts/reset_test_data.py          # shows what would be deleted
    python scripts/reset_test_data.py --yes    # actually deletes
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db  # noqa: E402

# Every table holding test data. Listed together in one TRUNCATE, so the
# foreign keys between them are satisfied; nothing outside this list refers
# to them, so no CASCADE is needed (and none is used - it could otherwise
# silently empty a table not listed here).
TABLES = [
    'cart_size', 'cart',
    'po_size_detail', 'po_variant_detail', 'po_product_detail', 'purchase_order',
    'variant_size', 'variant',
    'product_photo', 'product',
    'vendor',
]


def counts():
    return {t: db.execute_query(f"SELECT COUNT(*) AS n FROM {t}")[0]['n'] for t in TABLES}


def main():
    if not db.connect():
        sys.exit("Could not connect to the database - check backend/.env")
    try:
        for t, n in counts().items():
            print(f"  {t:<20} {n} row(s)")
        if '--yes' not in sys.argv:
            print("\nNothing deleted. Run with --yes to delete all of the above.")
            return
        ok = db.execute_transaction([(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY", None)])
        if not ok:
            sys.exit("Reset failed - nothing was changed")
        left = sum(counts().values())
        print(f"\nDone - all test data deleted ({left} rows left in these tables).")
    finally:
        db.close()


if __name__ == '__main__':
    main()
