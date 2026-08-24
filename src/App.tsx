import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PermissionLoader } from '@/components/PermissionLoader';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { MemberLayout } from '@/components/layouts/MemberLayout';
import { PlatformLayout } from '@/components/layouts/PlatformLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { MemberRegister } from '@/pages/admin/MemberRegister';
import { MemberDetail } from '@/pages/admin/MemberDetail';
import { MembershipTypes } from '@/pages/admin/MembershipTypes';
import { SubscriptionTypes } from '@/pages/admin/SubscriptionTypes';
import { Applications } from '@/pages/admin/Applications';
import { CustomFields } from '@/pages/admin/CustomFields';
import { TeamsPage } from '@/pages/admin/TeamsPage';
import { SportsPage } from '@/pages/admin/SportsPage';
import { AddMember } from '@/pages/admin/AddMember';
import { MemberImport } from '@/pages/admin/MemberImport';
import { RolesStructure } from '@/pages/admin/RolesStructure';
import { PaymentFeeSettings } from '@/pages/admin/PaymentFeeSettings';
import { IncomeByCategoryReport } from '@/pages/admin/IncomeByCategoryReport';
import { BrandingSettings } from '@/pages/admin/BrandingSettings';
import { OrganisationSettings } from '@/pages/admin/OrganisationSettings';
import { EventsPage } from '@/pages/admin/EventsPage';
import { MerchandisePage } from '@/pages/admin/MerchandisePage';
import { EventCheckin } from '@/pages/admin/EventCheckin';
import { MemberEvents } from '@/pages/member/MemberEvents';
import { MemberDashboard } from '@/pages/member/MemberDashboard';
import { PlatformDashboard } from '@/pages/platform/PlatformDashboard';
import { DemoModulePage } from '@/pages/admin/DemoModules';
import { PlatformDemoPage } from '@/pages/platform/PlatformDemoPages';
import { PlatformOrganisations } from '@/pages/platform/PlatformOrganisations';
import { PlatformFeeSettings } from '@/pages/platform/PlatformFeeSettings';
import { MemberMembership, MemberMore } from '@/pages/member/MemberDemoPages';
import { MemberPayments } from '@/pages/member/MemberPayments';
import { MemberDonations } from '@/pages/member/MemberDonations';
import { MemberProfile as EditableMemberProfile } from '@/pages/member/MemberProfile';
import { MemberVoting } from '@/pages/member/MemberVoting';
import { MotionsPage } from '@/pages/admin/MotionsPage';
import { AwardsRecognition } from '@/pages/admin/AwardsRecognition';
import { MemberNews } from '@/pages/member/MemberNews';
import { MemberMerchandise } from '@/pages/member/MemberMerchandise';
import { PublicEvent } from '@/pages/public/PublicEvent';
import type { ReactNode } from 'react';
import { ToastHost } from '@/components/ToastHost';

function ProtectedRoute({ children, requirePlatformAdmin = false }: { children: ReactNode; requirePlatformAdmin?: boolean }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-700" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requirePlatformAdmin && !profile?.is_platform_admin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { orgMemberships, activeRole, isActiveOwner } = useAuth();

  if (orgMemberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="card max-w-md p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No Organisation Access</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your account is not linked to any organisation. Please contact your club administrator to be invited.
          </p>
        </div>
      </div>
    );
  }

  // A normal Member role never receives the Admin Portal simply because they
  // have an organisation link. Pending and active members use /member.
  if (!isActiveOwner && activeRole?.name?.trim().toLowerCase() === 'member') {
    return <Navigate to="/member" replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function AppRoutes() {
  return (
    <>
    <ToastHost />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/events/:slug" element={<PublicEvent />} />

      {/* Admin Portal */}
      <Route path="/admin" element={<ProtectedRoute><PermissionLoader><AdminRoute><AdminDashboard /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/members" element={<ProtectedRoute><PermissionLoader><AdminRoute><MemberRegister /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/members/:id" element={<ProtectedRoute><PermissionLoader><AdminRoute><MemberDetail /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/members/new" element={<ProtectedRoute><PermissionLoader><AdminRoute><AddMember /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/members/import" element={<ProtectedRoute><PermissionLoader><AdminRoute><MemberImport /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/applications" element={<ProtectedRoute><PermissionLoader><AdminRoute><Applications /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/subscription-types" element={<ProtectedRoute><PermissionLoader><AdminRoute><SubscriptionTypes /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/membership-types" element={<ProtectedRoute><PermissionLoader><AdminRoute><MembershipTypes /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/custom-fields" element={<ProtectedRoute><PermissionLoader><AdminRoute><CustomFields /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/teams" element={<ProtectedRoute><PermissionLoader><AdminRoute><TeamsPage /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/sports" element={<ProtectedRoute><PermissionLoader><AdminRoute><SportsPage /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/finance" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="finance" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/finance/transactions" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="transactions" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/finance/fees" element={<ProtectedRoute><PermissionLoader><AdminRoute><PaymentFeeSettings /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/reports/income-by-category" element={<ProtectedRoute><PermissionLoader><AdminRoute><IncomeByCategoryReport /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/events" element={<ProtectedRoute><PermissionLoader><AdminRoute><EventsPage /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/events/checkin" element={<ProtectedRoute><PermissionLoader><AdminRoute><EventCheckin /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/communications" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="communications" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/communications/send" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="send" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/communications/history" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="history" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/governance" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="governance" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/governance/committee" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="committee" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/governance/motions" element={<ProtectedRoute><PermissionLoader><AdminRoute><MotionsPage /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/governance/awards" element={<ProtectedRoute><PermissionLoader><AdminRoute><AwardsRecognition /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/documents" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="documents" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/merchandise" element={<ProtectedRoute><PermissionLoader><AdminRoute><MerchandisePage /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/donations" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="donations" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/contacts" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="contacts" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/contracts" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="contracts" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/tasks" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="tasks" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/privacy" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="privacy" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/compliance" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="compliance" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="reports" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><PermissionLoader><AdminRoute><OrganisationSettings /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings/branding" element={<ProtectedRoute><PermissionLoader><AdminRoute><BrandingSettings /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings/users" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="users" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings/roles" element={<ProtectedRoute><PermissionLoader><AdminRoute><RolesStructure /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings/modules" element={<ProtectedRoute><PermissionLoader><AdminRoute><DemoModulePage kind="modules" /></AdminRoute></PermissionLoader></ProtectedRoute>} />

      {/* Member Portal */}
      <Route path="/member" element={<ProtectedRoute><MemberLayout><MemberDashboard /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/membership" element={<ProtectedRoute><MemberLayout><MemberMembership /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/events" element={<ProtectedRoute><MemberLayout><MemberEvents /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/payments" element={<ProtectedRoute><MemberLayout><MemberPayments /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/more" element={<ProtectedRoute><MemberLayout><MemberMore /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/profile" element={<ProtectedRoute><MemberLayout><EditableMemberProfile /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/voting" element={<ProtectedRoute><MemberLayout><MemberVoting /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/news" element={<ProtectedRoute><MemberLayout><MemberNews /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/merchandise" element={<ProtectedRoute><MemberLayout><MemberMerchandise /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/donations" element={<ProtectedRoute><MemberLayout><MemberDonations /></MemberLayout></ProtectedRoute>} />

      {/* Platform Admin Portal */}
      <Route path="/platform-admin" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDashboard /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/organisations" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformOrganisations /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/plans" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="plans" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/modules" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="modules" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/subscriptions" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="subscriptions" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/billing" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="billing" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/transaction-fees" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformFeeSettings /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/usage" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="usage" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/support" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="support" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/privacy" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="privacy" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/users" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="users" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/monitoring" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="monitoring" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/reports" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="reports" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/settings" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDemoPage kind="settings" /></PlatformLayout></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
