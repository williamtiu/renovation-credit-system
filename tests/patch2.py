import os

file_path = r'd:\WilliamDoc\HKBU\Year 1 sem 2\COMP7300 Financial Technology\project\renovation-credit-system-update-1(3)\renovation-credit-system-update-1\templates\loans\detail.html'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if '<!-- Approval Result -->' in line:
        new_lines.append('            <!-- Application Result -->\n')
        continue
    if '<h5 class="mb-0"><i class="fas fa-check-circle"></i> Approval Result</h5>' in line:
        new_lines.append('                    <h5 class="mb-0"><i class="fas fa-check-circle"></i> Application Result</h5>\n')
        continue
    if '<p><strong>Approval Date: </strong>{{ application.approval_date' in line and 'Financial Institution Name' not in ''.join(new_lines[-3:]):
        new_lines.append('                    <p><strong>Financial Institution Name: </strong>{{ application.bank_name or \'-\' }}</p>\n')
        new_lines.append('                    <p><strong>Status: </strong>\n')
        new_lines.append('                        {% if application.application_status == \'approved\' %}\n')
        new_lines.append('                            <span class="badge bg-success">Accepted</span>\n')
        new_lines.append('                        {% elif application.application_status == \'rejected\' %}\n')
        new_lines.append('                            <span class="badge bg-danger">Rejected</span>\n')
        new_lines.append('                        {% else %}\n')
        new_lines.append('                            <span class="badge bg-secondary">{{ application.application_status | capitalize }}</span>\n')
        new_lines.append('                        {% endif %}\n')
        new_lines.append('                    </p>\n')
        new_lines.append(line)
        continue
    
    if '<!-- Status Details -->' in line:
        skip = True
    
    if skip and '</div>' in line:
        if len([l for l in lines[lines.index(line):lines.index(line)+3] if '</div>' in l]) >= 2:
            # We skip until the end of the Status Details block
            pass
            
    if skip:
        if '{% endif %}' in line and '<!-- Status Details -->' not in ''.join(lines[lines.index(line)-20:lines.index(line)]):
            skip = False
            continue
        continue

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Done logic edit")
