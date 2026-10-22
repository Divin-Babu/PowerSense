import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.getcwd())
from database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
for table_name in sorted(inspector.get_table_names()):
    print(f"\n=== TABLE: {table_name} ===")
    cols = inspector.get_columns(table_name)
    for col in cols:
        print(f"  {col['name']}: {col['type']} (nullable={col['nullable']}, default={col['default']})")
    fks = inspector.get_foreign_keys(table_name)
    for fk in fks:
        print(f"  FK: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
    pks = inspector.get_pk_constraint(table_name)
    print(f"  PK: {pks['constrained_columns']}")
