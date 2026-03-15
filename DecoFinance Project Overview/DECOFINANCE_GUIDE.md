# DecoFinance - Renovation Credit System

## Overview
DecoFinance is a comprehensive renovation credit and financing platform that builds a safe and transparent trust ecosystem for the renovation industry.

## Features

### 1. **Homepage (Before Login)** - `/`
- Brand introduction and value proposition
- Feature showcase with 6 key platform features
- Call-to-action buttons for registration
- Bilingual support (English/Chinese)
- Responsive design for mobile and desktop

### 2. **Authentication**
- **Login** (`/login`) - Split-screen design with security messaging
- **Register** (`/register`) - Account creation for companies and reviewers
- Role-based authentication (Company, Reviewer, Admin)

### 3. **Company Dashboard** - `/dashboard`
- Credit score and trust level overview
- Active loans and project statistics
- Quick actions for common tasks
- Real-time notifications
- Navigate to:
  - Company Profile
  - Loan Applications
  - Projects
  - Contracts

### 4. **Loan Application** - `/loan-application`
- Interactive loan calculator
- Real-time interest rate calculation based on credit score
- Approval probability estimation
- Adjustable loan amount and repayment duration
- Visual feedback on total repayment

### 5. **Project Management** - `/projects`
- Grid view of all renovation projects
- Project status tracking (Active, Completed, Pending)
- Milestone progress visualization
- Dispute flagging system
- Upload deliverables for each milestone
- Detailed project timeline view

### 6. **Contract Management** - `/contracts`
- Table view of all contracts
- Contract status tracking
- Download and view contract documents
- Filter by active, pending, and completed contracts

### 7. **Company Profile** - `/profile`
- Edit company information
- View credit score and trust level
- Update contact details and business description

### 8. **Reviewer Dashboard** - `/approvals`
- Review pending loan applications
- Approve or reject project milestones
- Add approval/rejection notes
- View decision history
- Track pending reviews

### 9. **Admin Panel** - `/admin`
- User management (Edit roles, disable accounts)
- System statistics and analytics
- Loan approval trends (Charts)
- Credit score distribution (Charts)
- System activity logs
- Platform-wide metrics

## Demo Credentials

### Login Tips:
The system uses email patterns to determine roles:
- Email containing "admin" → Admin role → Redirects to `/admin`
- Email containing "reviewer" → Reviewer role → Redirects to `/approvals`
- Any other email → Company role → Redirects to `/dashboard`

### Example Emails:
- `company@example.com` - Company User
- `admin@example.com` - Administrator
- `reviewer@example.com` - Reviewer

Password: Any password (this is a demo, authentication is mocked)

## Design System

### Colors
- **Primary**: Blue (#2563eb) - Trust and professionalism
- **Secondary**: Gray (#6b7280) - Stability
- **Success**: Green (#10b981) - Success and growth
- **Warning**: Yellow (#f59e0b) - Attention
- **Destructive**: Red (#ef4444) - Alerts

### Typography
- Font Family: Inter (Google Fonts)
- Clean, modern sans-serif for bilingual support

### Components
- Built with Radix UI primitives
- Tailwind CSS v4 for styling
- Recharts for data visualization
- Motion (Framer Motion) for animations

## Bilingual Support

Toggle between English and Chinese using the language switcher in the header.

All UI strings are managed through the `LanguageContext` with comprehensive translations for:
- Navigation
- Forms
- Dashboard metrics
- Notifications
- Buttons and actions

## Responsive Design

- **Desktop**: Full sidebar navigation with multi-column layouts
- **Mobile**: Optimized forms, collapsible layouts, responsive tables
- **Tablet**: Adaptive grid systems

## Key Workflows

### 1. Apply for a Loan
1. Login as a company user
2. Navigate to Dashboard
3. Click "Apply for Loan" or go to `/loan-application`
4. Adjust loan amount and duration using sliders
5. View real-time calculations
6. Submit application

### 2. Manage Projects
1. From Dashboard, navigate to Projects
2. View all active and completed projects
3. Click on a project to see milestone details
4. Upload deliverables or raise disputes
5. Track progress through visual indicators

### 3. Review Applications (Reviewer)
1. Login with reviewer credentials
2. View pending approvals at `/approvals`
3. Review application details
4. Approve or reject with notes
5. Track decision history

### 4. System Administration
1. Login as admin
2. Access `/admin` panel
3. Manage users and roles
4. View system statistics
5. Monitor activity logs
6. Analyze loan trends and credit scores

## Technology Stack

- **React 18** - UI framework
- **React Router 7** - Navigation and routing
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization
- **Motion** - Animations
- **Lucide React** - Icons

## File Structure

```
/src/app
├── contexts/
│   ├── language-context.tsx    # Bilingual support
│   └── auth-context.tsx         # Authentication
├── components/
│   ├── header.tsx               # Global header
│   ├── footer.tsx               # Global footer
│   └── ui/                      # Reusable UI components
├── pages/
│   ├── home.tsx                 # Homepage
│   ├── login.tsx                # Login page
│   ├── register.tsx             # Registration
│   ├── dashboard.tsx            # Company dashboard
│   ├── loan-application.tsx     # Loan application
│   ├── projects.tsx             # Project management
│   ├── contracts.tsx            # Contract management
│   ├── profile.tsx              # Company profile
│   ├── approvals.tsx            # Reviewer dashboard
│   └── admin.tsx                # Admin panel
├── routes.tsx                   # Route configuration
└── App.tsx                      # Main app component
```

## Future Enhancements

- Real backend API integration
- Supabase for authentication and data persistence
- Document upload and storage
- Real-time notifications via WebSockets
- Payment gateway integration
- Advanced analytics and reporting
- Mobile app (React Native)
- Multi-factor authentication
- Email notifications
- Contract e-signature integration
