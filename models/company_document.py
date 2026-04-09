"""
Company Document Model - Manages uploaded documents for companies
"""

from models.database import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class CompanyDocument(db.Model):
    """Company document record"""
    
    __tablename__ = 'company_documents'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    
    # Document type enumeration
    DOCUMENT_TYPES = [
        'business_registration',
        'licence_certificate',
        'insurance_certificate',
        'audited_financials',
        'tax_returns',
        'osh_license',
        'project_photos',
        'invoices',
        'other'
    ]
    
    document_type = db.Column(db.String(50), nullable=False)
    
    # File information
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)  # in bytes
    mime_type = db.Column(db.String(100))
    
    # Upload metadata
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    
    # Verification status
    verified = db.Column(db.Boolean, default=False)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    verified_at = db.Column(db.DateTime)
    verification_notes = db.Column(db.Text)
    
    # Document status
    STATUS_PENDING = 'pending'
    STATUS_VERIFIED = 'verified'
    STATUS_REJECTED = 'rejected'
    STATUS_EXPIRED = 'expired'
    
    status = db.Column(db.String(20), default=STATUS_PENDING, nullable=False)
    rejection_reason = db.Column(db.Text)
    
    # Optional fields
    expiry_date = db.Column(db.Date)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    company = db.relationship('Company', backref=db.backref('documents', lazy='dynamic'))
    uploader = db.relationship('User', foreign_keys=[uploaded_by])
    verifier = db.relationship('User', foreign_keys=[verified_by])
    
    def __repr__(self):
        return f'<CompanyDocument {self.id}: {self.file_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'document_type': self.document_type,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'uploaded_by': self.uploaded_by,
            'uploader_name': self.uploader.username if self.uploader else None,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'verified': self.verified,
            'verified_by': self.verified_by,
            'verifier_name': self.verifier.username if self.verifier else None,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'verification_notes': self.verification_notes,
            'status': self.status,
            'rejection_reason': self.rejection_reason,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }