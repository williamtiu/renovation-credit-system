import os
import re

for root, dirs, files in os.walk('tests'):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            content = content.replace('name=', 'company_name=')
            content = content.replace('registration_number=', 'business_registration=')
            content = re.sub(r'heavy_lifting_compliance=[^,)]+,?', '', content)
            content = re.sub(r'district=[^,)]+,?', '', content)
            content = re.sub(r'existing_loans=[^,)]+,?', '', content)
            content = re.sub(r'has_license=[^,)]+,?', '', content)
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
print("Done")