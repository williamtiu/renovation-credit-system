"""
Template helper utilities for multi-language support
"""
import os
from flask import current_app, render_template, session


def render_template_with_lang_fallback(template_name, **context):
    """
    Render template with language support.
    For Chinese language, try zh/ template first, fallback to English if not found.
    """
    lang = session.get('language', 'en')
    
    if lang == 'ch':
        # For Chinese, check if zh template exists
        zh_template = f'zh/{template_name}' if not template_name.startswith('zh/') else template_name
        template_path = os.path.join(current_app.root_path, 'templates', zh_template)
        
        if os.path.exists(template_path):
            return render_template(zh_template, **context)
        else:
            # Fallback to English template
            en_template = template_name.replace('zh/', '')
            return render_template(en_template, **context)
    
    return render_template(template_name, **context)
