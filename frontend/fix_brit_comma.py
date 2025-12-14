import json

# Read the manifest file
with open('src/data/brit.manifest.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update all templates to add comma between venue and city
for template in data['templates']:
    for field in template['frontFields']:
        if field.get('key') == 'venue':
            field['suffix'] = ','

# Write the updated manifest
with open('src/data/brit.manifest.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Added comma between venue and city successfully!")
