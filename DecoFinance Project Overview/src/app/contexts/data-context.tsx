import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProjectStatus = 'open' | 'bidding' | 'awaiting_signatures' | 'active' | 'disputed' | 'completed' | 'cancelled';
export type MilestoneStatus = 'planned' | 'in_progress' | 'submitted' | 'approved' | 'disputed';
export type LoanStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'repaid';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';
export type ContractState = 'draft' | 'pending_signatures' | 'active' | 'pending_review' | 'frozen' | 'completed' | 'terminated';
export type BidStatus = 'pending' | 'accepted' | 'rejected';

export interface CompanyReview {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number; // 1-5
  comment: string;
  projectId?: string;
  projectTitle?: string;
  createdAt: string;
  companyReply?: string;
  categories?: {
    professionalism: number;
    quality: number;
    timeliness: number;
    communication: number;
  };
}

export interface Company {
  id: string;
  name: string;
  registrationNo: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  established: string;
  employees: number;
  avatar?: string;
  coverPhoto?: string;
  specialties?: string[];
  serviceArea?: string;
  projectsCompleted?: number;
  whatsapp?: string;
  // Licence & Compliance
  licenceNo: string;
  licenceExpiry: string;
  licenceStatus: 'valid' | 'expired' | 'pending';
  insuranceProvider: string;
  insuranceAmount: number;
  insuranceExpiry: string;
  // OSH
  oshCertified: boolean;
  oshCertExpiry: string;
  incidentRate: number;
  // ESG
  esgRating: string;
  carbonFootprint: number;
  sustainablePractices: string[];
  // Trust Score
  creditScore: number;
  trustGrade: string;
  trustLevel: string;
  lastScoreUpdate: string;
  scoreFactors: ScoreFactor[];
  scoreHistory: ScoreHistory[];
  // Reviews
  reviews: CompanyReview[];
  averageRating: number;
  reviewCount: number;
}

export interface ScoreFactor {
  name: string;
  score: number;
  maxScore: number;
  status: 'good' | 'fair' | 'poor';
  description: string;
}

export interface ScoreHistory {
  date: string;
  score: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  customerId: string;
  customerName: string;
  location: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  contractorId?: string;
  contractorName?: string;
  createdAt: string;
  // Direct hire
  isDirectHire?: boolean;
  directHireCompanyId?: string;
  directHireCompanyName?: string;
  directHireStatus?: 'pending' | 'accepted' | 'rejected';
  bids: Bid[];
  milestones: Milestone[];
  disputes: Dispute[];
  contractId?: string;
  reviewed?: boolean; // whether customer has reviewed this project's company
}

export interface Bid {
  id: string;
  projectId: string;
  companyId: string;
  companyName: string;
  amount: number;
  timeline: string;
  proposal: string;
  status: BidStatus;
  submittedAt: string;
  trustGrade: string;
  creditScore: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: MilestoneStatus;
  evidence?: string;
  submittedAt?: string;
  approvedAt?: string;
  escrowState: 'planned' | 'locked' | 'pending' | 'released' | 'frozen';
  isContractSigning?: boolean;
}

export interface Dispute {
  id: string;
  projectId: string;
  projectTitle: string;
  milestoneId?: string;
  milestoneTitle?: string;
  raisedBy: string;
  raisedByRole: string;
  description: string;
  status: DisputeStatus;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
  reviewerId?: string;
}

export interface LoanApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  companyId?: string;
  companyName?: string;
  projectId?: string;
  projectTitle?: string;
  amount: number;
  purpose: string;
  term: number; // months
  status: LoanStatus;
  trustGrade?: string;
  creditScore?: number;
  interestRate?: number;
  disbursedAmount?: number;
  repaidAmount?: number;
  reviewerId?: string;
  reviewerNote?: string;
  createdAt: string;
  reviewedAt?: string;
  disbursedAt?: string;
}

export interface SmartContract {
  id: string;
  projectId: string;
  projectTitle: string;
  contractorId: string;
  contractorName: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  lockedAmount: number;
  releasedAmount: number;
  state: ContractState;
  customerSigned?: boolean;
  contractorSigned?: boolean;
  customerSignedAt?: string;
  contractorSignedAt?: string;
  activatedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

// ─── Mock Reviews ─────────────────────────────────────────────────────────────

const mockReviewsC1: CompanyReview[] = [
  {
    id: 'r1',
    companyId: 'c1',
    customerId: 'u2',
    customerName: 'Sarah Chen',
    rating: 5,
    comment: 'Professional, reliable, and excellent quality work. The renovation turned out great and the process was smooth. Highly recommend BuildPro.',
    projectId: 'p2',
    projectTitle: 'Residential Apartment - Building A',
    createdAt: '2026-03-01',
    companyReply: 'Thank you Sarah! We appreciate your kind words and look forward to working with you again.',
    categories: { professionalism: 5, quality: 5, timeliness: 4, communication: 5 },
  },
  {
    id: 'r2',
    companyId: 'c1',
    customerId: 'cu3',
    customerName: 'Michael Torres',
    rating: 4,
    comment: 'Great work overall. The team was professional and the quality was excellent. Minor delays but they communicated well throughout.',
    projectId: 'px1',
    projectTitle: 'Office Suite Renovation',
    createdAt: '2026-01-15',
    companyReply: 'Thank you Michael! We apologize for the small delays and appreciate your understanding.',
    categories: { professionalism: 5, quality: 4, timeliness: 3, communication: 4 },
  },
  {
    id: 'r3',
    companyId: 'c1',
    customerId: 'cu4',
    customerName: 'Jennifer Park',
    rating: 5,
    comment: 'Absolutely fantastic experience! BuildPro transformed our old kitchen into a modern masterpiece. Every detail was perfect.',
    createdAt: '2025-11-20',
    categories: { professionalism: 5, quality: 5, timeliness: 5, communication: 5 },
  },
  {
    id: 'r4',
    companyId: 'c1',
    customerId: 'cu5',
    customerName: 'Robert Kim',
    rating: 4,
    comment: 'Very satisfied with the bathroom renovation. Clean work, good communication. Would hire again.',
    createdAt: '2025-09-10',
    categories: { professionalism: 4, quality: 5, timeliness: 4, communication: 4 },
  },
];

const mockReviewsC2: CompanyReview[] = [
  {
    id: 'r5',
    companyId: 'c2',
    customerId: 'cu6',
    customerName: 'Amanda Foster',
    rating: 5,
    comment: 'EliteReno is truly elite! Exceptional craftsmanship and attention to detail. Our hotel lobby looks stunning.',
    projectId: 'p3',
    projectTitle: 'Hotel Lobby Redesign',
    createdAt: '2026-02-20',
    companyReply: 'Thank you Amanda! We take great pride in our work and are thrilled with the result.',
    categories: { professionalism: 5, quality: 5, timeliness: 5, communication: 5 },
  },
  {
    id: 'r6',
    companyId: 'c2',
    customerId: 'cu7',
    customerName: 'David Lee',
    rating: 5,
    comment: 'Outstanding service from start to finish. The team was punctual, professional, and delivered exactly what was promised.',
    createdAt: '2025-12-05',
    categories: { professionalism: 5, quality: 5, timeliness: 5, communication: 5 },
  },
  {
    id: 'r7',
    companyId: 'c2',
    customerId: 'cu8',
    customerName: 'Lisa Zhang',
    rating: 5,
    comment: 'Best renovation company we\'ve ever worked with. Premium quality materials and superb execution.',
    createdAt: '2025-10-18',
    categories: { professionalism: 5, quality: 5, timeliness: 4, communication: 5 },
  },
];

const mockReviewsC3: CompanyReview[] = [
  {
    id: 'r8',
    companyId: 'c3',
    customerId: 'cu9',
    customerName: 'Thomas Nguyen',
    rating: 4,
    comment: 'Good quality work at a reasonable price. The team was friendly and efficient.',
    createdAt: '2026-02-10',
    categories: { professionalism: 4, quality: 4, timeliness: 4, communication: 3 },
  },
  {
    id: 'r9',
    companyId: 'c3',
    customerId: 'cu10',
    customerName: 'Maria Santos',
    rating: 3,
    comment: 'Decent work but took longer than expected. Quality is good but communication could be better.',
    createdAt: '2025-11-05',
    categories: { professionalism: 3, quality: 4, timeliness: 2, communication: 3 },
  },
];

const mockReviewsC4: CompanyReview[] = [
  {
    id: 'r10',
    companyId: 'c4',
    customerId: 'cu11',
    customerName: 'Kevin Walsh',
    rating: 5,
    comment: 'Exceptional work! GreenBuild transformed our commercial space sustainably. Highly recommend for eco-conscious clients.',
    createdAt: '2026-01-25',
    companyReply: 'Thank you Kevin! Sustainable renovation is our passion.',
    categories: { professionalism: 5, quality: 5, timeliness: 5, communication: 5 },
  },
  {
    id: 'r11',
    companyId: 'c4',
    customerId: 'cu12',
    customerName: 'Priya Sharma',
    rating: 5,
    comment: 'Outstanding eco-friendly renovation. They used all sustainable materials and the result is beautiful.',
    createdAt: '2025-12-20',
    categories: { professionalism: 5, quality: 5, timeliness: 4, communication: 5 },
  },
];

// ─── Mock Data ────────────────────────────────────────────────────────────────

const initialCompanies: Company[] = [
  {
    id: 'c1',
    name: 'BuildPro Renovation Ltd.',
    registrationNo: 'BR-2019-10234',
    contactEmail: 'info@buildpro.com',
    contactPhone: '+1 (555) 123-4567',
    whatsapp: '+15551234567',
    address: '128 Construction Ave, Suite 300, San Francisco, CA 94105',
    established: '2019-03-15',
    employees: 45,
    specialties: ['Commercial Renovation', 'Residential', 'Office Fit-Out', 'Structural Work'],
    serviceArea: 'San Francisco Bay Area, CA',
    projectsCompleted: 127,
    licenceNo: 'LIC-A-78902',
    licenceExpiry: '2027-06-30',
    licenceStatus: 'valid',
    insuranceProvider: 'SafeGuard Insurance',
    insuranceAmount: 2000000,
    insuranceExpiry: '2026-12-31',
    oshCertified: true,
    oshCertExpiry: '2027-01-15',
    incidentRate: 0.8,
    esgRating: 'A-',
    carbonFootprint: 120,
    sustainablePractices: ['Solar energy usage', 'Waste recycling', 'Low-VOC materials', 'Water conservation'],
    creditScore: 3468,
    trustGrade: 'B',
    trustLevel: 'High',
    lastScoreUpdate: '2026-03-14',
    scoreFactors: [
      { name: 'Payment History', score: 420, maxScore: 500, status: 'good', description: 'Excellent payment track record with 98% on-time payments' },
      { name: 'Project Completion Rate', score: 380, maxScore: 400, status: 'good', description: 'Completed 95% of projects within timeline' },
      { name: 'Compliance & Licensing', score: 350, maxScore: 400, status: 'good', description: 'All licences valid and up-to-date' },
      { name: 'Financial Stability', score: 620, maxScore: 800, status: 'fair', description: 'Moderate debt-to-equity ratio, improving trend' },
      { name: 'Customer Satisfaction', score: 410, maxScore: 500, status: 'good', description: 'Average rating of 4.7/5 from customers' },
      { name: 'Insurance Coverage', score: 290, maxScore: 300, status: 'good', description: 'Comprehensive insurance coverage' },
      { name: 'OSH Compliance', score: 280, maxScore: 300, status: 'good', description: 'Certified OSH management system' },
      { name: 'ESG Performance', score: 180, maxScore: 300, status: 'fair', description: 'Good environmental practices, improving social scores' },
    ],
    scoreHistory: [
      { date: 'Sep 2025', score: 3200 },
      { date: 'Oct 2025', score: 3280 },
      { date: 'Nov 2025', score: 3320 },
      { date: 'Dec 2025', score: 3380 },
      { date: 'Jan 2026', score: 3420 },
      { date: 'Feb 2026', score: 3450 },
      { date: 'Mar 2026', score: 3468 },
    ],
    reviews: mockReviewsC1,
    averageRating: 4.5,
    reviewCount: 4,
  },
  {
    id: 'c2',
    name: 'EliteReno Co.',
    registrationNo: 'ER-2017-05610',
    contactEmail: 'info@elitereno.com',
    contactPhone: '+1 (555) 987-6543',
    whatsapp: '+15559876543',
    address: '88 Renovation Blvd, New York, NY 10001',
    established: '2017-07-20',
    employees: 120,
    specialties: ['Luxury Renovation', 'Hotel & Hospitality', 'Commercial', 'Interior Design'],
    serviceArea: 'New York Metro Area, NY',
    projectsCompleted: 312,
    licenceNo: 'LIC-A-56701',
    licenceExpiry: '2026-09-30',
    licenceStatus: 'valid',
    insuranceProvider: 'Premier Insurance',
    insuranceAmount: 5000000,
    insuranceExpiry: '2026-11-30',
    oshCertified: true,
    oshCertExpiry: '2026-08-01',
    incidentRate: 0.3,
    esgRating: 'AA',
    carbonFootprint: 85,
    sustainablePractices: ['Solar energy', 'Recycling', 'Green materials', 'EV fleet', 'Carbon offsets'],
    creditScore: 3720,
    trustGrade: 'A',
    trustLevel: 'Excellent',
    lastScoreUpdate: '2026-03-10',
    scoreFactors: [
      { name: 'Payment History', score: 490, maxScore: 500, status: 'good', description: 'Perfect payment record' },
      { name: 'Project Completion Rate', score: 398, maxScore: 400, status: 'good', description: 'Near-perfect completion rate' },
      { name: 'Compliance & Licensing', score: 395, maxScore: 400, status: 'good', description: 'All licences current' },
      { name: 'Financial Stability', score: 760, maxScore: 800, status: 'good', description: 'Strong financial position' },
      { name: 'Customer Satisfaction', score: 480, maxScore: 500, status: 'good', description: 'Excellent 4.9/5 rating' },
      { name: 'Insurance Coverage', score: 300, maxScore: 300, status: 'good', description: 'Maximum coverage' },
      { name: 'OSH Compliance', score: 300, maxScore: 300, status: 'good', description: 'Exemplary safety record' },
      { name: 'ESG Performance', score: 297, maxScore: 300, status: 'good', description: 'Industry-leading ESG practices' },
    ],
    scoreHistory: [
      { date: 'Sep 2025', score: 3580 },
      { date: 'Oct 2025', score: 3610 },
      { date: 'Nov 2025', score: 3640 },
      { date: 'Dec 2025', score: 3670 },
      { date: 'Jan 2026', score: 3690 },
      { date: 'Feb 2026', score: 3710 },
      { date: 'Mar 2026', score: 3720 },
    ],
    reviews: mockReviewsC2,
    averageRating: 5.0,
    reviewCount: 3,
  },
  {
    id: 'c3',
    name: 'HomeFix Solutions',
    registrationNo: 'HF-2020-08812',
    contactEmail: 'hello@homefixsolutions.com',
    contactPhone: '+1 (555) 334-5678',
    whatsapp: '+15553345678',
    address: '55 Willow St, Austin, TX 78701',
    established: '2020-06-10',
    employees: 22,
    specialties: ['Residential Renovation', 'Kitchen & Bath', 'Flooring', 'Painting'],
    serviceArea: 'Austin Metro Area, TX',
    projectsCompleted: 68,
    licenceNo: 'LIC-B-34120',
    licenceExpiry: '2027-03-15',
    licenceStatus: 'valid',
    insuranceProvider: 'HomeGuard Insurance',
    insuranceAmount: 1000000,
    insuranceExpiry: '2026-10-31',
    oshCertified: true,
    oshCertExpiry: '2026-11-30',
    incidentRate: 1.2,
    esgRating: 'B+',
    carbonFootprint: 145,
    sustainablePractices: ['Waste recycling', 'Low-VOC paints', 'Energy-efficient fixtures'],
    creditScore: 2980,
    trustGrade: 'C',
    trustLevel: 'Moderate',
    lastScoreUpdate: '2026-03-08',
    scoreFactors: [
      { name: 'Payment History', score: 340, maxScore: 500, status: 'fair', description: 'Good payment record with occasional delays' },
      { name: 'Project Completion Rate', score: 310, maxScore: 400, status: 'fair', description: '82% on-time project completion' },
      { name: 'Compliance & Licensing', score: 360, maxScore: 400, status: 'good', description: 'All licences valid' },
      { name: 'Financial Stability', score: 520, maxScore: 800, status: 'fair', description: 'Stable but limited financial reserves' },
      { name: 'Customer Satisfaction', score: 320, maxScore: 500, status: 'fair', description: 'Average rating 3.5/5' },
      { name: 'Insurance Coverage', score: 240, maxScore: 300, status: 'fair', description: 'Standard coverage' },
      { name: 'OSH Compliance', score: 230, maxScore: 300, status: 'fair', description: 'Certified, improving safety metrics' },
      { name: 'ESG Performance', score: 160, maxScore: 300, status: 'poor', description: 'Basic ESG practices in place' },
    ],
    scoreHistory: [
      { date: 'Sep 2025', score: 2850 },
      { date: 'Oct 2025', score: 2880 },
      { date: 'Nov 2025', score: 2900 },
      { date: 'Dec 2025', score: 2930 },
      { date: 'Jan 2026', score: 2950 },
      { date: 'Feb 2026', score: 2965 },
      { date: 'Mar 2026', score: 2980 },
    ],
    reviews: mockReviewsC3,
    averageRating: 3.5,
    reviewCount: 2,
  },
  {
    id: 'c4',
    name: 'GreenBuild Contractors',
    registrationNo: 'GB-2018-07731',
    contactEmail: 'projects@greenbuild.co',
    contactPhone: '+1 (555) 221-9900',
    whatsapp: '+15552219900',
    address: '301 Eco Blvd, Portland, OR 97201',
    established: '2018-01-12',
    employees: 78,
    specialties: ['Sustainable Construction', 'LEED Certification', 'Commercial', 'Retrofit & Upgrades'],
    serviceArea: 'Pacific Northwest, OR & WA',
    projectsCompleted: 195,
    licenceNo: 'LIC-A-91230',
    licenceExpiry: '2027-01-31',
    licenceStatus: 'valid',
    insuranceProvider: 'EcoGuard Insurance',
    insuranceAmount: 3000000,
    insuranceExpiry: '2027-01-31',
    oshCertified: true,
    oshCertExpiry: '2027-02-28',
    incidentRate: 0.5,
    esgRating: 'AAA',
    carbonFootprint: 45,
    sustainablePractices: ['100% renewable energy', 'Zero-waste policy', 'Sustainable materials only', 'Carbon-neutral operations', 'LEED certified projects', 'EV fleet'],
    creditScore: 3560,
    trustGrade: 'A',
    trustLevel: 'Excellent',
    lastScoreUpdate: '2026-03-12',
    scoreFactors: [
      { name: 'Payment History', score: 470, maxScore: 500, status: 'good', description: 'Near-perfect payment history' },
      { name: 'Project Completion Rate', score: 385, maxScore: 400, status: 'good', description: '96% on-time completion rate' },
      { name: 'Compliance & Licensing', score: 398, maxScore: 400, status: 'good', description: 'Exemplary compliance record' },
      { name: 'Financial Stability', score: 700, maxScore: 800, status: 'good', description: 'Strong financials with growth trend' },
      { name: 'Customer Satisfaction', score: 455, maxScore: 500, status: 'good', description: '4.8/5 average rating' },
      { name: 'Insurance Coverage', score: 300, maxScore: 300, status: 'good', description: 'Comprehensive coverage' },
      { name: 'OSH Compliance', score: 295, maxScore: 300, status: 'good', description: 'Outstanding safety record' },
      { name: 'ESG Performance', score: 297, maxScore: 300, status: 'good', description: 'Industry-leading sustainability' },
    ],
    scoreHistory: [
      { date: 'Sep 2025', score: 3420 },
      { date: 'Oct 2025', score: 3450 },
      { date: 'Nov 2025', score: 3480 },
      { date: 'Dec 2025', score: 3510 },
      { date: 'Jan 2026', score: 3530 },
      { date: 'Feb 2026', score: 3548 },
      { date: 'Mar 2026', score: 3560 },
    ],
    reviews: mockReviewsC4,
    averageRating: 5.0,
    reviewCount: 2,
  },
];

const initialProjects: Project[] = [
  {
    id: 'p1',
    title: 'Downtown Office Renovation',
    description: 'Complete interior renovation of a 5,000 sqft office space including flooring, walls, ceiling, and HVAC upgrades.',
    customerId: 'u2',
    customerName: 'Sarah Chen',
    location: '350 Market St, San Francisco, CA',
    budget: 180000,
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    status: 'bidding',
    createdAt: '2026-03-01',
    bids: [
      {
        id: 'b1',
        projectId: 'p1',
        companyId: 'c1',
        companyName: 'BuildPro Renovation Ltd.',
        amount: 165000,
        timeline: '5 months',
        proposal: 'We will provide comprehensive renovation services using premium materials with a dedicated 15-person team. Our plan includes weekly progress reports and milestone-based payments.',
        status: 'pending',
        submittedAt: '2026-03-05',
        trustGrade: 'B',
        creditScore: 3468,
      },
      {
        id: 'b2',
        projectId: 'p1',
        companyId: 'c2',
        companyName: 'EliteReno Co.',
        amount: 172000,
        timeline: '4.5 months',
        proposal: 'Premium renovation with our award-winning design team. We specialize in commercial spaces and have completed 50+ similar projects.',
        status: 'pending',
        submittedAt: '2026-03-07',
        trustGrade: 'A',
        creditScore: 3720,
      },
    ],
    milestones: [],
    disputes: [],
  },
  {
    id: 'p2',
    title: 'Residential Apartment - Building A',
    description: 'Full renovation of 12-unit residential building including kitchen, bathroom, and common area upgrades.',
    customerId: 'u2',
    customerName: 'Sarah Chen',
    location: '892 Pacific Ave, San Francisco, CA',
    budget: 320000,
    startDate: '2026-02-01',
    endDate: '2026-08-31',
    status: 'active',
    contractorId: 'c1',
    contractorName: 'BuildPro Renovation Ltd.',
    contractId: 'con1',
    createdAt: '2026-01-15',
    bids: [
      {
        id: 'b3',
        projectId: 'p2',
        companyId: 'c1',
        companyName: 'BuildPro Renovation Ltd.',
        amount: 305000,
        timeline: '7 months',
        proposal: 'Full-service residential renovation with minimal disruption to tenants.',
        status: 'accepted',
        submittedAt: '2026-01-20',
        trustGrade: 'B',
        creditScore: 3468,
      },
    ],
    milestones: [
      {
        id: 'm1',
        projectId: 'p2',
        title: 'Site Preparation & Demolition',
        description: 'Clear existing fixtures, prepare work areas, obtain permits',
        amount: 45000,
        dueDate: '2026-02-28',
        status: 'approved',
        evidence: 'site-prep-evidence.pdf',
        submittedAt: '2026-02-25',
        approvedAt: '2026-02-27',
        escrowState: 'released',
      },
      {
        id: 'm2',
        projectId: 'p2',
        title: 'Structural & Plumbing Work',
        description: 'Structural modifications, new plumbing for kitchens and bathrooms',
        amount: 85000,
        dueDate: '2026-04-15',
        status: 'submitted',
        evidence: 'plumbing-evidence.pdf',
        submittedAt: '2026-04-10',
        escrowState: 'pending',
      },
      {
        id: 'm3',
        projectId: 'p2',
        title: 'Interior Finishing',
        description: 'Flooring, tiling, painting, fixture installation',
        amount: 110000,
        dueDate: '2026-06-30',
        status: 'in_progress',
        escrowState: 'locked',
      },
      {
        id: 'm4',
        projectId: 'p2',
        title: 'Final Inspection & Handover',
        description: 'Quality check, punch list completion, client handover',
        amount: 65000,
        dueDate: '2026-08-31',
        status: 'planned',
        escrowState: 'planned',
      },
    ],
    disputes: [],
  },
  {
    id: 'p3',
    title: 'Hotel Lobby Redesign',
    description: 'Modern redesign of hotel lobby and reception area with luxury finishes.',
    customerId: 'u2',
    customerName: 'Sarah Chen',
    location: '1200 Union Square, San Francisco, CA',
    budget: 95000,
    startDate: '2026-03-01',
    endDate: '2026-07-31',
    status: 'disputed',
    contractorId: 'c2',
    contractorName: 'EliteReno Co.',
    contractId: 'con2',
    createdAt: '2026-02-10',
    bids: [],
    milestones: [
      {
        id: 'm5',
        projectId: 'p3',
        title: 'Design & Material Approval',
        description: 'Finalize design concept and material selections',
        amount: 15000,
        dueDate: '2026-03-15',
        status: 'approved',
        escrowState: 'released',
        approvedAt: '2026-03-14',
      },
      {
        id: 'm6',
        projectId: 'p3',
        title: 'Construction Phase 1',
        description: 'Structural changes, new flooring, ceiling work',
        amount: 45000,
        dueDate: '2026-05-15',
        status: 'disputed',
        escrowState: 'frozen',
      },
    ],
    disputes: [
      {
        id: 'd1',
        projectId: 'p3',
        projectTitle: 'Hotel Lobby Redesign',
        milestoneId: 'm6',
        milestoneTitle: 'Construction Phase 1',
        raisedBy: 'Sarah Chen',
        raisedByRole: 'customer',
        description: 'The flooring quality does not match the agreed specifications. Tiles appear to be a lower grade than contracted. Requesting inspection and replacement.',
        status: 'under_review',
        createdAt: '2026-03-10',
      },
    ],
  },
  {
    id: 'p4',
    title: 'Shopping Centre Food Court Renovation',
    description: 'Modernize food court area with new ventilation, counters, and seating arrangements.',
    customerId: 'u2',
    customerName: 'Sarah Chen',
    location: '450 Westfield Ave, Oakland, CA',
    budget: 250000,
    startDate: '2026-05-01',
    endDate: '2026-11-30',
    status: 'open',
    createdAt: '2026-03-12',
    bids: [],
    milestones: [],
    disputes: [],
  },
  {
    id: 'p5',
    title: 'Warehouse Office Conversion',
    description: 'Convert 8,000 sqft warehouse into modern open-plan office with break rooms and conference areas.',
    customerId: 'u2',
    customerName: 'Sarah Chen',
    location: '780 Industrial Dr, Oakland, CA',
    budget: 420000,
    startDate: '2025-09-01',
    endDate: '2026-01-31',
    status: 'completed',
    contractorId: 'c1',
    contractorName: 'BuildPro Renovation Ltd.',
    contractId: 'con3',
    createdAt: '2025-08-15',
    bids: [],
    milestones: [
      { id: 'mc1', projectId: 'p5', title: 'Site Prep', description: '', amount: 60000, dueDate: '2025-09-30', status: 'approved', escrowState: 'released', approvedAt: '2025-10-01' },
      { id: 'mc2', projectId: 'p5', title: 'Structural Work', description: '', amount: 150000, dueDate: '2025-11-15', status: 'approved', escrowState: 'released', approvedAt: '2025-11-18' },
      { id: 'mc3', projectId: 'p5', title: 'Interior & Finishing', description: '', amount: 150000, dueDate: '2026-01-15', status: 'approved', escrowState: 'released', approvedAt: '2026-01-20' },
      { id: 'mc4', projectId: 'p5', title: 'Handover', description: '', amount: 60000, dueDate: '2026-01-31', status: 'approved', escrowState: 'released', approvedAt: '2026-02-01' },
    ],
    disputes: [],
    reviewed: true,
  },
];

const initialLoans: LoanApplication[] = [
  {
    id: 'l1',
    applicantId: 'u1',
    applicantName: 'Alex Construction',
    companyId: 'c1',
    companyName: 'BuildPro Renovation Ltd.',
    projectId: 'p2',
    projectTitle: 'Residential Apartment - Building A',
    amount: 100000,
    purpose: 'Working capital to fund materials purchase and subcontractor payments for the residential renovation project.',
    term: 12,
    status: 'approved',
    trustGrade: 'B',
    creditScore: 3468,
    interestRate: 4.5,
    disbursedAmount: 100000,
    repaidAmount: 35000,
    reviewerId: 'u3',
    reviewerNote: 'Strong trust score and project linkage. Approved for full amount.',
    createdAt: '2026-01-20',
    reviewedAt: '2026-01-25',
    disbursedAt: '2026-01-28',
  },
  {
    id: 'l2',
    applicantId: 'u1',
    applicantName: 'Alex Construction',
    companyId: 'c1',
    companyName: 'BuildPro Renovation Ltd.',
    amount: 50000,
    purpose: 'Equipment purchase - new power tools and safety equipment for expanded operations.',
    term: 6,
    status: 'under_review',
    trustGrade: 'B',
    creditScore: 3468,
    createdAt: '2026-03-01',
  },
];

const initialContracts: SmartContract[] = [
  {
    id: 'con1',
    projectId: 'p2',
    projectTitle: 'Residential Apartment - Building A',
    contractorId: 'c1',
    contractorName: 'BuildPro Renovation Ltd.',
    customerId: 'u2',
    customerName: 'Sarah Chen',
    totalAmount: 305000,
    lockedAmount: 110000,
    releasedAmount: 45000,
    state: 'active',
    activatedAt: '2026-01-22',
    createdAt: '2026-01-22',
  },
  {
    id: 'con2',
    projectId: 'p3',
    projectTitle: 'Hotel Lobby Redesign',
    contractorId: 'c2',
    contractorName: 'EliteReno Co.',
    customerId: 'u2',
    customerName: 'Sarah Chen',
    totalAmount: 95000,
    lockedAmount: 45000,
    releasedAmount: 15000,
    state: 'frozen',
    activatedAt: '2026-02-15',
    createdAt: '2026-02-15',
  },
  {
    id: 'con3',
    projectId: 'p5',
    projectTitle: 'Warehouse Office Conversion',
    contractorId: 'c1',
    contractorName: 'BuildPro Renovation Ltd.',
    customerId: 'u2',
    customerName: 'Sarah Chen',
    totalAmount: 420000,
    lockedAmount: 0,
    releasedAmount: 420000,
    state: 'completed',
    activatedAt: '2025-09-01',
    completedAt: '2026-02-01',
    createdAt: '2025-08-20',
  },
];

const initialDisputes: Dispute[] = [
  {
    id: 'd1',
    projectId: 'p3',
    projectTitle: 'Hotel Lobby Redesign',
    milestoneId: 'm6',
    milestoneTitle: 'Construction Phase 1',
    raisedBy: 'Sarah Chen',
    raisedByRole: 'customer',
    description: 'The flooring quality does not match the agreed specifications. Tiles appear to be a lower grade than contracted. Requesting inspection and replacement.',
    status: 'under_review',
    createdAt: '2026-03-10',
  },
];

const initialAuditLogs: AuditLog[] = [
  { id: 'a1', action: 'USER_LOGIN', actorId: 'u1', actorName: 'Alex Construction', actorRole: 'company_user', targetType: 'session', targetId: 's1', details: 'Successful login', createdAt: '2026-03-14T09:00:00Z' },
  { id: 'a2', action: 'SCORE_GENERATED', actorId: 'u1', actorName: 'Alex Construction', actorRole: 'company_user', targetType: 'company', targetId: 'c1', details: 'Trust score updated: 3450 → 3468', createdAt: '2026-03-14T09:05:00Z' },
  { id: 'a3', action: 'LOAN_APPROVED', actorId: 'u3', actorName: 'James Wilson', actorRole: 'reviewer', targetType: 'loan', targetId: 'l1', details: 'Loan #l1 approved for $100,000', createdAt: '2026-01-25T14:30:00Z' },
  { id: 'a4', action: 'BID_SUBMITTED', actorId: 'u1', actorName: 'Alex Construction', actorRole: 'company_user', targetType: 'bid', targetId: 'b1', details: 'Bid submitted for project Downtown Office Renovation', createdAt: '2026-03-05T10:15:00Z' },
  { id: 'a5', action: 'MILESTONE_SUBMITTED', actorId: 'u1', actorName: 'Alex Construction', actorRole: 'company_user', targetType: 'milestone', targetId: 'm2', details: 'Milestone "Structural & Plumbing Work" submitted for review', createdAt: '2026-04-10T16:00:00Z' },
  { id: 'a6', action: 'DISPUTE_OPENED', actorId: 'u2', actorName: 'Sarah Chen', actorRole: 'customer', targetType: 'dispute', targetId: 'd1', details: 'Dispute opened on milestone "Construction Phase 1"', createdAt: '2026-03-10T11:00:00Z' },
  { id: 'a7', action: 'MILESTONE_APPROVED', actorId: 'u2', actorName: 'Sarah Chen', actorRole: 'customer', targetType: 'milestone', targetId: 'm1', details: 'Milestone "Site Preparation & Demolition" approved, $45,000 released', createdAt: '2026-02-27T13:00:00Z' },
  { id: 'a8', action: 'PROJECT_CREATED', actorId: 'u2', actorName: 'Sarah Chen', actorRole: 'customer', targetType: 'project', targetId: 'p4', details: 'New project "Shopping Centre Food Court Renovation" created', createdAt: '2026-03-12T09:00:00Z' },
  { id: 'a9', action: 'BID_ACCEPTED', actorId: 'u2', actorName: 'Sarah Chen', actorRole: 'customer', targetType: 'bid', targetId: 'b3', details: 'Bid accepted from BuildPro Renovation Ltd. for project p2', createdAt: '2026-01-22T10:00:00Z' },
  { id: 'a10', action: 'LOAN_APPLICATION', actorId: 'u1', actorName: 'Alex Construction', actorRole: 'company_user', targetType: 'loan', targetId: 'l2', details: 'New loan application for $50,000 submitted', createdAt: '2026-03-01T14:00:00Z' },
  { id: 'a11', action: 'CONTRACT_ACTIVATED', actorId: 'system', actorName: 'System', actorRole: 'system', targetType: 'contract', targetId: 'con1', details: 'Smart contract activated for project Residential Apartment - Building A', createdAt: '2026-01-22T10:05:00Z' },
  { id: 'a12', action: 'CONTRACT_FROZEN', actorId: 'system', actorName: 'System', actorRole: 'system', targetType: 'contract', targetId: 'con2', details: 'Contract frozen due to dispute d1', createdAt: '2026-03-10T11:05:00Z' },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface DataContextType {
  companies: Company[];
  projects: Project[];
  loans: LoanApplication[];
  contracts: SmartContract[];
  disputes: Dispute[];
  auditLogs: AuditLog[];
  isSyncing: boolean;
  syncError: string | null;
  refreshFromBackend: () => Promise<void>;
  // Actions
  addProject: (project: Omit<Project, 'id' | 'bids' | 'milestones' | 'disputes' | 'createdAt'>) => void;
  submitBid: (bid: Omit<Bid, 'id'>) => void;
  acceptBid: (projectId: string, bidId: string) => void;
  addMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  submitMilestone: (milestoneId: string, evidence: string) => void;
  approveMilestone: (milestoneId: string) => void;
  openDispute: (dispute: Omit<Dispute, 'id' | 'createdAt'>) => void;
  resolveDispute: (disputeId: string, resolution: string, reviewerId: string) => void;
  applyForLoan: (loan: Omit<LoanApplication, 'id' | 'createdAt' | 'status'>) => void;
  reviewLoan: (loanId: string, status: 'approved' | 'rejected', note: string, reviewerId: string, rate?: number) => void;
  disburseLoan: (loanId: string) => void;
  getCompany: (id: string) => Company | undefined;
  getProject: (id: string) => Project | undefined;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'createdAt'>) => void;
  addCompanyReview: (review: Omit<CompanyReview, 'id'>, projectId?: string) => void;
  updateCompanyAvatar: (companyId: string, avatar: string) => void;
  submitDirectHire: (params: { projectData?: Omit<Project, 'id' | 'bids' | 'milestones' | 'disputes' | 'createdAt'>; existingProjectId?: string; companyId: string; companyName: string }) => void;
  respondToDirectHire: (projectId: string, accept: boolean, amount?: number, timeline?: string) => void;
  signContract: (projectId: string, signerRole: 'customer' | 'contractor') => void;
  cancelDirectHire: (projectId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

const toId = (value: unknown) => String(value ?? '');

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || `API request failed: ${path}`);
  }

  return payload.data;
}

function mapProjectStatus(status: string | null | undefined): ProjectStatus {
  switch ((status || '').toLowerCase()) {
    case 'open_for_bids':
    case 'draft':
      return 'open';
    case 'contracted':
    case 'awaiting_signatures':
      return 'awaiting_signatures';
    case 'in_progress':
    case 'active':
      return 'active';
    case 'disputed':
      return 'disputed';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'bidding':
      return 'bidding';
    default:
      return 'open';
  }
}

function mapBidStatus(status: string | null | undefined): BidStatus {
  switch ((status || '').toLowerCase()) {
    case 'accepted':
      return 'accepted';
    case 'rejected':
      return 'rejected';
    default:
      return 'pending';
  }
}

function mapMilestoneStatus(status: string | null | undefined): MilestoneStatus {
  switch ((status || '').toLowerCase()) {
    case 'in_progress':
      return 'in_progress';
    case 'submitted':
      return 'submitted';
    case 'approved':
      return 'approved';
    case 'disputed':
      return 'disputed';
    default:
      return 'planned';
  }
}

function mapContractState(status: string | null | undefined): ContractState {
  switch ((status || '').toLowerCase()) {
    case 'pending_signatures':
      return 'pending_signatures';
    case 'active':
      return 'active';
    case 'pending_review':
      return 'pending_review';
    case 'frozen':
      return 'frozen';
    case 'completed':
      return 'completed';
    case 'terminated':
      return 'terminated';
    default:
      return 'draft';
  }
}

function mapLoanStatus(status: string | null | undefined): LoanStatus {
  switch ((status || '').toLowerCase()) {
    case 'under_review':
      return 'under_review';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'disbursed':
      return 'disbursed';
    case 'repaid':
      return 'repaid';
    default:
      return 'pending';
  }
}

function mapCompany(company: any): Company {
  const creditScore = Number(company.trust_score_cached || 0);
  return {
    id: toId(company.id),
    name: company.company_name || `Company ${company.id}`,
    registrationNo: company.business_registration || '-',
    contactEmail: company.email || '-',
    contactPhone: company.phone || '-',
    address: company.address || '-',
    established: company.established_date || company.created_at || '',
    employees: Number(company.employee_count || 0),
    licenceNo: company.licence_number || company.business_registration || '-',
    licenceExpiry: company.licence_expiry_date || '',
    licenceStatus: company.licence_verification_status === 'verified' ? 'valid' : company.licence_verification_status === 'expired' ? 'expired' : 'pending',
    insuranceProvider: company.insurance_provider || '-',
    insuranceAmount: Number(company.registered_capital || 0),
    insuranceExpiry: company.insurance_expiry_date || '',
    oshCertified: Boolean(company.osh_policy_in_place),
    oshCertExpiry: '',
    incidentRate: Number(company.safety_incident_count || 0),
    esgRating: (company.esg_policy_level || 'none').toUpperCase(),
    carbonFootprint: Number(company.green_material_ratio ? 100 - Number(company.green_material_ratio) : 100),
    sustainablePractices: [],
    creditScore,
    trustGrade: creditScore >= 3500 ? 'A' : creditScore >= 3000 ? 'B' : creditScore >= 2500 ? 'C' : 'D',
    trustLevel: (company.risk_level || 'unknown').replace('_', ' '),
    lastScoreUpdate: company.created_at || new Date().toISOString(),
    scoreFactors: [],
    scoreHistory: [],
    reviews: [],
    averageRating: 0,
    reviewCount: 0,
    serviceArea: company.district || '',
    projectsCompleted: Number(company.project_count_completed || 0),
  };
}

function mapProject(project: any): Project {
  return {
    id: toId(project.id),
    title: project.title || 'Untitled Project',
    description: project.description || '',
    customerId: toId(project.customer_user_id),
    customerName: project.customer_name || `Customer ${project.customer_user_id}`,
    location: project.property_address || project.district || 'Not specified',
    budget: Number(project.budget_amount || 0),
    startDate: project.target_start_date || '',
    endDate: project.target_end_date || '',
    status: mapProjectStatus(project.status),
    contractorId: project.contractor_company_id ? toId(project.contractor_company_id) : undefined,
    contractorName: project.contractor_name || undefined,
    createdAt: project.created_at || new Date().toISOString(),
    bids: [],
    milestones: [],
    disputes: [],
  };
}

function mapBid(bid: any, fallbackProjectId: string): Bid {
  return {
    id: toId(bid.id),
    projectId: toId(bid.project_id || fallbackProjectId),
    companyId: toId(bid.company_id),
    companyName: bid.company_name || `Company ${bid.company_id}`,
    amount: Number(bid.bid_amount || 0),
    timeline: bid.proposed_duration_days ? `${bid.proposed_duration_days} days` : 'TBD',
    proposal: bid.proposal_summary || '',
    status: mapBidStatus(bid.status),
    submittedAt: bid.created_at || new Date().toISOString(),
    trustGrade: bid.trust_grade || 'N/A',
    creditScore: Number(bid.credit_score || 0),
  };
}

function mapMilestone(milestone: any, fallbackProjectId: string): Milestone {
  const status = mapMilestoneStatus(milestone.status);
  return {
    id: toId(milestone.id),
    projectId: toId(milestone.project_id || fallbackProjectId),
    title: milestone.name || `Milestone ${milestone.sequence_no || ''}`,
    description: milestone.description || milestone.evidence_notes || '',
    amount: Number(milestone.planned_amount || 0),
    dueDate: milestone.due_date || '',
    status,
    evidence: milestone.evidence_notes || undefined,
    submittedAt: milestone.submitted_at || undefined,
    approvedAt: milestone.approved_at || undefined,
    escrowState: status === 'approved' ? 'released' : status === 'submitted' ? 'pending' : status === 'disputed' ? 'frozen' : status === 'in_progress' ? 'locked' : 'planned',
  };
}

function mapContract(contract: any, projectLookup: Map<string, Project>): SmartContract {
  const projectId = toId(contract.project_id);
  const project = projectLookup.get(projectId);
  return {
    id: toId(contract.id),
    projectId,
    projectTitle: project?.title || `Project ${projectId}`,
    contractorId: toId(contract.contractor_company_id),
    contractorName: project?.contractorName || `Company ${contract.contractor_company_id || ''}`,
    customerId: toId(contract.customer_user_id),
    customerName: project?.customerName || `Customer ${contract.customer_user_id || ''}`,
    totalAmount: Number(contract.budget_amount || 0),
    lockedAmount: Number(contract.escrow_balance || 0),
    releasedAmount: Number(contract.released_amount || 0),
    state: mapContractState(contract.status),
    createdAt: contract.created_at || new Date().toISOString(),
    activatedAt: contract.activated_at || undefined,
  };
}

function mapLoan(loan: any, companiesById: Map<string, Company>, projectsById: Map<string, Project>): LoanApplication {
  const company = companiesById.get(toId(loan.company_id));
  const project = loan.project_id ? projectsById.get(toId(loan.project_id)) : undefined;
  return {
    id: toId(loan.id),
    applicantId: toId(loan.company_id),
    applicantName: company?.name || `Company ${loan.company_id}`,
    companyId: toId(loan.company_id),
    companyName: company?.name,
    projectId: loan.project_id ? toId(loan.project_id) : undefined,
    projectTitle: project?.title,
    amount: Number(loan.loan_amount || 0),
    purpose: loan.loan_purpose || '',
    term: Number(loan.loan_term_months || 0),
    status: mapLoanStatus(loan.application_status),
    creditScore: loan.credit_score_at_application || undefined,
    interestRate: loan.approved_interest_rate || undefined,
    disbursedAmount: loan.disbursement_amount || undefined,
    repaidAmount: loan.total_repaid || undefined,
    createdAt: loan.applied_at || new Date().toISOString(),
    reviewedAt: loan.decision_at || undefined,
    disbursedAt: loan.disbursement_date || undefined,
  };
}

function mapDispute(dispute: any, projectsById: Map<string, Project>): Dispute {
  const projectId = toId(dispute.project_id);
  const project = projectsById.get(projectId);
  return {
    id: toId(dispute.id),
    projectId,
    projectTitle: project?.title || `Project ${projectId}`,
    milestoneId: dispute.milestone_id ? toId(dispute.milestone_id) : undefined,
    milestoneTitle: project?.milestones.find((m) => m.id === toId(dispute.milestone_id))?.title,
    raisedBy: dispute.opened_by_user_id ? `User ${dispute.opened_by_user_id}` : 'User',
    raisedByRole: 'customer',
    description: dispute.description || '',
    status: (dispute.status === 'resolved' ? 'resolved' : dispute.status === 'closed' ? 'closed' : dispute.status === 'under_review' ? 'under_review' : 'open') as DisputeStatus,
    resolution: dispute.resolution_summary || undefined,
    createdAt: dispute.opened_at || new Date().toISOString(),
    resolvedAt: dispute.resolved_at || undefined,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [loans, setLoans] = useState<LoanApplication[]>(initialLoans);
  const [contracts, setContracts] = useState<SmartContract[]>(initialContracts);
  const [disputes, setDisputes] = useState<Dispute[]>(initialDisputes);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshFromBackend = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const [rawCompanies, rawProjects] = await Promise.all([
        apiGet<any[]>('/companies'),
        apiGet<any[]>('/projects'),
      ]);

      const mappedCompanies = rawCompanies.map(mapCompany);
      const mappedProjects = rawProjects.map(mapProject);

      const detailedProjects = await Promise.all(mappedProjects.map(async (project) => {
        const [rawBids, rawMilestones] = await Promise.all([
          apiGet<any[]>(`/projects/${project.id}/bids`).catch(() => []),
          apiGet<any[]>(`/projects/${project.id}/milestones`).catch(() => []),
        ]);

        return {
          ...project,
          bids: rawBids.map((bid) => mapBid(bid, project.id)),
          milestones: rawMilestones.map((milestone) => mapMilestone(milestone, project.id)),
          status: project.status === 'open' && rawBids.length > 0 ? 'bidding' : project.status,
        } as Project;
      }));

      const projectsById = new Map(detailedProjects.map((project) => [project.id, project]));
      const companiesById = new Map(mappedCompanies.map((company) => [company.id, company]));

      const rawContracts = (await Promise.all(detailedProjects.map((project) =>
        apiGet<any>(`/projects/${project.id}/contract`).catch(() => null)
      ))).filter(Boolean);

      const mappedContracts = rawContracts.map((contract) => mapContract(contract, projectsById));

      const rawLoans = await apiGet<any[]>('/loans').catch(() => []);
      const rawDisputes = await apiGet<any[]>('/disputes').catch(() => []);

      if (mappedCompanies.length > 0) {
        setCompanies(mappedCompanies);
      }
      if (detailedProjects.length > 0) {
        setProjects(detailedProjects);
      }
      if (mappedContracts.length > 0) {
        setContracts(mappedContracts);
      }
      if (rawLoans.length > 0) {
        setLoans(rawLoans.map((loan) => mapLoan(loan, companiesById, projectsById)));
      }
      if (rawDisputes.length > 0) {
        const mappedDisputes = rawDisputes.map((dispute) => mapDispute(dispute, projectsById));
        setDisputes(mappedDisputes);
        setProjects((prevProjects) => prevProjects.map((project) => ({
          ...project,
          disputes: mappedDisputes.filter((dispute) => dispute.projectId === project.id),
        })));
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Failed to sync from backend API');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void refreshFromBackend();
  }, [refreshFromBackend]);

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'createdAt'>) => {
    const newLog: AuditLog = {
      ...log,
      id: `a${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const addProject = (project: Omit<Project, 'id' | 'bids' | 'milestones' | 'disputes' | 'createdAt'>) => {
    const newProject: Project = {
      ...project,
      id: `p${Date.now()}`,
      bids: [],
      milestones: [],
      disputes: [],
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [newProject, ...prev]);
    addAuditLog({ action: 'PROJECT_CREATED', actorId: project.customerId, actorName: project.customerName, actorRole: 'customer', targetType: 'project', targetId: newProject.id, details: `New project "${project.title}" created` });
  };

  const submitBid = (bid: Omit<Bid, 'id'>) => {
    const newBid: Bid = { ...bid, id: `b${Date.now()}` };
    setProjects(prev => prev.map(p => p.id === bid.projectId ? { ...p, bids: [...p.bids, newBid], status: 'bidding' } : p));
    addAuditLog({ action: 'BID_SUBMITTED', actorId: bid.companyId, actorName: bid.companyName, actorRole: 'company_user', targetType: 'bid', targetId: newBid.id, details: `Bid submitted for project ${bid.projectId}` });
  };

  const acceptBid = (projectId: string, bidId: string) => {
    let acceptedBidData: Bid | undefined;
    let projectData: Project | undefined;

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const acceptedBid = p.bids.find(b => b.id === bidId);
      if (!acceptedBid) return p;
      acceptedBidData = acceptedBid;
      projectData = p;
      const ts = Date.now();
      return {
        ...p,
        status: 'awaiting_signatures' as ProjectStatus,
        contractorId: acceptedBid.companyId,
        contractorName: acceptedBid.companyName,
        contractId: `con${ts}`,
        bids: p.bids.map(b => ({ ...b, status: b.id === bidId ? 'accepted' : 'rejected' as BidStatus })),
        // Contract Signing milestone first, then platform milestones
        milestones: [
          { id: `m${ts}0`, projectId, title: 'Contract Signing', description: 'Both parties review and sign the project contract before work commences', amount: 0, dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const, isContractSigning: true },
          { id: `m${ts}1`, projectId, title: 'Mobilization & Site Preparation', description: 'Site survey, setup, permits and initial material procurement', amount: Math.round((acceptedBid.amount || 0) * 0.15), dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const },
          { id: `m${ts}2`, projectId, title: 'Structural & Core Work', description: 'Core construction, structural modifications and rough-in work', amount: Math.round((acceptedBid.amount || 0) * 0.35), dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const },
          { id: `m${ts}3`, projectId, title: 'Finishing & Fit-Out', description: 'Interior finishing, installations and fit-out works', amount: Math.round((acceptedBid.amount || 0) * 0.35), dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const },
          { id: `m${ts}4`, projectId, title: 'Final Inspection & Handover', description: 'Quality inspection, defect rectification and formal handover', amount: Math.round((acceptedBid.amount || 0) * 0.15), dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const },
        ],
      };
    }));

    if (acceptedBidData && projectData) {
      const contractId = `con${Date.now()}`;
      const newContract: SmartContract = {
        id: contractId,
        projectId,
        projectTitle: projectData.title,
        contractorId: acceptedBidData.companyId,
        contractorName: acceptedBidData.companyName,
        customerId: projectData.customerId,
        customerName: projectData.customerName,
        totalAmount: acceptedBidData.amount,
        lockedAmount: 0,
        releasedAmount: 0,
        state: 'pending_signatures',
        customerSigned: false,
        contractorSigned: false,
        createdAt: new Date().toISOString(),
      };
      setContracts(prev => [...prev, newContract]);
    }
    addAuditLog({ action: 'BID_ACCEPTED', actorId: '', actorName: '', actorRole: 'customer', targetType: 'bid', targetId: bidId, details: `Bid ${bidId} accepted for project ${projectId} — awaiting contract signatures` });
  };

  const addMilestone = (milestone: Omit<Milestone, 'id'>) => {
    const newMilestone: Milestone = { ...milestone, id: `m${Date.now()}` };
    setProjects(prev => prev.map(p => p.id === milestone.projectId ? { ...p, milestones: [...p.milestones, newMilestone] } : p));
    setContracts(prev => prev.map(c => c.projectId === milestone.projectId ? { ...c, lockedAmount: c.lockedAmount + milestone.amount } : c));
  };

  const submitMilestone = (milestoneId: string, evidence: string) => {
    setProjects(prev => prev.map(p => ({
      ...p,
      milestones: p.milestones.map(m => m.id === milestoneId ? { ...m, status: 'submitted' as MilestoneStatus, evidence, submittedAt: new Date().toISOString(), escrowState: 'pending' as const } : m),
    })));
    setContracts(prev => prev.map(c => {
      const project = projects.find(p => p.milestones.some(m => m.id === milestoneId));
      if (!project || c.projectId !== project.id) return c;
      return { ...c, state: 'pending_review' as ContractState };
    }));
    addAuditLog({ action: 'MILESTONE_SUBMITTED', actorId: '', actorName: '', actorRole: 'company_user', targetType: 'milestone', targetId: milestoneId, details: `Milestone ${milestoneId} submitted for review` });
  };

  const approveMilestone = (milestoneId: string) => {
    let approvedAmount = 0;
    setProjects(prev => prev.map(p => {
      const milestone = p.milestones.find(m => m.id === milestoneId);
      if (!milestone) return p;
      approvedAmount = milestone.amount;
      return {
        ...p,
        milestones: p.milestones.map(m => m.id === milestoneId ? { ...m, status: 'approved' as MilestoneStatus, approvedAt: new Date().toISOString(), escrowState: 'released' as const } : m),
      };
    }));
    setContracts(prev => prev.map(c => {
      const project = projects.find(p => p.milestones.some(m => m.id === milestoneId));
      if (!project || c.projectId !== project.id) return c;
      return { ...c, releasedAmount: c.releasedAmount + approvedAmount, lockedAmount: Math.max(0, c.lockedAmount - approvedAmount), state: 'active' as ContractState };
    }));
    addAuditLog({ action: 'MILESTONE_APPROVED', actorId: '', actorName: '', actorRole: 'customer', targetType: 'milestone', targetId: milestoneId, details: `Milestone ${milestoneId} approved, funds released` });
  };

  const openDispute = (dispute: Omit<Dispute, 'id' | 'createdAt'>) => {
    const newDispute: Dispute = { ...dispute, id: `d${Date.now()}`, createdAt: new Date().toISOString() };
    setDisputes(prev => [newDispute, ...prev]);
    setContracts(prev => prev.map(c => c.projectId === dispute.projectId ? { ...c, state: 'frozen' } : c));
    setProjects(prev => prev.map(p => p.id === dispute.projectId ? { ...p, status: 'disputed', disputes: [...p.disputes, newDispute] } : p));
    addAuditLog({ action: 'DISPUTE_OPENED', actorId: '', actorName: dispute.raisedBy, actorRole: dispute.raisedByRole, targetType: 'dispute', targetId: newDispute.id, details: `Dispute opened: ${dispute.description.slice(0, 60)}...` });
  };

  const resolveDispute = (disputeId: string, resolution: string, reviewerId: string) => {
    setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: 'resolved' as DisputeStatus, resolution, reviewerId, resolvedAt: new Date().toISOString() } : d));
    const dispute = disputes.find(d => d.id === disputeId);
    if (dispute) {
      setContracts(prev => prev.map(c => c.projectId === dispute.projectId ? { ...c, state: 'active' as ContractState } : c));
      setProjects(prev => prev.map(p => p.id === dispute.projectId ? { ...p, status: 'active' as ProjectStatus } : p));
    }
    addAuditLog({ action: 'DISPUTE_RESOLVED', actorId: reviewerId, actorName: 'Reviewer', actorRole: 'reviewer', targetType: 'dispute', targetId: disputeId, details: `Dispute resolved: ${resolution.slice(0, 60)}` });
  };

  const applyForLoan = (loan: Omit<LoanApplication, 'id' | 'createdAt' | 'status'>) => {
    const newLoan: LoanApplication = { ...loan, id: `l${Date.now()}`, status: 'pending', createdAt: new Date().toISOString() };
    setLoans(prev => [newLoan, ...prev]);
    addAuditLog({ action: 'LOAN_APPLICATION', actorId: loan.applicantId, actorName: loan.applicantName, actorRole: 'company_user', targetType: 'loan', targetId: newLoan.id, details: `Loan application for $${loan.amount.toLocaleString()} submitted` });
  };

  const reviewLoan = (loanId: string, status: 'approved' | 'rejected', note: string, reviewerId: string, rate?: number) => {
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status, reviewerNote: note, reviewerId, interestRate: rate, reviewedAt: new Date().toISOString() } : l));
    addAuditLog({ action: status === 'approved' ? 'LOAN_APPROVED' : 'LOAN_REJECTED', actorId: reviewerId, actorName: 'Reviewer', actorRole: 'reviewer', targetType: 'loan', targetId: loanId, details: `Loan ${loanId} ${status}: ${note}` });
  };

  const disburseLoan = (loanId: string) => {
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'disbursed', disbursedAmount: l.amount, disbursedAt: new Date().toISOString() } : l));
    addAuditLog({ action: 'LOAN_DISBURSED', actorId: 'system', actorName: 'System', actorRole: 'system', targetType: 'loan', targetId: loanId, details: `Loan ${loanId} disbursed` });
  };

  const addCompanyReview = (review: Omit<CompanyReview, 'id'>, projectId?: string) => {
    const newReview: CompanyReview = { ...review, id: `r${Date.now()}` };
    setCompanies(prev => prev.map(c => {
      if (c.id !== review.companyId) return c;
      const newReviews = [newReview, ...c.reviews];
      const totalRating = newReviews.reduce((sum, r) => sum + r.rating, 0);
      return {
        ...c,
        reviews: newReviews,
        reviewCount: newReviews.length,
        averageRating: Math.round((totalRating / newReviews.length) * 10) / 10,
      };
    }));
    if (projectId) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, reviewed: true } : p));
    }
    addAuditLog({ action: 'REVIEW_SUBMITTED', actorId: review.customerId, actorName: review.customerName, actorRole: 'customer', targetType: 'company', targetId: review.companyId, details: `Review submitted: ${review.rating}/5 stars` });
  };

  const updateCompanyAvatar = (companyId: string, avatar: string) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, avatar } : c));
  };

  const submitDirectHire = ({ projectData, existingProjectId, companyId, companyName }: {
    projectData?: Omit<Project, 'id' | 'bids' | 'milestones' | 'disputes' | 'createdAt'>;
    existingProjectId?: string;
    companyId: string;
    companyName: string;
  }) => {
    const targetCompany = companies.find(c => c.id === companyId);
    const buildPlaceholderBid = (projectId: string): Bid => ({
      id: `b${Date.now()}`,
      projectId,
      companyId,
      companyName,
      amount: 0,
      timeline: 'TBD',
      proposal: 'Direct hire request — awaiting company confirmation and quote.',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      trustGrade: targetCompany?.trustGrade || 'B',
      creditScore: targetCompany?.creditScore || 0,
    });

    if (existingProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id !== existingProjectId) return p;
        return {
          ...p,
          isDirectHire: true,
          directHireCompanyId: companyId,
          directHireCompanyName: companyName,
          directHireStatus: 'pending' as const,
          status: 'bidding' as ProjectStatus,
          bids: [...p.bids, buildPlaceholderBid(p.id)],
        };
      }));
      addAuditLog({ action: 'DIRECT_HIRE_SENT', actorId: '', actorName: '', actorRole: 'customer', targetType: 'project', targetId: existingProjectId, details: `Direct hire request sent to ${companyName}` });
    } else if (projectData) {
      const newProjectId = `p${Date.now()}`;
      const newProject: Project = {
        ...projectData,
        id: newProjectId,
        bids: [buildPlaceholderBid(newProjectId)],
        milestones: [],
        disputes: [],
        createdAt: new Date().toISOString(),
        isDirectHire: true,
        directHireCompanyId: companyId,
        directHireCompanyName: companyName,
        directHireStatus: 'pending',
        status: 'bidding',
      };
      setProjects(prev => [newProject, ...prev]);
      addAuditLog({ action: 'DIRECT_HIRE_SENT', actorId: projectData.customerId, actorName: projectData.customerName, actorRole: 'customer', targetType: 'project', targetId: newProjectId, details: `Direct hire request sent to ${companyName} for "${projectData.title}"` });
    }
  };

  const respondToDirectHire = (projectId: string, accept: boolean, amount?: number, timeline?: string) => {
    if (accept && amount) {
      let projectRef: Project | undefined;
      const ts2 = Date.now();
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        projectRef = p;
        const directBid = p.bids.find(b => b.companyId === p.directHireCompanyId);
        return {
          ...p,
          directHireStatus: 'accepted' as const,
          status: 'awaiting_signatures' as ProjectStatus,
          contractorId: p.directHireCompanyId,
          contractorName: p.directHireCompanyName,
          contractId: `con${ts2}`,
          bids: p.bids.map(b =>
            b.id === directBid?.id ? { ...b, amount: amount, timeline: timeline || 'TBD', status: 'accepted' as BidStatus } : b
          ),
          milestones: [
            { id: `m${ts2}0`, projectId, title: 'Contract Signing', description: 'Both parties review and sign the project contract before work commences', amount: 0, dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const, isContractSigning: true },
            { id: `m${ts2}1`, projectId, title: 'Mobilization & Site Preparation', description: 'Site survey, setup, permits and initial material procurement', amount: Math.round(amount * 0.15), dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const },
            { id: `m${ts2}2`, projectId, title: 'Structural & Core Work', description: 'Core construction, structural modifications and rough-in work', amount: Math.round(amount * 0.35), dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const },
            { id: `m${ts2}3`, projectId, title: 'Finishing & Fit-Out', description: 'Interior finishing, installations and fit-out works', amount: Math.round(amount * 0.35), dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const },
            { id: `m${ts2}4`, projectId, title: 'Final Inspection & Handover', description: 'Quality inspection, defect rectification and formal handover', amount: Math.round(amount * 0.15), dueDate: '', status: 'planned' as MilestoneStatus, escrowState: 'planned' as const },
          ],
        };
      }));
      if (projectRef) {
        const newContract: SmartContract = {
          id: `con${ts2}`,
          projectId,
          projectTitle: projectRef.title,
          contractorId: projectRef.directHireCompanyId!,
          contractorName: projectRef.directHireCompanyName!,
          customerId: projectRef.customerId,
          customerName: projectRef.customerName,
          totalAmount: amount,
          lockedAmount: 0,
          releasedAmount: 0,
          state: 'pending_signatures',
          customerSigned: false,
          contractorSigned: false,
          createdAt: new Date().toISOString(),
        };
        setContracts(prev => [...prev, newContract]);
      }
      addAuditLog({ action: 'DIRECT_HIRE_ACCEPTED', actorId: '', actorName: '', actorRole: 'company_user', targetType: 'project', targetId: projectId, details: `Direct hire accepted for $${amount.toLocaleString()} — awaiting contract signatures` });
    } else {
      setProjects(prev => prev.map(p =>
        p.id === projectId
          ? {
              ...p,
              directHireStatus: 'rejected' as const,
              status: 'open' as ProjectStatus,
              bids: p.bids.map(b => b.companyId === p.directHireCompanyId ? { ...b, status: 'rejected' as BidStatus } : b),
            }
          : p
      ));
      addAuditLog({ action: 'DIRECT_HIRE_REJECTED', actorId: '', actorName: '', actorRole: 'company_user', targetType: 'project', targetId: projectId, details: 'Direct hire request declined' });
    }
  };

  const signContract = (projectId: string, signerRole: 'customer' | 'contractor') => {
    let bothSigned = false;

    setContracts(prev => prev.map(c => {
      if (c.projectId !== projectId) return c;
      const updatedCustomerSigned = signerRole === 'customer' ? true : (c.customerSigned ?? false);
      const updatedContractorSigned = signerRole === 'contractor' ? true : (c.contractorSigned ?? false);
      const now = new Date().toISOString();
      bothSigned = updatedCustomerSigned && updatedContractorSigned;
      return {
        ...c,
        customerSigned: updatedCustomerSigned,
        contractorSigned: updatedContractorSigned,
        customerSignedAt: signerRole === 'customer' ? now : c.customerSignedAt,
        contractorSignedAt: signerRole === 'contractor' ? now : c.contractorSignedAt,
        state: bothSigned ? ('active' as ContractState) : ('pending_signatures' as ContractState),
        activatedAt: bothSigned ? now : c.activatedAt,
        lockedAmount: bothSigned ? Math.round(c.totalAmount * 0.15) : c.lockedAmount,
      };
    }));

    if (bothSigned) {
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          status: 'active' as ProjectStatus,
          milestones: p.milestones.map(m =>
            m.isContractSigning
              ? { ...m, status: 'approved' as MilestoneStatus, approvedAt: new Date().toISOString(), escrowState: 'released' as const }
              : m.title === 'Mobilization & Site Preparation'
              ? { ...m, escrowState: 'locked' as const }
              : m
          ),
        };
      }));
      addAuditLog({ action: 'CONTRACT_ACTIVATED', actorId: 'system', actorName: 'System', actorRole: 'system', targetType: 'contract', targetId: projectId, details: `Contract fully signed and activated for project ${projectId}` });
    } else {
      addAuditLog({ action: 'CONTRACT_SIGNED', actorId: '', actorName: '', actorRole: signerRole === 'customer' ? 'customer' : 'company_user', targetType: 'contract', targetId: projectId, details: `Contract signed by ${signerRole} for project ${projectId}` });
    }
  };

  const cancelDirectHire = (projectId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const directHireCompanyId = p.directHireCompanyId;
      return {
        ...p,
        isDirectHire: false,
        directHireCompanyId: undefined,
        directHireCompanyName: undefined,
        directHireStatus: undefined,
        status: 'open' as ProjectStatus,
        bids: p.bids.filter(b => b.companyId !== directHireCompanyId),
      };
    }));
    addAuditLog({
      action: 'DIRECT_HIRE_CANCELLED',
      actorId: '',
      actorName: '',
      actorRole: 'customer',
      targetType: 'project',
      targetId: projectId,
      details: 'Direct hire request cancelled by customer',
    });
  };

  const getCompany = (id: string) => companies.find(c => c.id === id);
  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <DataContext.Provider value={{
      companies, projects, loans, contracts, disputes, auditLogs,
      isSyncing, syncError, refreshFromBackend,
      addProject, submitBid, acceptBid, addMilestone, submitMilestone, approveMilestone,
      openDispute, resolveDispute, applyForLoan, reviewLoan, disburseLoan,
      getCompany, getProject, addAuditLog, addCompanyReview, updateCompanyAvatar,
      submitDirectHire, respondToDirectHire, signContract, cancelDirectHire,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}