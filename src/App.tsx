
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CollageProvider } from "./context/CollageContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import RouteTracker from "./RouteTracker";
import StructuredData from "./components/seo/StructuredData";
import PerformanceOptimizer from "./components/seo/PerformanceOptimizer";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
// import CreateGroup from "./pages/CreateGroup";
import AdminOrders from "./pages/AdminOrders";
import GridBoard from "./components/GridBoard";
import JoinGroup from "./pages/JoinGroup";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CollegeDashboard from "./pages/CollegeDashboard";
import Editor from "./pages/Editor";
import Checkout from "./pages/Checkout";
import Success from "./pages/success";
import NotFound from "./pages/NotFound";
import { GoogleAuthCallback } from "./pages/GoogleAuthCallback";
import AmbassadorSignup from "./pages/AmbassadorSignup";
import AmbassadorDashboard from "./pages/AmbassadorDashboard";
import AmbassadorAdmin from "./pages/AmbassadorAdmin";
import AmbassadorDetails from "./pages/AmbassadorDetails";
import ReferralRedirect from "./pages/ReferralRedirect";
import ManageGroupsAmbassadorLed from "./pages/ManageGroupsAmbassadorLed";
import ManageGroupsDirect from "./pages/ManageGroupsDirect";
import ManageGroupsGroupMembers from "./pages/ManageGroupsGroupMembers";
import HowItWorks from "./pages/HowItWorks";
import TermsOfService from "./pages/TermsOfService";
import HelpCenter from "./pages/HelpCenter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RenderBootstrap from "./pages/RenderBootstrap";
import RenderCanvas from "./pages/RenderCanvas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CollageProvider>
          <StructuredData />
          <PerformanceOptimizer />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteTracker />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/google/success" element={<GoogleAuthCallback />} />
              <Route path="/create-group" element={
                <ProtectedRoute>
                  <GridBoard />
                </ProtectedRoute>
              } />
              <Route path="/join/:groupId" element={
                // <ProtectedRoute>
                <JoinGroup />
                // </ProtectedRoute>
              } />
              <Route path="/success" element={<Success />} />
              {/* Legacy routes without groupId - redirect to group selection */}
              <Route path="/dashboard" element={
                <ProtectedRoute requiresLeader>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/editor" element={
                <ProtectedRoute requiresLeader>
                  <Editor />
                </ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute requiresLeader>
                  <Checkout />
                </ProtectedRoute>
              } />

              {/* New groupId-based routes */}
              <Route path="/dashboard/:groupId" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/editor/:groupId" element={
                <ProtectedRoute>
                  <Editor />
                </ProtectedRoute>
              } />
              <Route path="/checkout/:groupId" element={
                <ProtectedRoute requiresLeader>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiresAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/colleges"
                element={
                  <ProtectedRoute requiresAdmin>
                    <CollegeDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin/order" element={
                <ProtectedRoute requiresAdmin>
                  <AdminOrders />
                </ProtectedRoute>
              } />
              <Route path="/ambassador/signup" element={<AmbassadorSignup />} />
              <Route path="/ambassador/:ambassadorId" element={<AmbassadorDashboard />} />
              <Route
                path="/admin/ambassadors"
                element={
                  <ProtectedRoute requiresAdmin>
                    <AmbassadorAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ambassadors/:ambassadorId"
                element={
                  <ProtectedRoute requiresAdmin>
                    <AmbassadorDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/manage-groups/ambassador-led"
                element={
                  <ProtectedRoute requiresAdmin>
                    <ManageGroupsAmbassadorLed />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/manage-groups/direct"
                element={
                  <ProtectedRoute requiresAdmin>
                    <ManageGroupsDirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/manage-groups/group/:groupId"
                element={
                  <ProtectedRoute requiresAdmin>
                    <ManageGroupsGroupMembers />
                  </ProtectedRoute>
                }
              />
              <Route path="/ref/:referralCode" element={<ReferralRedirect />} />
              {/* Render pages for server-side Puppeteer (no auth - token in URL) */}
              <Route path="/render/bootstrap/:orderId" element={<RenderBootstrap />} />
              <Route path="/render/canvas/:orderId/:variantId" element={<RenderCanvas />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CollageProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
