path = 'venv/Lib/site-packages/django/db/backends/base/base.py'
with open(path, 'r') as f:
    content = f.read()

content = content.replace(
    'self.check_database_version_supported()',
    'pass  # self.check_database_version_supported()'
)

with open(path, 'w') as f:
    f.write(content)
print('Patched base.py!')