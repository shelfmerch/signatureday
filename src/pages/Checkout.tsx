import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, ShoppingCart, Users, MapPin, Loader2 } from 'lucide-react';
import { useCollage } from '@/context/CollageContext';
import type { Group } from '@/context/CollageContext';
import { ordersApi, paymentsApi } from '@/lib/api';
import { generateInvoicePdfBase64 } from '@/lib/invoice';
import type { Order, AdminMember } from '@/types/admin';
import { toast } from 'sonner';

import { claimToteBag } from '@/services/totebagClaimService';

// Subtle animated background consistent with GridBoard/Dashboard
const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-pink-400/10 to-yellow-400/10 animate-gradient-xy" />
    <div className="absolute inset-0 backdrop-blur-3xl" />
  </div>
);

const Checkout = () => {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId?: string }>();
  const { getGroup, updateGroup, updateGroupTemplate } = useCollage();

  // Load group data (getGroup is async)
  const [group, setGroup] = useState<Group | null>(null);
  const [isUpdatingGrid, setIsUpdatingGrid] = useState(false);

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
      // Try last active group from localStorage
      const lastActive = getLastActiveGroup();
      if (lastActive) {
        navigate(`/checkout/${lastActive}`, { replace: true });
        return;
      }

      // Otherwise redirect to dashboard
      navigate('/dashboard');
    }
  }, [groupId, navigate]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!groupId) {
        if (isMounted) setGroup(null);
        return;
      }
      try {
        const g = await getGroup(groupId);
        if (isMounted) {
          setGroup(g ?? null);
          if (g) {
            saveLastActiveGroup(groupId); // Save as last active group
          }
        }
      } catch (e) {
        console.error('Failed to load group in Checkout:', e);
        if (isMounted) setGroup(null);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [groupId, getGroup]);

  const winningTemplate = group
    ? ((group.votes?.square ?? 0) >= (group.votes?.hexagonal ?? 0) ? 'square' : 'hexagonal')
    : 'square';

  const handleUpdateGrid = async () => {
    if (!group) return;
    const current = group.members.length;
    setIsUpdatingGrid(true);
    try {
      await updateGroup(group.id, { totalMembers: current });
      await updateGroupTemplate(group.id);
      const updatedGroup = await getGroup(group.id, true);
      if (updatedGroup) {
        setGroup(updatedGroup);
        toast.success('Grid updated to fit current members');
      }
    } catch (error) {
      console.error('Failed to update grid:', error);
      toast.error('Failed to update grid size');
    } finally {
      setIsUpdatingGrid(false);
    }
  };

  // Quantity is static - always equals number of members (cannot be changed)
  const quantity = group ? (group.members.length || 1) : 1;

  // Update shipping quote when quantity changes (temporarily disabled)
  // useEffect(() => {
  //   if (shippingForm.zipCode && shippingForm.zipCode.length === 6) {
  //     updateShippingQuote(shippingForm.zipCode, quantity);
  //   }
  // }, [quantity]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ToteBag claim state
  const [wantsToteBag, setWantsToteBag] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Form state
  const [shippingForm, setShippingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: ''
  });

  // Automatically fetch shipping info when ZIP code is filled (e.g. via browser autofill) - temporarily disabled
  // useEffect(() => {
  //   if (shippingForm.zipCode && shippingForm.zipCode.length === 6) {
  //     updateShippingQuote(shippingForm.zipCode, quantity);
  //   }
  // }, [shippingForm.zipCode]);

  // Map state codes to full state names
  const stateCodeToName: Record<string, string> = {
    'AP': 'Andhra Pradesh',
    'AR': 'Arunachal Pradesh',
    'AS': 'Assam',
    'BR': 'Bihar',
    'CT': 'Chhattisgarh',
    'GA': 'Goa',
    'GJ': 'Gujarat',
    'HR': 'Haryana',
    'HP': 'Himachal Pradesh',
    'JK': 'Jammu and Kashmir',
    'JH': 'Jharkhand',
    'KA': 'Karnataka',
    'KL': 'Kerala',
    'LA': 'Ladakh',
    'MP': 'Madhya Pradesh',
    'MH': 'Maharashtra',
    'MN': 'Manipur',
    'ML': 'Meghalaya',
    'MZ': 'Mizoram',
    'NL': 'Nagaland',
    'OR': 'Odisha',
    'PB': 'Punjab',
    'RJ': 'Rajasthan',
    'SK': 'Sikkim',
    'TN': 'Tamil Nadu',
    'TG': 'Telangana',
    'TR': 'Tripura',
    'UP': 'Uttar Pradesh',
    'UT': 'Uttarakhand',
    'WB': 'West Bengal',
    'AN': 'Andaman and Nicobar Islands',
    'CH': 'Chandigarh',
    'DH': 'Dadra and Nagar Haveli and Daman and Diu',
    'DL': 'Delhi',
    'LD': 'Lakshadweep',
    'PY': 'Puducherry'
  };

  // Shipping quote state - single source of truth
  const [zipStatus, setZipStatus] = useState<{
    loading: boolean;
    serviceable: boolean | null; // null = unknown, true = ok, false = bad
    message: string;
  }>({
    loading: false,
    serviceable: null,
    message: ""
  });
  const [shippingCharge, setShippingCharge] = useState<number | null>(null);
  const [codAvailable, setCodAvailable] = useState(false);

  // Pricing breakdown based on whether group has ambassador referral
  // With ambassador (₹149): T-shirt ₹112, Print ₹30, GST ₹7 (5% of ₹30)
  // Without ambassador (₹189): T-shirt ₹140, Print ₹40, GST ₹9 (5% of ₹40)
  const hasAmbassador = !!(group?.ambassadorId && group.ambassadorId !== null && group.ambassadorId !== undefined && String(group.ambassadorId).trim() !== '');
  
  const tshirtPrice = hasAmbassador ? 112 : 140;
  const printPrice = hasAmbassador ? 30 : 40;
  const gstRate = 0.05; // 5% GST on print cost only
  const perItemGst = hasAmbassador ? 7 : 9; // GST: ₹7 (with ambassador) or ₹9 (without ambassador)
  const perItemTotal = hasAmbassador ? 149 : 189; // Total per member
  
  // Calculate totals
  const itemSubtotal = (tshirtPrice + printPrice) * quantity; // Subtotal for all items
  const itemGst = perItemGst * quantity; // Total GST for all items
  const alreadyPaidAmount = perItemTotal * quantity; // Total already paid when joining (₹149/₹189 × members)
  
  const shipping = 150; // Hardcoded shipping to ₹150
  const shippingGst = parseFloat((shipping * gstRate).toFixed(2)); // GST (5%) calculated on shipping = ₹7.50
  const finalTotal = shipping + shippingGst; // Final payment is ONLY Shipping + Shipping GST = ₹157.50

  const handleInputChange = (field: string, value: string) => {
    setShippingForm(prev => ({ ...prev, [field]: value }));
  };

  // Update shipping quote - single source of truth
  const updateShippingQuote = async (pincode: string, qty: number) => {
    // Clear state when ZIP is less than 6 digits
    if (pincode.length < 6) {
      setZipStatus({ loading: false, serviceable: null, message: "" });
      setShippingCharge(null);
      setCodAvailable(false);
      return;
    }

    // Only check if pincode is 6 digits
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return;
    }

    setZipStatus({ loading: true, serviceable: null, message: "" });

    try {
      // Calculate weight (assume ~200g per t-shirt)
      const weightGrams = 200 * qty;

      const response = await fetch('/api/shipping-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destPincode: pincode,
          weightGrams: weightGrams,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Backend error
        setZipStatus({
          loading: false,
          serviceable: false,
          message: data.message || 'Unable to validate pincode'
        });
        setShippingCharge(0);
        setCodAvailable(false);
        toast.error(data.message || 'Could not validate pincode');
        return;
      }

      if (data.serviceable === false) {
        // Real not-serviceable case
        setZipStatus({
          loading: false,
          serviceable: false,
          message: data.message || 'Pincode not serviceable'
        });
        setShippingCharge(0);
        setCodAvailable(false);
        toast.error(data.message || 'Cannot deliver to this pincode');
        return;
      }

      // serviceable === true
      setZipStatus({
        loading: false,
        serviceable: true,
        message: ""
      });
      setShippingCharge(data.shipping_charge || 0);
      setCodAvailable(data.cod_available === true);

      // Autofill city/state from response
      if (data.city) {
        setShippingForm(prev => ({ ...prev, city: data.city }));
      }

      // Autofill state from state_code
      if (data.state_code) {
        const stateName = stateCodeToName[data.state_code] || data.state_code;
        setShippingForm(prev => ({ ...prev, state: stateName }));
        console.log('[Checkout] Autofilled state:', stateName, 'from code:', data.state_code);
      }

      toast.success(`Shipping available! Rate: ₹${data.shipping_charge}`);
    } catch (error) {
      console.error('Shipping quote error:', error);
      setZipStatus({
        loading: false,
        serviceable: false,
        message: 'Network error'
      });
      setShippingCharge(0);
      setCodAvailable(false);
      toast.error('Could not check shipping. Please try again.');
    }
  };

  // Handle pincode input change
  const handlePincodeChange = (zipCode: string) => {
    handleInputChange('zipCode', zipCode);
  };

  // Handle pincode blur - validate on blur
  const handlePincodeBlur = () => {
    updateShippingQuote(shippingForm.zipCode, quantity);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-sdk')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle totebag claim before payment
  const handleToteBagClaim = async (): Promise<{ success: boolean; claim?: any; error?: string } | null> => {
    if (!wantsToteBag) {
      console.log('[Checkout] ToteBag claim skipped - user did not request totebag');
      return null;
    }

    console.log('[Checkout] 🎁 Starting totebag claim process...');
    console.log('[Checkout] Form data:', {
      firstName: shippingForm.firstName,
      lastName: shippingForm.lastName,
      email: shippingForm.email,
      phone: shippingForm.phone,
      address: shippingForm.address,
      city: shippingForm.city,
      zipCode: shippingForm.zipCode
    });

    setClaiming(true);
    setClaimStatus(null);

    try {
      const fullName = `${shippingForm.firstName} ${shippingForm.lastName}`.trim();

      // Validate form data before sending
      if (!shippingForm.firstName || !shippingForm.lastName) {
        throw new Error('First name and last name are required');
      }
      if (!shippingForm.email) {
        throw new Error('Email is required');
      }
      if (!shippingForm.phone) {
        throw new Error('Phone number is required');
      }
      if (!shippingForm.address) {
        throw new Error('Address is required');
      }
      if (!shippingForm.city) {
        throw new Error('City is required');
      }
      if (!shippingForm.zipCode) {
        throw new Error('ZIP code is required');
      }

      // State should be autofilled from shipping quote
      // If not available, we need to get it from the shipping quote response or use a valid default
      let stateValue = shippingForm.state?.trim() || '';

      if (!stateValue) {
        console.warn('[Checkout] State not available in form. This may cause claim to fail.');
        console.warn('[Checkout] Please ensure pincode has been validated to autofill state.');
        // Use a generic state name that should be accepted (Telangana as default since it's common)
        stateValue = 'Telangana';
        console.warn('[Checkout] Using fallback state:', stateValue);
      }

      const claimData = {
        fullName,
        email: shippingForm.email,
        phone: shippingForm.phone,
        address: shippingForm.address,
        city: shippingForm.city,
        state: stateValue, // Use state from form (autofilled from shipping quote)
        zipCode: shippingForm.zipCode,
        purpose: 'Personal use'
      };

      console.log('[Checkout] Claim data with state:', claimData);

      // Final validation - ensure state is not empty
      if (!claimData.state || claimData.state.trim() === '') {
        throw new Error('State is required. Please validate your pincode first to autofill state information.');
      }

      console.log('[Checkout] Sending claim request with data:', claimData);

      const result = await claimToteBag(claimData);

      console.log('[Checkout] Claim result received:', {
        success: result.success,
        hasClaim: !!result.claim,
        message: result.message,
        error: result.error
      });

      // Store claim result in localStorage for tracking
      const claimRecord = {
        success: result.success,
        claim: result.claim,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString(),
        formData: {
          fullName,
          email: shippingForm.email,
          phone: shippingForm.phone
        }
      };
      localStorage.setItem('lastToteBagClaim', JSON.stringify(claimRecord));
      console.log('[Checkout] Claim record saved to localStorage');

      if (result.success) {
        console.log('[Checkout] ✅ ToteBag claim successful!');
        console.log('[Checkout] Claim details:', result.claim);

        setClaimStatus({
          type: 'success',
          message: '✅ Free totebag claim submitted!'
        });
        toast.success('Free totebag claim submitted!');

        return { success: true, claim: result.claim };
      } else {
        console.warn('[Checkout] ⚠️ ToteBag claim failed:', result.message);
        console.warn('[Checkout] Error details:', result.error);

        setClaimStatus({
          type: 'warning',
          message: `⚠️ ${result.message}. Order will still be processed.`
        });
        toast.warning(result.message || 'ToteBag claim failed, but order will continue');

        return { success: false, error: result.error || result.message };
      }
    } catch (error: any) {
      console.error('[Checkout] ❌ ToteBag claim exception:', error);
      console.error('[Checkout] Exception details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      const errorRecord = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        exception: error.name
      };
      localStorage.setItem('lastToteBagClaim', JSON.stringify(errorRecord));

      setClaimStatus({
        type: 'error',
        message: `❌ ${error.message || 'Failed to claim totebag'}. Order will still be processed.`
      });
      toast.error('ToteBag claim failed, but order will continue');

      return { success: false, error: error.message };
    } finally {
      setClaiming(false);
      console.log('[Checkout] ToteBag claim process completed');
    }
  };

  const handleRazorpayPayment = async () => {
    if (!group) return;

    console.log('[Checkout] 💳 Starting payment process...');
    console.log('[Checkout] ToteBag requested:', wantsToteBag);

    setIsProcessing(true);

    // If user wants totebag, submit claim first (non-blocking)
    let claimResult: { success: boolean; claim?: any; error?: string } | null = null;
    if (wantsToteBag) {
      console.log('[Checkout] Submitting totebag claim before payment...');
      claimResult = await handleToteBagClaim();
      console.log('[Checkout] ToteBag claim completed. Result:', claimResult);

      if (claimResult?.success) {
        console.log('[Checkout] ✅ ToteBag claim was successful - proceeding with payment');
      } else {
        console.warn('[Checkout] ⚠️ ToteBag claim failed but continuing with payment:', claimResult?.error);
      }
    } else {
      console.log('[Checkout] No totebag claim requested - proceeding directly to payment');
    }

    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Failed to load Razorpay');

      // 1) Create a Razorpay order (amount in paise, must be integer)
      const amountPaise = Math.round(finalTotal * 100);
      const rpOrder = await paymentsApi.createOrder(amountPaise, `grp_${group.id}`);

      // 2) Get public key
      const { keyId } = await paymentsApi.getKey();

      // 3) Open Razorpay Checkout
      const options: any = {
        key: keyId,
        amount: rpOrder.amount,
        currency: 'INR',
        name: group.name,
        description: `${group.name} • ${group.yearOfPassing}`,
        order_id: rpOrder.id,
        prefill: {
          name: `${shippingForm.firstName} ${shippingForm.lastName}`.trim(),
          email: shippingForm.email,
          contact: shippingForm.phone,
        },
        notes: { groupId: group.id },
        handler: async (response: any) => {
          try {
            console.log('[Checkout] 💳 Payment successful! Processing order...');
            console.log('[Checkout] Payment response:', {
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id
            });

            // Check claim status from localStorage
            const claimDataStr = localStorage.getItem('lastToteBagClaim');
            const claimData = claimDataStr ? JSON.parse(claimDataStr) : null;

            if (claimData) {
              console.log('[Checkout] ToteBag claim status at payment completion:', {
                success: claimData.success,
                hasClaim: !!claimData.claim,
                timestamp: claimData.timestamp
              });

              if (claimData.success) {
                console.log('[Checkout] ✅ ToteBag claim was successfully created and sent!');
                console.log('[Checkout] Claim ID:', claimData.claim?.id || claimData.claim?._id || 'N/A');
              } else {
                console.warn('[Checkout] ⚠️ ToteBag claim was not successful:', claimData.error);
              }
            } else {
              console.log('[Checkout] No totebag claim data found in localStorage');
            }

            // 4) Verify payment signature on backend and send email confirmation
            // Prepare invoice PDF
            const invoiceFileName = `Invoice-${Date.now()}.pdf`;
            // Invoice should only show shipping charges since items were already paid during join
            // Pass empty items array and only shipping + shipping GST
            const invoiceBase64 = await generateInvoicePdfBase64(
              {
                name: 'CHITLU INNOVATIONS PRIVATE LIMITED',
                address: 'G2, Win Win Towers, Siddhi Vinayaka Nagar, Madhapur, Hyderabad, Telangana – 500081, India',
                gstin: '36AAHCC5155C1ZW',
                cin: 'U74999TG2018PTC123754',
                email: 'support@signatureday.com',
                logoUrl: '/chitlu-logo.png',
              },
              {
                invoiceId: `INV-${Date.now()}`,
                orderId: response.razorpay_order_id,
                dateISO: new Date().toISOString(),
                customerName: `${shippingForm.firstName} ${shippingForm.lastName}`.trim() || 'Customer',
                customerEmail: shippingForm.email,
                billingAddress: `${shippingForm.address}, ${shippingForm.city} ${shippingForm.zipCode}`,
                shipping: shipping, // Shipping amount: ₹150
                shippingGst: shippingGst, // GST on shipping: ₹7.50
              },
              [] // Empty items array since items were already paid during join
            );

            const verify = await paymentsApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              clientOrderId: `ORD-${Date.now()}`,
              email: shippingForm.email,
              name: `${shippingForm.firstName} ${shippingForm.lastName}`.trim(),
              amount: finalTotal * 100,
              invoicePdfBase64: invoiceBase64,
              invoiceFileName: invoiceFileName
            });
            if (!verify.valid) throw new Error('Payment verification failed');

            // 5) Create app Order after successful payment
            const members: AdminMember[] = group.members.map(m => ({
              id: m.id,
              name: m.name,
              memberRollNumber: m.memberRollNumber,
              photo: m.photo,
              vote: m.vote,
              joinedAt: m.joinedAt.toISOString(),
              size: m.size,
              phone: m.phone,
            }));
            const newOrder: Order = {
              id: `ORD-${Date.now()}`,
              status: 'new',
              paid: true,
              paymentId: response.razorpay_payment_id,
              paidAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              description: `${group.name} • ${group.yearOfPassing}`,
              gridTemplate: winningTemplate as Order['gridTemplate'],
              members,
              shipping: {
                name: `${shippingForm.firstName} ${shippingForm.lastName}`.trim(),
                phone: shippingForm.phone,
                email: shippingForm.email,
                line1: shippingForm.address,
                line2: '',
                city: shippingForm.city,
                state: '',
                postalCode: shippingForm.zipCode,
                country: 'India',
              },
              settings: {
                widthPx: 2550,
                heightPx: 3300,
                keepAspect: true,
                gapPx: 4,
                cellScale: 1.0,
                dpi: 300,
              },
            };

            // Add claim information to order notes/metadata if available
            if (claimData?.success) {
              console.log('[Checkout] Adding totebag claim info to order');
              // Store in order notes or metadata if your Order type supports it
              // You may need to extend the Order type to include metadata
            }

            console.log('[Checkout] Creating order:', newOrder.id);
            await ordersApi.createOrder(newOrder);
            console.log('[Checkout] ✅ Order created successfully');

            // Trigger backend reward allocation (demo intent+confirm flow, non-blocking)
            // Reward is calculated on the amount already paid for items (not shipping)
            try {
              if (group?.id) {
                console.log('[Checkout] Creating backend payment intent for ambassador reward...');
                const intent = await paymentsApi.createIntent(group.id, alreadyPaidAmount);
                await paymentsApi.confirm(intent.paymentId, 'success');
                console.log('[Checkout] ✅ Backend ambassador reward allocation triggered');
              }
            } catch (err) {
              console.error('[Checkout] Failed to trigger backend ambassador reward allocation (non-blocking):', err);
            }


            // Update claim record with order ID
            if (claimData) {
              claimData.orderId = newOrder.id;
              localStorage.setItem('lastToteBagClaim', JSON.stringify(claimData));
              console.log('[Checkout] Updated claim record with order ID:', newOrder.id);
            }

            // Navigate with claim status
            const claimParam = claimData?.success ? '&toteBagClaimed=true' :
              claimData ? '&toteBagClaimed=false' : '';

            console.log('[Checkout] Navigating to success page...');
            console.log('[Checkout] Claim status for success page:', {
              claimed: !!claimData?.success,
              param: claimParam
            });

            if (group) {
              window.location.href = `/success?groupId=${group.id}${claimParam}`;
            } else {
              window.location.href = `/success${claimParam.replace('&', '?')}`;
            }
          } catch (err) {
            console.error('Payment finalize error:', err);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          }
        },
        theme: { color: '#6d28d9' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Razorpay error:', err);
      setIsProcessing(false);
    }
  };

  // Check if all form fields are filled
  const allFieldsFilled = Object.values(shippingForm).every(value => value.trim() !== '');

  // For serviceability: only block if we've checked AND it's not serviceable
  // Allow form submission if ZIP is empty, being validated, or validated as serviceable
  const isZipValid = !shippingForm.zipCode || // ZIP not entered yet
    zipStatus.serviceable === true || // ZIP validated and serviceable
    zipStatus.serviceable === null; // ZIP validation pending

  const isFormValid = allFieldsFilled && isZipValid;

  // Guard: missing groupId in route
  if (!groupId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-0">
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-gray-700 font-medium">Invalid checkout link: missing group id.</p>
              <Button onClick={() => navigate('/dashboard')} className="bg-purple-600 hover:bg-purple-700">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard: group not found for provided id
  if (groupId && !group) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <AnimatedBackground />
        <Card className="max-w-md w-full shadow-lg border-0 backdrop-blur-lg bg-white/80">
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-gray-700 font-medium">We couldn't find a group for ID: <span className="font-semibold">{groupId}</span></p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => navigate(-1)}>Go Back</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 text-center shadow-lg border-0">
          <CardContent className="pt-8 pb-6">
            <div className="mb-6">
              <div className="mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
                <img src="/congrats.gif" alt="success" width={400} />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-700">Order ID: #RZP{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
              <p className="text-lg font-semibold text-green-800">₹{finalTotal}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const hasMismatch = group && group.members.length !== group.totalMembers;

  return (
    <div className="min-h-screen relative">
      <BackgroundDoodle />
      {/* Navigation Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => navigate(group ? `/editor/${group.id}` : '/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Editor
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-gray-900">Checkout</span>
            </div>
            <div className="w-[100px]" />
          </div>
        </div>
      </div>

      {hasMismatch && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-yellow-800">
                  Group has {group!.members.length} members but grid is set to {group!.totalMembers}.
                  Update grid to fit all current members?
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdateGrid}
                disabled={isUpdatingGrid}
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                {isUpdatingGrid ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Update grid to ${group!.members.length}`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="order-2 lg:order-1">
            <Card className="shadow-lg border-0 backdrop-blur-lg bg-white/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                  <Users className="h-5 w-5 text-purple-600" /> Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {group && (
                  <div className="bg-white/60 rounded-lg p-4 space-y-2 border border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span>Group Name:</span>
                      <span className="font-medium">{group.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Members:</span>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">{group.members.length} members</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Template:</span>
                      <span className="font-medium capitalize">{winningTemplate}</span>
                    </div>
                  </div>
                )}

                {/* Already Paid Section */}
                <div className="space-y-3 bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">Already Paid (When Joining Group)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">T-Shirt Price (each)</span>
                      <span className="font-semibold">₹{tshirtPrice}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Print Cost (each)</span>
                      <span className="font-semibold">₹{printPrice}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">GST (5% on Print Cost)</span>
                      <span className="font-semibold">₹{perItemGst.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-green-300">
                      <span className="text-gray-700 font-medium">Total per member</span>
                      <span className="font-bold">₹{perItemTotal}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-gray-600">Quantity (Members)</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 font-semibold">
                        {quantity} {quantity === 1 ? 'member' : 'members'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t-2 border-green-400">
                      <span className="text-green-800 font-bold">Paid Amount</span>
                      <span className="text-green-800 font-bold text-lg">₹{alreadyPaidAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-green-700 mt-2 italic">This amount was already paid when members joined the group.</p>
                  </div>
                </div>

                <Separator />

                {/* Final Payment Section */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800 mb-2">Final Payment (For Shipping)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-semibold">₹{shipping}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST (5% on Shipping)</span>
                      <span className="font-semibold">₹{shippingGst.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg text-purple-600">
                  <span>Final Payment</span>
                  <span>₹{Number(finalTotal).toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">This is the amount you will pay at checkout.</p>

                {/* Free shipping message disabled - shipping is hardcoded to ₹150 */}
                {/* {shipping === 0 && (
                  <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">
                    🎉 You're eligible for free shipping!
                  </div>
                )} */}
              </CardContent>
            </Card>
          </div>

          {/* Shipping Form & Payment */}
          <div className="order-1 lg:order-2 space-y-6">
            {/* Shipping Information */}
            <Card className="shadow-lg border-0 backdrop-blur-lg bg-white/80">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={shippingForm.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={shippingForm.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={shippingForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingForm.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={shippingForm.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Main Street, Apartment 4B"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={shippingForm.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <div className="relative">
                      <Input
                        id="zipCode"
                        value={shippingForm.zipCode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        onBlur={handlePincodeBlur}
                        placeholder="110001"
                        maxLength={6}
                        required
                        className={zipStatus.serviceable === false ? 'border-red-500' : ''}
                      />
                      {zipStatus.loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        </div>
                      )}
                      {zipStatus.serviceable === true && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <MapPin className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                    </div>
                    {zipStatus.loading && (
                      <p className="mt-1 text-xs text-gray-500">
                        Checking serviceability...
                      </p>
                    )}
                    {zipStatus.serviceable === true && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ Shipping: ₹{shippingCharge}
                        {!codAvailable && ' • COD not available'}
                      </p>
                    )}
                    {zipStatus.serviceable === false && (
                      <p className="mt-1 text-xs text-red-600">
                        {zipStatus.message || 'Cannot deliver to this pincode'}
                      </p>
                    )}
                  </div>
                </div>

                {/* ToteBag Claim Section */}
                {/* <Separator />
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantsToteBag}
                      onChange={(e) => setWantsToteBag(e.target.checked)}
                      disabled={claiming}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      🎁 Claim a free totebag (development mode)
                    </span>
                  </label>

                  {claimStatus && (
                    <div className={`text-sm p-3 rounded-lg ${
                      claimStatus.type === 'success' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : claimStatus.type === 'warning'
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {claimStatus.message}
                    </div>
                  )}

                  {claiming && (
                    <div className="flex items-center gap-2 text-sm text-purple-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting totebag claim...</span>
                    </div>
                  )}
                </div> */}
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card className="fixed bottom-0 inset-x-0 z-50 sm:static shadow-lg border-0 backdrop-blur-lg bg-white/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                  <CreditCard className="h-5 w-5 text-purple-600" /> Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleRazorpayPayment}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg font-semibold shadow"
                  disabled={isProcessing || claiming || !isFormValid}
                >
                  {isProcessing || claiming ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      {claiming ? 'Submitting Claim...' : 'Processing Payment...'}
                    </>
                  ) : (
                    <>
                      <div className="mr-2 font-bold text-lg">₹</div>
                      Pay ₹{Number(finalTotal).toFixed(2)} with Razorpay
                    </>
                  )}
                </Button>

                {!isFormValid && (
                  <p className="text-sm text-red-600 mt-2 text-center">
                    {zipStatus.serviceable === false
                      ? 'Please enter a valid serviceable pincode'
                      : 'Please fill in all required fields'}
                  </p>
                )}

                <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Secured by Razorpay
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;