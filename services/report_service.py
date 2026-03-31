from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _safe_text(value, fallback='-'):
    if value is None or value == '':
        return fallback
    return str(value)


def _money(value):
    if value is None:
        return 'HK$ 0'
    return f'HK$ {value:,.0f}'


def _percent(value):
    if value is None:
        return '-'
    return f'{value}%'


def _date(value):
    if not value:
        return '-'
    if hasattr(value, 'strftime'):
        return value.strftime('%Y-%m-%d')
    return str(value)


def _section_heading(text, styles):
    return Paragraph(text, styles['Heading2'])


def _styled_table(rows, col_widths, header_background='#e2e8f0', body_background=None):
    table = Table(rows, colWidths=col_widths)
    commands = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(header_background)),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]
    if body_background:
        commands.append(('BACKGROUND', (0, 1), (-1, -1), colors.HexColor(body_background)))
    table.setStyle(TableStyle(commands))
    return table


def build_credit_report_pdf(company, report):
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f'DecoFinance Credit Report - {company.company_name}',
        author='DecoFinance',
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='SmallMuted', parent=styles['BodyText'], fontSize=9, textColor=colors.HexColor('#475569')))
    styles.add(ParagraphStyle(name='MetricValue', parent=styles['BodyText'], fontSize=14, leading=18, textColor=colors.HexColor('#0f172a')))
    styles.add(ParagraphStyle(name='CoverLead', parent=styles['BodyText'], fontSize=10, leading=14, textColor=colors.white))

    story = []
    cover_summary = report.get('summary', {})
    cover_rows = [
        [Paragraph('<b>DecoFinance Bureau-Style Credit Report</b>', styles['Heading2']), '', ''],
        [Paragraph(_safe_text(company.company_name), styles['Heading1']), '', ''],
        [Paragraph('Designed for renovation underwriting, verification screening, and project-backed portfolio monitoring.', styles['CoverLead']), '', ''],
        [
            Paragraph(f"<b>Report ID</b><br/>{_safe_text(report.get('report_id'))}", styles['BodyText']),
            Paragraph(f"<b>Generated</b><br/>{_date(report.get('generated_at'))}", styles['BodyText']),
            Paragraph(f"<b>Model</b><br/>{_safe_text(cover_summary.get('model_version'))}", styles['BodyText']),
        ],
    ]
    cover_table = Table(cover_rows, colWidths=[66 * mm, 56 * mm, 48 * mm])
    cover_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('SPAN', (0, 0), (-1, 0)),
        ('SPAN', (0, 1), (-1, 1)),
        ('SPAN', (0, 2), (-1, 2)),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#0f172a')),
        ('INNERGRID', (0, 3), (-1, 3), 0.5, colors.HexColor('#334155')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 10))

    summary = report.get('summary', {})
    summary_table = Table([
        ['Score', 'Grade', 'Risk Level', 'Recommended Limit', 'Expected Pricing'],
        [
            _safe_text(summary.get('score'), 'N/A'),
            _safe_text(summary.get('grade'), 'Unrated'),
            _safe_text(summary.get('risk_level'), 'unrated').replace('_', ' ').title(),
            _money(summary.get('recommended_loan_limit')),
            f"{summary.get('recommended_interest_rate')}%" if summary.get('recommended_interest_rate') is not None else '-',
        ],
    ], colWidths=[30 * mm, 24 * mm, 32 * mm, 46 * mm, 34 * mm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#eff6ff')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    story.append(_section_heading('Subject Identification', styles))
    subject = report.get('subject', {})
    subject_table = _styled_table([
        ['Business registration', _safe_text(subject.get('business_registration'))],
        ['English name', _safe_text(subject.get('company_name_en'))],
        ['Contact', _safe_text(subject.get('contact_person'))],
        ['Role', _safe_text(subject.get('contact_position'))],
        ['Years in business', _safe_text(subject.get('years_in_business'))],
        ['Main service', _safe_text(subject.get('main_service_type'))],
    ], col_widths=[48 * mm, 122 * mm], body_background='#ffffff')
    subject_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8fafc')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ]))
    story.append(subject_table)
    story.append(Spacer(1, 10))

    story.append(_section_heading('Score Factor Breakdown', styles))
    score_components = report.get('score_components', [])
    if score_components:
        component_rows = [['Factor', 'Score', 'Max']] + [
            [item['label'], _safe_text(item['score']), _safe_text(item['max_score'])]
            for item in score_components
        ]
        component_table = _styled_table(component_rows, [95 * mm, 35 * mm, 30 * mm])
        story.append(component_table)
    else:
        story.append(Paragraph('No score breakdown is available until a score is calculated.', styles['BodyText']))
    story.append(Spacer(1, 10))

    story.append(_section_heading('Verification And Compliance', styles))
    verification_rows = [['Check', 'Status', 'Value']]
    for item in report.get('verification_checks', []):
        verification_rows.append([
            _safe_text(item.get('label')),
            _safe_text(item.get('status')).replace('_', ' ').title(),
            _safe_text(item.get('value')).replace('_', ' ').title(),
        ])
    verification_table = _styled_table(verification_rows, [70 * mm, 35 * mm, 55 * mm])
    story.append(verification_table)
    story.append(Spacer(1, 10))

    story.append(_section_heading('OSH And ESG Signals', styles))
    osh_profile = report.get('osh_profile', {})
    esg_profile = report.get('esg_profile', {})
    osh_table = _styled_table([
        ['Signal', 'Value'],
        ['Safety training coverage', f"{osh_profile.get('training_coverage')}%" if osh_profile.get('training_coverage') is not None else '-'],
        ['Safety incidents (12 months)', _safe_text(osh_profile.get('incident_count'), '0')],
        ['ESG policy level', _safe_text(esg_profile.get('policy_level'), 'none').replace('_', ' ').title()],
        ['Green material adoption', f"{esg_profile.get('green_material_ratio')}%" if esg_profile.get('green_material_ratio') is not None else '-'],
        ['ISO certified', 'Yes' if esg_profile.get('iso_certified') else 'No'],
    ], [72 * mm, 98 * mm])
    story.append(osh_table)
    story.append(Spacer(1, 10))

    story.append(_section_heading('Credit Exposure And Project Behaviour', styles))
    exposure = report.get('exposure', {})
    behaviour = report.get('project_behaviour', {})
    exposure_table = Table([
        ['Metric', 'Value', 'Metric', 'Value'],
        ['Applications', _safe_text(exposure.get('loan_application_count')), 'Approved applications', _safe_text(exposure.get('approved_application_count'))],
        ['Approval rate', _percent(exposure.get('approval_rate')), 'Requested amount', _money(exposure.get('total_requested_amount'))],
        ['Approved amount', _money(exposure.get('total_approved_amount')), 'Outstanding balance', _money(exposure.get('outstanding_balance'))],
        ['Overdue accounts', _safe_text(exposure.get('overdue_accounts')), 'Total bids', _safe_text(behaviour.get('bid_count'))],
        ['Accepted bids', _safe_text(behaviour.get('accepted_bid_count')), 'Bid success', _percent(behaviour.get('bid_success_rate'))],
        ['Open disputes', _safe_text(behaviour.get('open_dispute_count')), 'Resolved disputes', _safe_text(behaviour.get('resolved_dispute_count'))],
    ], colWidths=[42 * mm, 38 * mm, 42 * mm, 38 * mm])
    exposure_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f8fafc')),
        ('BACKGROUND', (2, 1), (2, -1), colors.HexColor('#f8fafc')),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(exposure_table)
    story.append(Spacer(1, 10))

    story.append(_section_heading('Real-Time Risk Alerts', styles))
    risk_factors = report.get('risk_factors', []) or ['No active risk alerts.']
    for factor in risk_factors:
        story.append(Paragraph(f'• {_safe_text(factor)}', styles['BodyText']))
    story.append(Spacer(1, 10))

    story.append(_section_heading('Recent Monitoring Activity', styles))
    activity_rows = [['Type', 'Date', 'Detail']]
    for item in report.get('recent_monitoring_activity', [])[:8]:
        activity_rows.append([
            _safe_text(item.get('type')),
            _date(item.get('date')),
            _safe_text(item.get('detail')),
        ])
    activity_table = _styled_table(activity_rows, [38 * mm, 28 * mm, 106 * mm])
    story.append(activity_table)
    story.append(Spacer(1, 10))

    story.append(_section_heading('Audit Snapshot', styles))
    audit_snapshot = report.get('audit_snapshot', {})
    audit_rows = [['Checkpoint', 'Date', 'Actor']]
    for label, key in [
        ('Last score refresh', 'last_score_refresh'),
        ('Last verification update', 'last_verification_update'),
        ('Last loan decision', 'last_loan_decision'),
        ('Last dispute action', 'last_dispute_action'),
    ]:
        entry = audit_snapshot.get(key)
        audit_rows.append([
            label,
            _date(entry.get('created_at') if entry else None),
            _safe_text(entry.get('actor') if entry else None),
        ])
    audit_table = _styled_table(audit_rows, [68 * mm, 42 * mm, 56 * mm])
    story.append(audit_table)
    story.append(Spacer(1, 10))

    story.append(_section_heading('Underwriting Note', styles))
    story.append(Paragraph(_safe_text(report.get('disclaimer')), styles['BodyText']))
    story.append(Spacer(1, 6))
    story.append(Paragraph('Suggested use: screening, internal loan review, company onboarding, and dispute-risk monitoring. Human review remains required before any credit decision.', styles['SmallMuted']))

    document.build(story)
    return buffer.getvalue()