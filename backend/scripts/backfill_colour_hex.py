"""One-off: fill color.hex_code for existing colours that don't have one,
using the same name matching as new colours (colour_hex.guess_hex).

Colours that already have a hex_code are never touched. Names that can't be
matched are listed and left as-is - they'll get a colour picked by the user
the next time a variant is saved with them.

Run from the backend/ folder:
    python scripts/backfill_colour_hex.py           # preview only
    python scripts/backfill_colour_hex.py --apply   # write the changes
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from colour_hex import guess_hex  # noqa: E402
from database import db  # noqa: E402


def main():
    apply = '--apply' in sys.argv
    if not db.connect():
        sys.exit("Could not connect to the database - check backend/.env")
    try:
        rows = db.execute_query(
            "SELECT color_id, color_name FROM color WHERE hex_code IS NULL OR hex_code = '' ORDER BY color_id"
        ) or []
        updates, unmatched = [], []
        for r in rows:
            hex_code = guess_hex(r['color_name'])
            (updates if hex_code else unmatched).append((r, hex_code))

        for r, hex_code in updates:
            print(f"  {r['color_id']:>5}  {r['color_name']:<25} -> {hex_code}")
        for r, _ in unmatched:
            print(f"  {r['color_id']:>5}  {r['color_name']:<25} -> (no match, left empty)")

        if apply and updates:
            queries = [
                ("UPDATE color SET hex_code = %s, updated_date = NOW() WHERE color_id = %s", (h, r['color_id']))
                for r, h in updates
            ]
            if not db.execute_transaction(queries):
                sys.exit("Update failed - nothing was changed")
            print(f"\nUpdated {len(updates)} colour(s).")
        else:
            print(f"\n{len(updates)} colour(s) would be updated. Run with --apply to save.")
    finally:
        db.close()


if __name__ == '__main__':
    main()
