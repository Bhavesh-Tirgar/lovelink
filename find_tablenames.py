import os
import ast

def get_tablenames(root):
    tablenames = {}
    for dirpath, _, filenames in os.walk(root):
        for f in filenames:
            if f.endswith('.py'):
                path = os.path.join(dirpath, f)
                with open(path, 'r', encoding='utf-8') as fs:
                    try:
                        node = ast.parse(fs.read())
                        for n in ast.walk(node):
                            if isinstance(n, ast.Assign):
                                for target in n.targets:
                                    if isinstance(target, ast.Name) and target.id == '__tablename__':
                                        if isinstance(n.value, ast.Constant):
                                            tablenames[path] = n.value.value
                    except:
                        continue
    return tablenames

if __name__ == "__main__":
    t = get_tablenames('lovelink-backend')
    for p, n in t.items():
        print(f"{p}: {n}")
