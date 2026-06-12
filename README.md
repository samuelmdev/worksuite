# WorkSuite

A modern business management suite built with Next.js 15, combining CRM, Time Tracking, and Project Management functionality in a single application. Perfect for small companies looking to streamline their business operations.

## 🚀 Features

### CRM (Customer Relationship Management)
- **Dashboard**: High-level KPIs and activity feed for managers and admins
- **Client Management**: Add, update, delete, and export client data
- **Reports**: Aggregate client metrics with exportable data
- **Role-based Access**: Admin and manager permissions

### Time Tracking
- **Hours Management**: Track time with 0.25-hour precision
- **Client Association**: Link time entries to specific clients
- **Role-based Views**: 
  - **Employees**: Input personal hours and view their own data
  - **Managers/Admins**: View all employee hours, approve/edit/delete entries
- **Reports**: Comprehensive time tracking analytics

### Project Management (Full Suite)
- **Project Creation**: Create and manage projects with timelines and budgets
- **Team Assignment**: Assign team members with specific roles and hourly rates
- **Client Association**: Link multiple clients to projects
- **Time Tracking Integration**: Track time against specific projects
- **Project Analytics**: Revenue tracking, profitability, and performance metrics
- **Project Templates**: Pre-configured templates for common project types
- **Reports**: Comprehensive project reporting and analytics

### Additional Features
- **Multi-language Support**: English and Finnish localization
- **Responsive Design**: Modern UI with Tailwind CSS
- **Role-based Security**: Granular access control system
- **Real-time Updates**: Client-side state management

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Authentication**: Role-based access control (demo implementation)

## 💰 Pricing

### Simple, Transparent Pricing for Small Companies

All plans include up to 5 users. Additional users are $10/month per user.

| Plan | Price | Features |
|------|-------|----------|
| **CRM** | $49/month | Full CRM functionality, advanced reporting, up to 5 users |
| **Time Tracking** | $39/month | Precise time tracking, approval workflows, up to 5 users |
| **Projects** | $39/month | Project management, team assignments, up to 5 users |
| **Any 2 Modules** | $75/month | Choose any 2 modules, all features, priority support |
| **Full Suite** | $99/month | All modules, API access, priority support, up to 5 users |

### 🧪 Beta Testing Program

**Limited Time Offer**: Join our beta testing program and get:
- **3 months FREE** access to all features
- **12 months at 50% off** after beta period
- Direct input on product development
- Priority support during beta

**Requirements**: Monthly feedback sessions and social media mentions

## 🏃‍♂️ Getting Started

### For Developers

1. Clone the repository:
```bash
git clone <repository-url>
cd worksuite
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see SUPABASE_SETUP.md)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### For Users

Visit our website to start your free trial or join the beta testing program.

## 📁 Project Structure

```
src/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── CRMNav.tsx      # CRM navigation
│   │   ├── TimeNav.tsx     # Time tracking navigation
│   │   ├── ProjectNav.tsx  # Project management navigation
│   │   ├── SuiteNav.tsx    # Main navigation
│   │   ├── RoleGuard.tsx   # Access control component
│   │   └── LocaleSwitcherClient.tsx
│   ├── lib/                # Utility functions and hooks
│   │   ├── locale.tsx      # Internationalization
│   │   └── user.tsx        # User management
│   ├── crm/                # CRM module
│   │   ├── clients/        # Client management
│   │   ├── reports/        # CRM reports
│   │   └── page.tsx        # CRM dashboard
│   ├── time-tracking/      # Time tracking module
│   │   ├── hours/          # Hours management
│   │   └── page.tsx        # Time tracking overview
│   ├── projects/           # Project management module (Full Suite)
│   │   ├── [id]/           # Individual project pages
│   │   │   ├── edit/       # Edit project
│   │   │   ├── team/       # Team management
│   │   │   └── page.tsx    # Project details
│   │   ├── create/         # Create new project
│   │   ├── reports/        # Project reports & analytics
│   │   ├── templates/      # Project templates
│   │   └── page.tsx        # Projects overview
│   ├── settings/           # Application settings
│   │   ├── company/        # Company settings
│   │   ├── users/          # User management
│   │   ├── billing/        # Billing and subscriptions
│   │   └── page.tsx        # Settings overview
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Landing page
│   └── globals.css         # Global styles
```

## 👥 User Roles

- **Admin**: Full access to all features including project management
- **Manager**: Access to CRM, time tracking, and project management
- **Employee**: Time tracking input, personal data viewing, and assigned project access

## 🌐 Internationalization

The application supports multiple languages:
- English (en)
- Finnish (fi)

Language switching is available in the header navigation.

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deploy on Vercel
The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

## 📝 Development Notes

- The application uses Next.js App Router for modern routing
- Client components are marked with `'use client'` directive
- Role-based access is implemented with a `RoleGuard` component
- Demo user data is provided for testing (employee role by default)

## 📞 Support & Contact

- **Email**: support@worksuite.com
- **Documentation**: Available in-app and via help center
- **Beta Testing**: Join our beta program for early access and special pricing

## 🔒 License

This is a proprietary software product. All rights reserved.

## 📋 Development Roadmap

### ✅ Completed Features
- [x] **Supabase Integration**: Full database setup with RLS policies
- [x] **Authentication System**: Multi-organization user management
- [x] **CRM Module**: Complete client management, tasks, contracts, reports
- [x] **Time Tracking Module**: Precise tracking, approval workflows, analytics
- [x] **Project Management Module**: Full project lifecycle management
- [x] **Role-Based Access Control**: Admin, manager, employee permissions
- [x] **Modern UI/UX**: Responsive design with dark mode support

### 🔥 Priority 1: Monetization (2-3 weeks)
- [ ] **Stripe Integration**
  - [ ] Set up Stripe account and API keys
  - [ ] Create subscription plans (CRM $49, Time $39, Projects $39, 2-Modules $75, Full Suite $99)
  - [ ] Implement Stripe Checkout for subscription management
  - [ ] Add webhook handling for subscription events
  - [ ] Create billing dashboard for users
  - [ ] Implement per-seat pricing ($10/additional user)

- [ ] **Complete App Settings**
  - [ ] Build billing & subscription management page
  - [ ] Enhance company settings and user management
  - [ ] Add notification preferences
  - [ ] Implement data export/import functionality

- [ ] **Enhanced Access Control**
  - [ ] Subscription-based feature gating
  - [ ] Usage limit enforcement (max users, projects, etc.)
  - [ ] Admin panel for cross-organization management

### 🎯 Priority 2: Project Enhancements (1-2 weeks)
- [ ] **Complete Project Templates**
  - [ ] Build template creation & management interface
  - [ ] Add pre-built templates (web dev, marketing, consulting)
  - [ ] Implement template customization with team structures
  - [ ] Add template sharing across organization

- [ ] **Advanced Project Features**
  - [ ] Project dependencies and critical path
  - [ ] Resource allocation and capacity planning
  - [ ] Enhanced budget tracking with alerts
  - [ ] Deep time tracking integration

### 💼 Priority 3: Business Features (1-2 weeks)
- [ ] **Advanced Reporting & Analytics**
  - [ ] Cross-module analytics (CRM + Time + Projects)
  - [ ] Revenue tracking across all modules
  - [ ] Profitability analysis per project/client
  - [ ] Scheduled report delivery

- [ ] **Integration & Automation**
  - [ ] Calendar integration (Google Calendar, Outlook)
  - [ ] Email notifications for important events
  - [ ] API endpoints for third-party integrations
  - [ ] Webhook system for external services

### 🔒 Priority 4: Security & Polish (1 week)
- [ ] **Enhanced Security**
  - [ ] Email verification and password reset
  - [ ] Two-factor authentication (2FA)
  - [ ] Audit logging for all actions
  - [ ] Data backup & recovery procedures

- [ ] **Final Polish**
  - [ ] Performance optimization
  - [ ] Comprehensive testing
  - [ ] Documentation completion
  - [ ] Launch preparation

## 🚀 Launch Timeline

### Phase 1: Beta Launch (Month 1-2)
- Launch with 1-2 beta customers
- Gather feedback and iterate
- Build case studies and testimonials

### Phase 2: Soft Launch (Month 3-4)
- Limited public launch
- Content marketing and SEO
- Refine based on user feedback

### Phase 3: Full Launch (Month 5-6)
- Public launch with full marketing
- Paid advertising campaigns
- Partnership development

## 📊 Current Status

**Overall Progress**: ~85% complete
- ✅ Core functionality: 100% complete
- ✅ UI/UX: 95% complete
- ❌ Monetization: 0% complete (Priority 1)
- ❌ Advanced features: 20% complete
- ❌ Security enhancements: 30% complete

**Estimated Time to MVP**: 6-8 weeks with focused development
