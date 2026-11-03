from sqlalchemy import insert
from models.call_log import CallLog
from database import engine
from sqlalchemy import create_mock_engine

def dump(sql, *multiparams, **params):
    print(sql.compile(dialect=engine.dialect))

mock_engine = create_mock_engine(engine.url, dump)
stmt = insert(CallLog).values(id="test")
print("Target table name: ", CallLog.__table__.name)
print("Generated SQL:")
print(stmt.compile(engine.dialect))
