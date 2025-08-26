#!/usr/bin/env python3
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[1] / 'prisma' / 'migrations'
bad = re.compile(r'\b(DROP\s+TABLE|DROP\s+COLUMN|ALTER\s+TABLE\s+\S+\s+DROP\s+)', re.I)
problems = []
for sql in root.rglob('migration.sql'):
    txt = sql.read_text(errors='ignore')
    hits = bad.findall(txt)
    if hits:
        problems.append((sql, hits))
if problems:
    print('Potentially destructive migration(s) detected:')
    for path, hits in problems:
        print(f' - {path}: {hits}')
    print('\nSet DANGEROUS_MIGRATIONS_ALLOWED=true to bypass (not recommended).')
    if os.getenv('DANGEROUS_MIGRATIONS_ALLOWED') != 'true':
        sys.exit(1)
print('Migration check OK')
