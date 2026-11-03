import inspect
from crud.call import create_call
from models.call_log import CallLog

print("--- create_call source ---")
print(inspect.getsource(create_call))
print("--- CallLog metadata ---")
print(f"Name: {CallLog.__name__}")
print(f"Tablename: {CallLog.__tablename__}")
print(f"File: {inspect.getfile(CallLog)}")
