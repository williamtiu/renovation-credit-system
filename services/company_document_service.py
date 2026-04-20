"""
Document Service - Handles company document upload, verification, and management
"""

import os
import uuid
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
from flask import current_app

from models.company_document import CompanyDocument
from models.database import db
from services.audit_service import log_action


ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_mime_type(filename):
    """Get MIME type based on file extension"""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    mime_types = {
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    return mime_types.get(ext, 'application/octet-stream')


def generate_unique_filename(original_filename):
    """Generate a unique filename while preserving the extension"""
    ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    return unique_name


def get_upload_path(company_id, document_type, filename):
    """Get the full upload path for a document"""
    base_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    relative_path = os.path.join('companies', str(company_id), document_type)
    full_dir = os.path.join(base_folder, relative_path)
    
    os.makedirs(full_dir, exist_ok=True)
    
    return os.path.join(full_dir, filename), relative_path


def validate_file(file, max_size=None):
    """
    Validate uploaded file
    Returns: (is_valid, error_message)
    """
    if not file or not file.filename:
        return False, 'No file selected'
    
    if not allowed_file(file.filename):
        return False, f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
    
    file_size = len(file.read())
    file.seek(0)  # Reset file pointer
    
    max_size = max_size or MAX_FILE_SIZE
    if file_size > max_size:
        return False, f'File too large. Max size: {max_size // (1024*1024)}MB'
    
    return True, None


def upload_company_document(company_id, file, document_type, uploaded_by, 
                           description=None, expiry_date=None):
    """
    Upload a company document
    
    Args:
        company_id: Company ID
        file: Uploaded file object
        document_type: Type of document
        uploaded_by: User ID who uploaded
        description: Optional description
        expiry_date: Optional expiry date
    
    Returns:
        CompanyDocument object or None
    """
    try:
        is_valid, error_msg = validate_file(file)
        if not is_valid:
            raise ValueError(error_msg)
        
        if document_type not in CompanyDocument.DOCUMENT_TYPES:
            raise ValueError(f'Invalid document type: {document_type}')
        
        original_filename = secure_filename(file.filename)
        unique_filename = generate_unique_filename(original_filename)
        file_path, relative_path = get_upload_path(company_id, document_type, unique_filename)
        
        print(f"\n📤 DEBUG - 文件上传信息:")
        print(f"   公司ID: {company_id}")
        print(f"   文档类型: {document_type}")
        print(f"   原始文件名: {original_filename}")
        print(f"   唯一文件名: {unique_filename}")
        print(f"   相对路径: {relative_path}")
        print(f"   完整文件路径: {file_path}")
        print(f"   基础上传文件夹: {current_app.config.get('UPLOAD_FOLDER')}")
        
        file.save(file_path)
        
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            print(f"   ✅ 文件已成功保存")
            print(f"   文件大小: {file_size} bytes")
        else:
            print(f"   ❌ 错误: 文件保存失败！")
            raise Exception(f"File was not saved to {file_path}")
        
        mime_type = get_mime_type(original_filename)
        
        doc = CompanyDocument(
            company_id=company_id,
            document_type=document_type,
            file_name=original_filename,
            file_path=os.path.join(relative_path, unique_filename),
            file_size=file_size,
            mime_type=mime_type,
            uploaded_by=uploaded_by,
            description=description,
            expiry_date=expiry_date,
            status=CompanyDocument.STATUS_PENDING
        )
        
        db.session.add(doc)
        db.session.flush()
        
        log_action(
            'document_uploaded',
            'CompanyDocument',
            doc.id,
            {
                'company_id': company_id,
                'document_type': document_type,
                'file_name': original_filename,
                'uploaded_by': uploaded_by
            }
        )
        
        db.session.commit()
        return doc
        
    except Exception as e:
        db.session.rollback()
        raise e


def upload_multiple_documents(company_id, files_data, uploaded_by):
    """
    Upload multiple documents at once
    
    Args:
        company_id: Company ID
        files_data: List of dicts with keys: file, document_type, description, expiry_date
        uploaded_by: User ID who uploaded
    
    Returns:
        Tuple of (successful_docs, failed_uploads)
    """
    successful = []
    failed = []
    
    for data in files_data:
        try:
            doc = upload_company_document(
                company_id=company_id,
                file=data['file'],
                document_type=data['document_type'],
                uploaded_by=uploaded_by,
                description=data.get('description'),
                expiry_date=data.get('expiry_date')
            )
            successful.append(doc)
        except Exception as e:
            failed.append({
                'file_name': data['file'].filename if data['file'] else 'unknown',
                'error': str(e)
            })
    
    return successful, failed


def get_company_documents(company_id, document_type=None, status=None, active_only=True):
    """
    Get documents for a company with optional filters
    
    Args:
        company_id: Company ID
        document_type: Filter by document type (optional)
        status: Filter by status (optional)
        active_only: Only return active documents
    
    Returns:
        List of CompanyDocument objects
    """
    query = CompanyDocument.query.filter_by(company_id=company_id)
    
    if active_only:
        query = query.filter_by(is_active=True)
    
    if document_type:
        query = query.filter_by(document_type=document_type)
    
    if status:
        query = query.filter_by(status=status)
    
    return query.order_by(CompanyDocument.uploaded_at.desc()).all()


def get_document_by_id(document_id):
    """
    Get a single document by ID
    
    Args:
        document_id: Document ID
    
    Returns:
        CompanyDocument object or None
    """
    return CompanyDocument.query.get(document_id)


def verify_document(document_id, verified_by, notes=None):
    """
    Verify a document
    
    Args:
        document_id: Document ID
        verified_by: User ID who verified
        notes: Optional verification notes
    
    Returns:
        Updated CompanyDocument object or None
    """
    try:
        doc = get_document_by_id(document_id)
        if not doc:
            return None
        
        doc.verified = True
        doc.verified_by = verified_by
        doc.verified_at = datetime.now(timezone.utc)
        doc.verification_notes = notes
        doc.status = CompanyDocument.STATUS_VERIFIED
        
        db.session.commit()
        
        log_action(
            'document_verified',
            'CompanyDocument',
            document_id,
            {
                'verified_by': verified_by,
                'notes': notes
            }
        )
        
        return doc
        
    except Exception as e:
        db.session.rollback()
        raise e


def reject_document(document_id, rejected_by, reason):
    """
    Reject a document
    
    Args:
        document_id: Document ID
        rejected_by: User ID who rejected
        reason: Rejection reason (required)
    
    Returns:
        Updated CompanyDocument object or None
    """
    if not reason:
        raise ValueError('Rejection reason is required')
    
    try:
        doc = get_document_by_id(document_id)
        if not doc:
            return None
        
        doc.verified = False
        doc.status = CompanyDocument.STATUS_REJECTED
        doc.rejection_reason = reason
        
        db.session.commit()
        
        log_action(
            'document_rejected',
            'CompanyDocument',
            document_id,
            {
                'rejected_by': rejected_by,
                'reason': reason
            }
        )
        
        return doc
        
    except Exception as e:
        db.session.rollback()
        raise e


def delete_document(document_id, deleted_by):
    """
    Soft delete a document (set is_active=False)
    
    Args:
        document_id: Document ID
        deleted_by: User ID who deleted
    
    Returns:
        True if successful, False otherwise
    """
    try:
        doc = get_document_by_id(document_id)
        if not doc:
            return False
        
        doc.is_active = False
        
        db.session.commit()
        
        log_action(
            'document_deleted',
            'CompanyDocument',
            document_id,
            {'deleted_by': deleted_by}
        )
        
        return True
        
    except Exception as e:
        db.session.rollback()
        raise e


def get_document_file_path(document_id):
    """
    Get the absolute file path for a document
    
    Args:
        document_id: Document ID
    
    Returns:
        Absolute file path string or None
    """
    doc = get_document_by_id(document_id)
    if not doc:
        return None
    
    base_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    return os.path.join(base_folder, doc.file_path)