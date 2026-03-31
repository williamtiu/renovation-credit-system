"""
"""

from decimal import Decimal, InvalidOperation
from typing import Optional, Tuple

def validate_positive_number(value, field_name: str = " Text ") -> Tuple[bool, Optional[float], str]:
    """Documnetation translated"""
    try:
        num = float(value)
        if num < 0:
            return False, None, f"{field_name} Text "
        if num > 1e15:
            return False, None, f"{field_name} Text "
        return True, num, ""
    except (ValueError, TypeError):
        return False, None, f"{field_name} Text "

def validate_percentage(value, field_name: str = " Text ") -> Tuple[bool, Optional[float], str]:
    """Documnetation translated"""
    valid, num, error = validate_positive_number(value, field_name)
    if not valid:
        return valid, None, error
    if num > 100:
        return False, None, f"{field_name} Text  100%"
    return True, num, ""

def validate_phone(phone: str) -> Tuple[bool, str]:
    """Documnetation translated"""
    import re
    pattern = r'^[2-9]\d{7}$'
    if re.match(pattern, phone.replace(' ', '').replace('-', '')):
        return True, phone
    return False, " Text （ Text  8  Text ）"

def validate_email(email: str) -> Tuple[bool, str]:
    """Documnetation translated"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if re.match(pattern, email):
        return True, email.lower()
    return False, " Text "

def validate_business_registration(br: str) -> Tuple[bool, str]:
    """Documnetation translated"""
    import re
    pattern = r'^\d{8}$'
    if re.match(pattern, br.replace('-', '')):
        return True, br.replace('-', '')
    return False, "Business Registration Text （ Text  8  Text ）"
