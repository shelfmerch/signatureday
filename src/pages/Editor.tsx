import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Users, Eye, Send, CreditCard, ChevronLeft, ChevronRight, RefreshCw, Truck, MapPin, Phone, Mail, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GridPreview } from "@/components/GridPreview";
import { Suspense } from "react";
import { toast } from "sonner";
import { GridTemplate, Member, Group as CollageGroup } from "@/context/CollageContext";
import { useCollage } from "@/context/CollageContext";
import { useAuth } from "@/context/AuthContext";
import { GridProvider } from "@/components/square/context/GridContext";
import { userApi, ordersApi, paymentsApi } from "@/lib/api";
import { generateInvoicePdfBase64 } from "@/lib/invoice";
import type { Order, AdminMember } from "@/types/admin";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserWalkthrough, { Step } from '@/components/UserWalkthrough';
import { getAvailableTemplates, getInitialTemplateIndex } from '@/lib/templateUtils';

// Background doodle component
const BackgroundDoodle = () => (
  <div className="absolute inset-0 -z-10">
    <div
      className="absolute inset-0 bg-[url('/images/background-doodle-image.png')] bg-repeat opacity-[0.5]"
      style={{ backgroundSize: '400px' }}
    />
    <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-yellow-50/50 backdrop-blur-[1px]" />
  </div>
);


const Editor = () => {
  const { groupId } = useParams<{ groupId?: string }>();
  const { getGroup, isLoading, groups, updateGroup, updateGroupTemplate } = useCollage();
  const { user, updateUser, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<CollageGroup | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [showCurrentMembers, setShowCurrentMembers] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isCheckoutUpdating, setIsCheckoutUpdating] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [isProcessingBulkPayment, setIsProcessingBulkPayment] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState<string | null>(null);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });

  // Update shipping info when user changes
  useEffect(() => {
    if (user) {
      setShippingInfo(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  const [userGroupsCount, setUserGroupsCount] = useState<number | null>(null);

  // Fetch user groups to determine if this is their first/only group
  useEffect(() => {
    const checkUserGroups = async () => {
      if (!user?.id) return;
      try {
        const res = await userApi.getUserGroups(user.id);
        setUserGroupsCount(res.items?.length || 0);
      } catch (err) {
        console.warn('Failed to load user groups count:', err);
      }
    };
    checkUserGroups();
  }, [user?.id]);

  // Helper functions for group storage
  const saveLastActiveGroup = (groupId: string) => {
    localStorage.setItem('lastActiveGroupId', groupId);
  };

  const getLastActiveGroup = (): string | null => {
    return localStorage.getItem('lastActiveGroupId');
  };

  // Handle route redirection for legacy routes without groupId
  useEffect(() => {
    // If no groupId in URL params, redirect to appropriate group
    if (!groupId) {
      // First try user's current groupId
      if (user?.groupId) {
        navigate(`/editor/${user.groupId}`, { replace: true });
        return;
      }

      // Then try last active group from localStorage
      const lastActive = getLastActiveGroup();
      if (lastActive) {
        navigate(`/editor/${lastActive}`, { replace: true });
        return;
      }

      // Otherwise redirect to dashboard
      navigate('/dashboard');
    }
  }, [groupId, user?.groupId, navigate]);

  // Editor Guide Logic
  const tourStorageKey = user?.id ? `editor_tour_completed_${user.id}` : 'editor_tour_anonymous';
  const [showTour, setShowTour] = useState(false);
  const tourInitialized = useRef(false);

  // Determine if tour should start - run once when data is ready
  useEffect(() => {
    if (isAuthLoading || !user?.id || tourInitialized.current) return;

    // Safety check: wait for group data if we're theoretically in "tour" mode
    if (!group) return;

    const shouldShow = sessionStorage.getItem('showEditorTour') === 'true';
    const hasSeenTour = user?.guidesSeen?.editor;

    if (shouldShow && !hasSeenTour) {
      setShowTour(true);
      sessionStorage.removeItem('showEditorTour');
    }
    tourInitialized.current = true;
  }, [isAuthLoading, user?.id, user?.guidesSeen?.editor, group]);

  // Template switching hooks MUST run before any early returns (Rules of Hooks)
  const displayMemberCountForTemplates = group
    ? (showCurrentMembers ? group.members.length : group.totalMembers)
    : 0;
  const winningTemplateForTemplates = group
    ? ((group.votes?.square ?? 0) >= (group.votes?.hexagonal ?? 0) ? 'square' : 'hexagonal')
    : 'square';
  const availableTemplates = useMemo(
    () => getAvailableTemplates(displayMemberCountForTemplates),
    [displayMemberCountForTemplates]
  );
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0);
  useEffect(() => {
    setCurrentTemplateIndex((prev) => {
      if (prev >= availableTemplates.length) {
        return getInitialTemplateIndex(availableTemplates, winningTemplateForTemplates);
      }
      return prev;
    });
  }, [availableTemplates, winningTemplateForTemplates]);
  const displayTemplate = availableTemplates[Math.min(currentTemplateIndex, Math.max(0, availableTemplates.length - 1))]?.type ?? winningTemplateForTemplates;
  const handlePrevTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (availableTemplates.length <= 1) return;
    setCurrentTemplateIndex((i) => (i - 1 + availableTemplates.length) % availableTemplates.length);
  };
  const handleNextTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (availableTemplates.length <= 1) return;
    setCurrentTemplateIndex((i) => (i + 1) % availableTemplates.length);
  };

  const guideSteps: Step[] = useMemo(() => {
    const memberCount = group?.members?.length || 0;
    const totalMembers = group?.totalMembers || 0;
    return [
      {
        targetId: "guide-view-toggle",
        title: "Viewing Expected Grid",
        description: "Switch between viewing the current grid (with joined members) and the expected grid (full capacity). Perfect for planning!"
      },
      {
        targetId: "guide-checkout-button",
        title: memberCount === 0 ? "Checkout (Members Required)" : "Ready to Checkout?",
        description: memberCount === 0
          ? "You cannot proceed to payment until you have at least one member. Share your group link to invite friends!"
          : `Click here to proceed with payment. You have ${memberCount} member${memberCount > 1 ? 's' : ''} ready!`
      }
    ];
  }, [group?.members?.length, group?.totalMembers]);

  // Update group data whenever groupId changes
  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) {
        setLoadingGroup(false);
        return;
      }

      try {
        setLoadingGroup(true);
        const fetchedGroup = await getGroup(groupId);
        if (fetchedGroup) {
          setGroup(fetchedGroup);
          saveLastActiveGroup(groupId); // Save as last active group
        } else {
          toast.error('Group not found');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('Failed to load group data');
        navigate('/dashboard');
      } finally {
        setLoadingGroup(false);
      }
    };

    fetchGroup();
  }, [groupId, getGroup, navigate]);

  const loadRazorpayScript = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (document.getElementById('razorpay-sdk')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleBulkPayment = async () => {
    if (!group || !groupId) return;
    const unpaidMembers = group.members.filter((m: Member) => !m.paidDeposit);

    // Always open shipping modal first for group payment/checkout
    setShippingModalOpen(true);
  };

  const processBulkPaymentWithShipping = async () => {
    if (!group || !groupId) return;

    // Validate shipping info
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.line1 || !shippingInfo.city || !shippingInfo.postalCode) {
      toast.error('Please fill in all required shipping details');
      return;
    }

    const unpaidMembers = group.members.filter((m: Member) => !m.paidDeposit);

    setIsProcessingBulkPayment(true);
    toast.info('Initializing payment...');
    try {
      console.log('Starting bulk payment process...');
      const scriptLoaded = await loadRazorpayScript();
      console.log('Razorpay script loaded:', scriptLoaded);
      if (!scriptLoaded) throw new Error('Failed to load Razorpay SDK');

      toast.info('Creating order...');
      console.log('Creating Razorpay order...');

      const itemsAmount = unpaidMembers.length * (group.pricePerMember || 189);
      const totalAmount = itemsAmount;
      const amountPaise = Math.round(totalAmount * 100);

      const order = await paymentsApi.createOrder(
        amountPaise,
        `b_${groupId.slice(-12)}_${Date.now()}`,
        {
          groupId,
          type: 'bulk_payment',
          shipping: shippingInfo
        }
      );

      console.log('Order created:', order);
      toast.info('Fetching payment key...');
      const { keyId } = await paymentsApi.getKey();
      console.log('Key fetched:', !!keyId);

      const options = {
        key: keyId,
        amount: order.amount,
        currency: 'INR',
        name: 'Signature Day',
        description: `Group Payment: ${group.name} (${unpaidMembers.length} members + Shipping)`,
        order_id: order.id,
        prefill: {
          name: shippingInfo.name,
          email: shippingInfo.email,
          contact: shippingInfo.phone
        },
        handler: async (response: any) => {
          try {
            toast.info('Verifying payment and generating invoice...');

            // Generate invoice PDF
            const invoiceFileName = `Invoice-${Date.now()}.pdf`;
            const invoicePdfBase64 = await generateInvoicePdfBase64(
              {
                name: 'CHITLU INNOVATIONS PRIVATE LIMITED',
                address: 'G2, Win Win Towers, Siddhi Vinayaka Nagar, Madhapur, Hyderabad, Telangana – 500081, India',
                gstin: '36AAHCC5155C1ZW',
                cin: 'U74999TG2018PTC123754',
                email: 'support@signatureday.com',
                logoUrl: '/images/shelf-merch-logo.webp',
              },
              {
                invoiceId: `INV-${Date.now()}`,
                orderId: order.id,
                dateISO: new Date().toISOString(),
                customerName: shippingInfo.name,
                customerEmail: shippingInfo.email,
                billingAddress: `${shippingInfo.line1}, ${shippingInfo.line2 ? shippingInfo.line2 + ', ' : ''}${shippingInfo.city}, ${shippingInfo.state} - ${shippingInfo.postalCode}`,
                shipping: 0,
                shippingGst: 0,
              },
              unpaidMembers.map(m => ({
                description: `Signature Day Member - ${m.name}`,
                hsn: '6109',
                quantity: 1,
                unitPrice: !!group.ambassadorId ? 119 : 149,
                printPrice: !!group.ambassadorId ? 30 : 40,
                taxRate: 0,
              }))
            );

            const verifyRes = await paymentsApi.verifyBulk({
              ...response,
              groupId,
              unpaidMemberRolls: unpaidMembers.map((m: Member) => m.memberRollNumber),
              shipping: shippingInfo,
              invoicePdfBase64,
              invoiceFileName
            });

            if (!verifyRes.success) throw new Error(verifyRes.message || 'Payment verification failed');
            toast.success('Payment successful! Order has been placed.');
            setShippingModalOpen(false);

            // Navigate to success page
            navigate(`/success?groupId=${group.id}`);
          } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Failed to verify payment');
          } finally {
            setIsProcessingBulkPayment(false);
          }
        },
        modal: { ondismiss: () => setIsProcessingBulkPayment(false) },
        theme: { color: '#6d28d9' }
      };

      console.log('Initializing Razorpay with options:', { ...options, key: 'HIDDEN' });
      const rzp = new (window as any).Razorpay(options);
      console.log('Razorpay instance created, opening modal...');

      // Close shipping modal before opening Razorpay to prevent Radix UI pointer-events interference
      setShippingModalOpen(false);

      rzp.open();
      toast.info('Razorpay modal opening...');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Payment failed');
      setIsProcessingBulkPayment(false);
    }
  };

  const handleSendPaymentLink = async (member: Member) => {
    if (!groupId) return;

    // Construct the link for clipboard
    const paymentLink = `${window.location.origin}/pay-member/${groupId}/${member.memberRollNumber}`;

    // Always copy to clipboard first as immediate feedback
    try {
      await navigator.clipboard.writeText(paymentLink);
      toast.success('Payment link copied to clipboard!');
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }

    // Then try to send email if member has one
    if (member.email) {
      setIsSendingLink(member.memberRollNumber);
      try {
        await paymentsApi.sendMemberLink(groupId, member.memberRollNumber);
        toast.success(`Payment link also emailed to ${member.email}`);
      } catch (err) {
        console.error('Email send error:', err);
        // Don't show error if email is missing or fails, since it's already copied
        // but we'll log it for debugging
      } finally {
        setIsSendingLink(null);
      }
    } else {
      toast.info('Note: This member has no email address. Please share the copied link manually.');
    }
  };
  const handleGuideFinish = async () => {
    // 1. Immediate Persistence
    localStorage.setItem(tourStorageKey, 'true');
    setShowTour(false);

    // 2. Persist to Backend (Background)
    if (user) {
      try {
        await updateUser({
          guidesSeen: {
            ...user.guidesSeen,
            editor: true,
            dashboard: true // If they've seen editor, they've likely bypassed dash or seen it
          }
        });
      } catch (e) {
        console.error('Failed to persist editor tour status', e);
      }
    }
  };

  // Define Walkthrough Element
  const walkthroughElement = useMemo(() => (
    <UserWalkthrough
      steps={guideSteps}
      storageKey={tourStorageKey}
      onFinish={handleGuideFinish}
      onCancel={handleGuideFinish}
      forceStart={false}
      run={showTour}
    />
  ), [guideSteps, tourStorageKey, showTour]);

  // Show loading state while context is initializing or group is loading
  if (isLoading || loadingGroup) {
    return (
      <>
        {walkthroughElement}
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center p-4 animate-fadeIn">
          <Card className="w-full max-w-md text-center animate-slideUp">
            <CardContent className="pt-6">
              <div className="w-12 h-12 border-4 border-t-purple-600 border-purple-200 rounded-full animate-spin mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4 animate-pulse">Loading...</h1>
              <p className="text-gray-600">{loadingGroup ? "Loading group data..." : "Initializing application..."}</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!group) {
    return (
      <>{walkthroughElement}
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center p-4 animate-fadeIn">
          <Card className="w-full max-w-md text-center animate-slideUp">
            <CardContent className="pt-6">
              <div className="w-12 h-12 border-4 border-t-red-600 border-red-200 rounded-full animate-spin mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Group Not Found</h1>
              <p className="text-gray-600 mb-4">The group you're looking for doesn't exist or has been removed.</p>
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const getWinningTemplate = (votes: { square?: number; hexagonal?: number }, layoutMode?: string) => {
    // If the leader has finalized a layout, use it directly
    if (layoutMode === 'square' || layoutMode === 'hexagonal') {
      return layoutMode;
    }
    // Otherwise fall back to vote count
    const square = votes?.square ?? 0;
    const hexagonal = votes?.hexagonal ?? 0;
    return square >= hexagonal ? 'square' : 'hexagonal';
  };

  const handleShare = () => {
    const shareLink = `${window.location.origin}/join/${group.id}`;
    navigator.clipboard.writeText(shareLink);
    toast.success("Share link copied to clipboard!");
  };

  const handleCheckout = async () => {
    if (!group || !user) return;

    const current = group.members.length;
    const expected = group.totalMembers;

    if (current === 0) {
      toast.error('No members have joined yet. Share the link to start collecting photos.');
      return;
    }

    const unpaidMembers = group.members.filter((m: Member) => !m.paidDeposit);

    // If unpaid members exist, they MUST pay before placing final order
    if (unpaidMembers.length > 0) {
      handleBulkPayment();
      return;
    }

    // If it's a direct checkout (already paid), just open shipping modal
    setShippingModalOpen(true);
  };

  const createOrderDirectly = async () => {
    if (!group || !user) return;

    // Validate shipping info if we're here
    if (!shippingInfo.line1 || !shippingInfo.city || !shippingInfo.postalCode) {
      toast.error('Please fill in shipping details');
      setShippingModalOpen(true);
      return;
    }

    setIsProcessingOrder(true);

    try {
      // Calculate pricing breakdown
      const hasAmbassador = !!(group.ambassadorId && group.ambassadorId !== null && group.ambassadorId !== undefined && String(group.ambassadorId).trim() !== '');
      const tshirtPrice = hasAmbassador ? 119 : 149;
      const printPrice = hasAmbassador ? 30 : 40;
      const gstRate = 0;
      const perItemTotal = hasAmbassador ? 149 : 189;
      const quantity = group.members.length;

      const itemsTotal = perItemTotal * quantity;
      const shipping = 0;
      const shippingGst = 0;
      const finalTotal = 0;

      // Get winning template
      const winningTemplate = getWinningTemplate(group.votes, group.layoutMode);

      // Prepare members data
      const members: AdminMember[] = group.members.map(m => ({
        id: m.id,
        name: m.name,
        memberRollNumber: m.memberRollNumber,
        photo: m.photo,
        vote: (m.vote === 'any' ? winningTemplate : m.vote) as "square" | "hexagonal",
        joinedAt: m.joinedAt.toISOString(),
        size: m.size,
        phone: m.phone,
      }));

      // Generate invoice
      const invoiceFileName = `Invoice-${Date.now()}.pdf`;
      const invoiceBase64 = await generateInvoicePdfBase64(
        {
          name: 'CHITLU INNOVATIONS PRIVATE LIMITED',
          address: 'G2, Win Win Towers, Siddhi Vinayaka Nagar, Madhapur, Hyderabad, Telangana – 500081, India',
          gstin: '36AAHCC5155C1ZW',
          cin: 'U74999TG2018PTC123754',
          email: 'support@signatureday.com',
          logoUrl: '/images/shelf-merch-logo.webp',
        },
        {
          invoiceId: `INV-${Date.now()}`,
          orderId: `ORD-${Date.now()}`,
          dateISO: new Date().toISOString(),
          customerName: shippingInfo.name || user.name || 'Customer',
          customerEmail: shippingInfo.email || user.email || '',
          billingAddress: `${shippingInfo.line1}, ${shippingInfo.line2 ? shippingInfo.line2 + ', ' : ''}${shippingInfo.city}, ${shippingInfo.state} - ${shippingInfo.postalCode}`,
          shipping: shipping,
          shippingGst: shippingGst,
        },
        [] // Empty items array since items were already paid during join
      );

      // Create order
      const newOrder: Order = {
        id: `ORD-${Date.now()}`,
        layoutMode: winningTemplate,
        status: 'new',
        paid: true,
        paymentId: `DIRECT-${Date.now()}`,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: `${group.name} • ${group.yearOfPassing}`,
        gridTemplate: winningTemplate as Order['gridTemplate'],
        members,
        shipping: shippingInfo,
        settings: {
          widthPx: 2550,
          heightPx: 3300,
          keepAspect: true,
          gapPx: 4,
          cellScale: 1.0,
          dpi: 300,
        },
      };

      // Create order with invoice and groupId
      await ordersApi.createOrderDirect({
        ...newOrder,
        groupId: group.id, // Include groupId for reward allocation
      }, invoiceBase64, invoiceFileName);

      toast.success('Order placed successfully!');

      // Navigate to success page
      navigate(`/success?groupId=${group.id}`);
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error(error.message || 'Failed to create order. Please try again.');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const proceedWithCurrentTemplate = async () => {
    if (!group) return;

    const current = group.members.length;
    const targetGroupId = groupId || group.id;

    if (!targetGroupId) return;

    setIsCheckoutUpdating(true);
    try {
      await updateGroup(group.id, { totalMembers: current });
      await updateGroupTemplate(group.id);
      const updatedGroup = await getGroup(group.id, true);
      if (updatedGroup) {
        setGroup(updatedGroup);
      }
      setCheckoutModalOpen(false);
      // Create order directly instead of navigating to checkout
      await createOrderDirectly();
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Failed to update group size');
    } finally {
      setIsCheckoutUpdating(false);
    }
  };

  const handleCancelCheckout = () => {
    if (isCheckoutUpdating) return;
    setCheckoutModalOpen(false);
    toast.info('Checkout postponed. Waiting for the expected member count.');
  };

  const completionPercentage = Math.round((group.members.length / group.totalMembers) * 100);
  const winningTemplate = getWinningTemplate(group.votes ?? { square: 0, hexagonal: 0 }, group.layoutMode);
  const isGridComplete = group.members.length === group.totalMembers;

  // Payment calculations
  const unpaidMembers = group.members.filter((m: Member) => !m.paidDeposit);
  const totalUnpaidAmount = unpaidMembers.length * (group.pricePerMember || 189);
  const isLeader = user?.id === group.leaderId;

  // Determine which member count to use based on toggle
  const displayMemberCount = showCurrentMembers ? group.members.length : group.totalMembers;
  const displayMembers = showCurrentMembers ? group.members : group.members;
  const currentMembersCount = group.members.length;
  const expectedMembersCount = group.totalMembers;

  return (
    <>
      {walkthroughElement}
      <div className="min-h-screen flex flex-col relative">
        <BackgroundDoodle />

        {/* Navigation Header */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
              <Button
                variant="ghost"
                onClick={() => navigate(groupId ? `/dashboard/${groupId}` : '/dashboard')}
                className="flex items-center gap-2 w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm sm:text-base">Back to Dashboard</span>
              </Button>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="hidden sm:flex flex-wrap gap-2 sm:space-x-2">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm px-3 sm:px-4 py-2" onClick={() => window.dispatchEvent(new Event('grid-template-download'))}>
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="container mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0 py-4 sm:py-6">
            {/* Main Content Layout */}
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Image Grid Section - Takes remaining space and scrolls */}
              <div className="lg:col-span-2 flex flex-col order-2 lg:order-1">
                <Card className="shadow-xl border-0 backdrop-blur-lg bg-white/80 flex flex-col h-full">
                  <CardHeader className="pb-3 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div>
                        <CardTitle className="text-lg sm:text-xl lg:text-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Live Collage Preview</CardTitle>
                        <CardDescription className="text-xs sm:text-sm lg:text-base">
                          Grid template: {displayMemberCount} members • {displayTemplate} layout
                          {showCurrentMembers && group.members.length !== group.totalMembers && (
                            <span className="text-amber-600 ml-1">(Current view)</span>
                          )}
                        </CardDescription>
                      </div>
                      <Button
                        id="guide-view-toggle"
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-xs sm:text-sm"
                        onClick={() => setShowCurrentMembers(prev => !prev)}
                        disabled={group.members.length === group.totalMembers}
                      >
                        <Eye className="h-4 w-4 text-purple-600" />
                        {group.members.length === group.totalMembers
                          ? 'Showing complete grid'
                          : showCurrentMembers
                            ? `Viewing current grid(${group.members.length})`
                            : `Viewing expected grid(${group.totalMembers})`}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <div id="guide-grid-preview" className="flex justify-center items-start min-h-full">
                      <div className="relative w-full">
                        {availableTemplates.length > 1 && (
                          <>
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="bg-white/80 hover:bg-white shadow-lg rounded-full h-10 w-10"
                                onClick={handlePrevTemplate}
                              >
                                <ChevronLeft className="h-6 w-6 text-gray-700" />
                              </Button>
                            </div>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="bg-white/80 hover:bg-white shadow-lg rounded-full h-10 w-10"
                                onClick={handleNextTemplate}
                              >
                                <ChevronRight className="h-6 w-6 text-gray-700" />
                              </Button>
                            </div>
                            <div className="absolute top-4 right-4 z-10">
                              <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-semibold uppercase tracking-wider text-gray-600 border border-gray-100">
                                {displayTemplate === 'hexagonal' ? 'Hexagon' : displayTemplate}
                              </span>
                            </div>
                          </>
                        )}
                        <GridPreview
                          key={`${group.id} - ${displayMemberCount} - ${showCurrentMembers} - ${displayTemplate}`}
                          template={displayTemplate}
                          memberCount={displayMemberCount}
                          members={displayMembers}
                          size="large"
                          emptyCenter={
                            group.members.length === 0 ? (
                              <>
                                <p className="text-sm sm:text-base text-gray-500 mb-2">Waiting for members to join...</p>
                                <Button variant="outline" onClick={handleShare} className="text-xs sm:text-sm px-3 py-2 w-fit">
                                  <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  Invite Members
                                </Button>
                              </>
                            ) : undefined
                          }
                        />
                        {group.members.length === 0 && displayTemplate !== 'hexagonal' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center p-4 pointer-events-auto flex flex-col items-center justify-center">
                              <p className="text-sm sm:text-base text-gray-500 mb-2">Waiting for members to join...</p>
                              <Button variant="outline" onClick={handleShare} className="text-xs sm:text-sm px-3 py-2 w-fit">
                                <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Invite Members
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar - Payment & Info */}
              <div className="flex-shrink-0 lg:col-span-1 order-1 lg:order-2 space-y-6 flex flex-col h-full">
                {/* Payment Card */}
                <Card className="shadow-lg border-0 backdrop-blur-lg bg-white/80">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Complete Your Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {isLeader && (
                      <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Unpaid Members</span>
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                            {unpaidMembers.length}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700">Total Due</span>
                          <span className="text-lg font-bold text-purple-600">₹{totalUnpaidAmount}</span>
                        </div>
                        {unpaidMembers.length > 0 && (
                          <Button
                            onClick={handleBulkPayment}
                            disabled={isProcessingBulkPayment}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md hover:shadow-lg transition-all text-xs"
                          >
                            {isProcessingBulkPayment ? (
                              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                            ) : (
                              <CreditCard className="h-3 w-3 mr-2" />
                            )}
                            {isProcessingBulkPayment ? "Processing..." : `Pay ₹${totalUnpaidAmount} for class`}
                          </Button>
                        )}
                        {unpaidMembers.length === 0 && (
                          <div className="text-center text-xs text-green-600 font-medium">
                            All members have paid!
                          </div>
                        )}
                      </div>
                    )}

                    <Button variant="outline" className="w-full text-sm sm:text-base py-2 sm:py-3" onClick={handleShare}>
                      <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Share Group Link
                    </Button>


                    {/* <Button className="w-full bg-purple-600 hover:bg-purple-700 text-sm sm:text-base py-2 sm:py-3" onClick={() => window.dispatchEvent(new Event('grid-template-download'))}>
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Download
                    </Button> */}

                  </CardContent>
                </Card>

                {/* Member List - Desktop Only */}
                <Card className="shadow-lg border-0 backdrop-blur-lg bg-white/80 hidden lg:flex flex-col flex-1 min-h-0">
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Members ({group.members.length}/{group.totalMembers})</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    {group.members.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-4 sm:py-6 text-center">
                        <Users className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm sm:text-base text-gray-500">No members yet</p>
                        <Button variant="outline" size="sm" className="mt-2 text-xs sm:text-sm" onClick={handleShare}>
                          Invite Members
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '380px', minHeight: 100 }}>
                        {group.members.map((member: any, index: number) => (
                          <div key={member.id} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="relative">
                              <img
                                src={member.photo}
                                alt={member.name}
                                className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow"
                              />
                              <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs">
                                {index + 1}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{member.name}</p>
                              <p className="text-xs sm:text-sm text-gray-500 truncate">Roll No. {member.memberRollNumber}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.paidDeposit ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] px-1.5">Paid</Badge>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[10px] px-1.5">Unpaid</Badge>
                              )}
                              {isLeader && !member.paidDeposit && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-purple-600 hover:bg-purple-100 h-8 w-8 p-0 rounded-full transition-all border border-purple-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSendPaymentLink(member);
                                        }}
                                        disabled={isSendingLink === member.memberRollNumber}
                                      >
                                        {isSendingLink === member.memberRollNumber ? (
                                          <RefreshCw className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Send className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="bg-purple-600 text-white border-none shadow-lg">
                                      <p className="text-xs font-semibold">Send Payment Link</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Voting Results - Desktop Only */}
                <Card className="shadow-lg border-0 backdrop-blur-lg bg-white/80 relative hidden lg:block shrink-0">
                  <Badge className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">coming soon</Badge>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Template Votes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {(['square', 'hexagonal'] as const).map((template) => {
                        const count = group.votes?.[template] ?? 0;
                        const pct = group.members.length > 0 ? (count / group.members.length) * 100 : 0;
                        return (
                          <div key={template} className="flex items-center justify-between">
                            <span className="capitalize text-gray-700 text-sm sm:text-base">{template === 'hexagonal' ? 'Hexagon' : 'Square'}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${template === winningTemplate ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-400'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-gray-600">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div >

      <Dialog
        open={shippingModalOpen}
        onOpenChange={(open) => {
          if (isProcessingBulkPayment || isProcessingOrder) return;
          setShippingModalOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-purple-600" />
              Checkout & Shipping Details
            </DialogTitle>
            <DialogDescription>
              Please provide the shipping address for your group order.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-600" />
                Delivery Address
              </h3>

              <div className="space-y-2">
                <Label htmlFor="receiver-name">Receiver Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="receiver-name"
                    placeholder="Full Name"
                    className="pl-9"
                    value={shippingInfo.name}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      placeholder="Contact No"
                      className="pl-9"
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email Address"
                      className="pl-9"
                      value={shippingInfo.email}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address-1">Address Line 1 *</Label>
                <Input
                  id="address-1"
                  placeholder="House No, Block, Street"
                  value={shippingInfo.line1}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, line1: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address-2">Address Line 2 (Optional)</Label>
                <Input
                  id="address-2"
                  placeholder="Apartment, Landmark, etc."
                  value={shippingInfo.line2}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, line2: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="postal">ZIP / Postal Code *</Label>
                  <Input
                    id="postal"
                    placeholder="6-digit ZIP"
                    value={shippingInfo.postalCode}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value="India" disabled />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 h-full">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  Order Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Members Joined:</span>
                    <span className="font-semibold">{group.members.length}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Expected Members:</span>
                    <span className="font-semibold">{group.totalMembers}</span>
                  </div>

                  <div className="border-t border-purple-100 my-2 pt-2"></div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending Member Deposits:</span>
                    <span className="font-semibold">₹{unpaidMembers.length * (group.pricePerMember || 189)}</span>
                  </div>

                  <div className="border-t border-purple-200 my-4 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                      <span className="text-2xl font-black text-purple-600">
                        ₹{Math.round((unpaidMembers.length * (group.pricePerMember || 189)) * 100) / 100}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-purple-100 text-[11px] text-gray-500 italic">
                    Note: Your final order will contain the signatures of all {group.members.length} members who have joined.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={() => setShippingModalOpen(false)}
              disabled={isProcessingBulkPayment || isProcessingOrder}
              className="sm:flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={unpaidMembers.length > 0 ? processBulkPaymentWithShipping : createOrderDirectly}
              disabled={isProcessingBulkPayment || isProcessingOrder}
              className="sm:flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all h-12 text-lg font-bold"
            >
              {isProcessingBulkPayment || isProcessingOrder ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : unpaidMembers.length > 0 ? (
                `Pay & Place Order`
              ) : (
                'Confirm & Place Order'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Editor;