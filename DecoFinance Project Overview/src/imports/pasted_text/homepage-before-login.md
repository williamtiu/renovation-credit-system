## **1. Homepage (Before Login)**
### **Functionality Logic**
- The homepage must provide an overview of the platform's identity, core value propositions, and functions to attract new users.
- Offer key navigation links, brand-related content, and onboarding routes (such as login, registration, and feature discovery).

### **Page Structure**
1. **Header Navigation**: Fixed navigation bar containing:
   - **Logo**: Clicking redirects to the homepage.
   - **Menu Items**: Links to "About Us," "Features," "Contact Us."
   - **Login/Sign Up Buttons**: Redirects to authentication pages.
   - **Language Switcher**: Enables bilingual support for English and Chinese.
2. **Hero Section**:
   - Dynamic tagline text: "Building a Safe and Transparent Trust Ecosystem for the Renovation Industry."
   - **Call-to-Action (CTA) Button**: "Get Started" -> Leads to registration.
   - Background: Dynamic elements (e.g., animated gradient flows or particles).
3. **Features Showcase**:
   - Highlights platform features (trust scoring, loan application, contract tracking).
   - Each feature summarized in a card with an icon, title, description, and "Learn More" link (leads to detailed sections).
4. **Footer**:
   - Contact information, privacy policy, and social media links.
   - Ensure mobile responsiveness with collapsible layouts.

### **Interactions and Navigation**
- Buttons redirect to respective pages:
  - **Login** -> `/login`
  - **Sign Up** -> `/register`
  - **Learn More (features)** -> `/features`.
- Language switch buttons toggle strings dynamically across the current view (stored in user session settings).



## **2. Login Page**
### **Functionality Logic**
- Allow users to authenticate and access role-specific dashboards.
- Support password recovery and secure sign-in methods (e.g., Google-based login).

### **Page Structure**
1. **Login Form**:
   - **Fields**: Email, password, "Remember Me" checkbox.
   - **Forgot Password Link**: Redirects to `/reset-password`.
   - **Submit Button**: "Login" to authenticate credentials.
2. **Side Panel**:
   - Unique visuals (e.g., renovation industry animations) providing thematic branding.
   - Testimonials or security reassurances (e.g., "Your data is protected with us").
3. **Third-party Login Options**:
   - **Social Buttons**: "Login with Google," "Login with Company Account."

### **Interactions and Navigation**
- **Submit Button** checks credentials and redirects users to dashboards:
  - `role = company_user` -> `/dashboard`
  - `role = reviewer` -> `/approvals`
  - `role = admin` -> `/admin`.
- **Forgot Password**: Trigger an email confirmation flow for password reset.



## **3. Dashboard (Post Login, Role-Specific)**
### **Functionality Logic**
- Displays key data for the specific user role (e.g., company performance, loan applications, active projects).
- Central entry point for all functions like managing projects, applying for loans, or tracking contracts.

### **Page Structure**
1. **Side Navigation Bar**:
   - Sidebar with links to key modules: "Company Profile," "Loan Applications," "Projects," "Contracts."
2. **Main Dashboard Area**:
   - **Data Cards**:
     - Company performance (credit score, trust level).
     - Loan status (approved/pending amounts).
     - Active project summary (progress indicators, next milestone).
   - **Quick Actions**: Buttons like "Apply for Loan" or "Add New Project."
3. **Notifications**:
   - Alert messages for upcoming deadlines, approved loans, or unresolved disputes.

### **Interactions and Navigation**
- Clicking a card redirects users to the respective module:
  - **Company Profile Card** -> `/profile`.
  - **Loan Status** -> `/loan-status`.
  - **Active Projects** -> `/projects`.
- "Apply for Loan" opens `/loan-application` form directly.


---

## **4. Loan Application Page**
### **Functionality Logic**
- Collect user input to submit loan applications based on their credit score and trust level.
- Provide real-time interest calculation and approval probability feedback.

### **Page Structure**
1. **Loan Information Form**:
   - Input fields for loan amount, repayment duration, and preferred terms.
2. **Feedback Section**:
   - Dynamic calculations for total repayment amount, interest, and probabilities based on trust score.
3. **Apply Button**:
   - Submit the application and redirect to the application status page.

### **Interactions and Navigation**
- Submitting the form triggers real-time form validation and feedback.
- Applications redirect to `/loan-status` for tracking.



## **5. Project Management Page**
### **Functionality Logic**
- Manage all projects, track their progress, inspect milestones, and raise disputes.

### **Page Structure**
1. **Project List**:
   - Display all projects in a list or grid.
   - Visible details: Project name, start date, status, current milestone, dispute flag.
2. **Detailed View (On Click)**:
   - Timeline for each milestone (approved/rejected states).
   - Linked contracts and submission logs.

### **Interactions and Navigation**
- Clicking a project opens detailed milestones (`/projects/:id`).
- Buttons to upload milestone deliverables or raise a dispute lead to specific workflows.


---

## **6. Admin Management Page**
### **Functionality Logic**
- A centralized space for administrators to manage users, projects, and track overall system statistics.

### **Page Structure**
1. **User Management**:
   - Table view of all users with options to "Edit Role," "Disable Account."
2. **System Statistics**:
   - Visual graphs for loans approved, average credit scores, and active disputes.
3. **Logs Panel**:
   - System-wide logs accessible only by admin.

### **Interactions and Navigation**
- Admin edits trigger update requests to the server.
- Graphs allow filtering by date ranges.

