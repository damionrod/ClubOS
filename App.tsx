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
import { Applications } from '@/pages/admin/Applications';
import { CustomFields } from '@/pages/admin/CustomFields';
import { TeamsPage } from '@/pages/admin/TeamsPage';
import { ComingSoon } from '@/pages/admin/ComingSoon';
import { MemberDashboard } from '@/pages/member/MemberDashboard';
import { PlatformDashboard } from '@/pages/platform/PlatformDashboard';
import type { ReactNode } from 'react';

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
  const { orgMemberships } = useAuth();
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
  return <AdminLayout>{children}</AdminLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Admin Portal */}
      <Route path="/admin" element={<ProtectedRoute><PermissionLoader><AdminRoute><AdminDashboard /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/members" element={<ProtectedRoute><PermissionLoader><AdminRoute><MemberRegister /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/members/:id" element={<ProtectedRoute><PermissionLoader><AdminRoute><MemberDetail /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/members/new" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Add Member" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/applications" element={<ProtectedRoute><PermissionLoader><AdminRoute><Applications /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/membership-types" element={<ProtectedRoute><PermissionLoader><AdminRoute><MembershipTypes /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/custom-fields" element={<ProtectedRoute><PermissionLoader><AdminRoute><CustomFields /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/teams" element={<ProtectedRoute><PermissionLoader><AdminRoute><TeamsPage /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/sports" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Sports" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/finance" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Finance Dashboard" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/finance/transactions" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Transactions" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/events" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Events" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/events/checkin" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Event Check-in" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/communications" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Communications" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/communications/send" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Send Email" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/communications/history" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Communication History" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/governance" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Governance Dashboard" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/governance/committee" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Committee" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/governance/motions" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Motions" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/documents" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Documents" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/merchandise" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Merchandise" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/donations" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Donations" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/contacts" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Organisations & Contacts" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/contracts" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Contracts" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/tasks" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Tasks & Compliance" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/privacy" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Privacy & Data Governance" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/compliance" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Regulatory Compliance" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Reports & Analytics" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Club Details" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings/branding" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Branding" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings/users" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Users" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings/roles" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Roles" /></AdminRoute></PermissionLoader></ProtectedRoute>} />
      <Route path="/admin/settings/modules" element={<ProtectedRoute><PermissionLoader><AdminRoute><ComingSoon title="Modules" /></AdminRoute></PermissionLoader></ProtectedRoute>} />

      {/* Member Portal */}
      <Route path="/member" element={<ProtectedRoute><MemberLayout><MemberDashboard /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/membership" element={<ProtectedRoute><MemberLayout><ComingSoon title="My Membership" /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/events" element={<ProtectedRoute><MemberLayout><ComingSoon title="Events" /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/payments" element={<ProtectedRoute><MemberLayout><ComingSoon title="Payments" /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/more" element={<ProtectedRoute><MemberLayout><ComingSoon title="More" /></MemberLayout></ProtectedRoute>} />
      <Route path="/member/profile" element={<ProtectedRoute><MemberLayout><ComingSoon title="My Profile" /></MemberLayout></ProtectedRoute>} />

      {/* Platform Admin Portal */}
      <Route path="/platform-admin" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><PlatformDashboard /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/organisations" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Organisations" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/plans" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Subscription Plans" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/modules" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Modules & Add-ons" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/subscriptions" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Subscriptions" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/billing" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Platform Billing" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/usage" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Platform Usage" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/support" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Support" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/privacy" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Privacy & Compliance" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/users" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Platform Users" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/monitoring" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="System Monitoring" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/reports" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Reports" /></PlatformLayout></ProtectedRoute>} />
      <Route path="/platform-admin/settings" element={<ProtectedRoute requirePlatformAdmin><PlatformLayout><ComingSoon title="Platform Settings" /></PlatformLayout></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
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
