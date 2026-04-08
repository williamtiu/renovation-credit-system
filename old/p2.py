import re

with open('templates/loans/detail.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace the entire "Approval Result" block with the improved "Application Result" block
pattern_approval = re.compile(
    r'\s*{% if application\.application_status != \'pending\' %}\s*<!-- Approval Result -->.*?</div>\s*</div>\s*{% endif %}', 
    re.DOTALL
)

replacement_app_result = '''
            {% if application.application_status != 'pending' %}
            <!-- Application Result -->
            <div class="card mb-4">
                <div class="card-header bg-dark text-white">
                    <h5 class="mb-0"><i class="fas fa-check-circle"></i> Application Result</h5>
                </div>
                <div class="card-body">
                    <p><strong>Financial Institution Name: </strong>{{ application.bank_name or '-' }}</p>
                    <p><strong>Status: </strong>
                        {% if application.application_status == 'approved' %}
                            <span class="badge bg-success">Accepted</span>
                        {% elif application.application_status == 'rejected' %}
                            <span class="badge bg-danger">Rejected</span>
                        {% else %}
                            <span class="badge bg-secondary">{{ application.application_status | capitalize }}</span>
                        {% endif %}
                    </p>
                    <p><strong>Approval Date: </strong>{{ application.approval_date.strftime('%Y-%m-%d %H:%M') if application.approval_date else '-' }}</p>
                    {% if application.application_status == 'approved' %}
                        <p><strong>Approved Amount: </strong>HK$ {{ "{:,.2f}".format(application.approved_amount or 0) }}</p>
                        <p><strong>Approved Interest Rate: </strong>{{ application.approved_interest_rate }}%</p>
                        <p><strong>Additional Conditions: </strong>{{ application.approval_conditions or 'None' }}</p>
                        <p><strong>Reviewed By User ID:</strong> {{ application.reviewed_by_user_id or '-' }}</p>
                    {% elif application.application_status == 'rejected' %}
                        <p><strong>Rejection Reason: </strong>{{ application.rejection_reason or 'None' }}</p>
                    {% endif %}
                </div>
            </div>
            {% endif %}'''

html = pattern_approval.sub(replacement_app_result, html, count=1)

# 2. Find and replace the Status Details / Disbursement block
pattern_status = re.compile(
    r'\s*{% if application\.application_status == \'approved\' %}\s*<!-- Status Details -->.*?</div>\s*</div>',
    re.DOTALL
)

html = pattern_status.sub('', html, count=1)

with open('templates/loans/detail.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Done!')
