from database import Base
import models.call_log # ensure it is imported
import models.user
import models.couple

print("Registered tables in Base.metadata:")
for table_name in Base.metadata.tables.keys():
    print(table_name)
