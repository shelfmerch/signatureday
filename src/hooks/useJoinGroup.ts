import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollage, GridTemplate, Group } from '@/context/CollageContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { debounce } from 'lodash';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { calculatePricing } from '@/lib/pricing';
import { generateInvoicePdfBase64 } from '@/lib/invoice';

interface MemberData {
  name: string;
  email: string;
  memberRollNumber: string;
  photo: string;
  vote: GridTemplate;
  size: undefined | 's' | 'm' | 'l' | 'xl' | 'xxl';
  zoomLevel: number;
}

interface Errors {
  name: string;
  email: string;
  memberRollNumber: string;
  photo: string;
  size: string;
}

const VERIFIED_MAX_AGE_MINUTES = Number(import.meta.env.VITE_OTP_VERIFIED_MAX_AGE_MINUTES || 30);

declare global {
  interface Window {
    Razorpay: any;
  }
}

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

export const useJoinGroup = (groupId: string | undefined) => {
  const navigate = useNavigate();
  const { getGroup, isLoading } = useCollage();
  const { updateUser, user } = useAuth();

  const [memberData, setMemberData] = useState<MemberData>({
    name: '',
    email: '',
    memberRollNumber: '',
    photo: '',
    vote: 'square',
    size: undefined,
    zoomLevel: 0.4
  });

  const [errors, setErrors] = useState<Errors>({
    name: '',
    email: '',
    memberRollNumber: '',
    photo: '',
    size: ''
  });

  const [group, setGroup] = useState<Group | undefined>(undefined);
  const [previewTemplate, setPreviewTemplate] = useState<GridTemplate>('square');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState<boolean>(true);
  const [submitPhotoUrl, setSubmitPhotoUrl] = useState<string>('');
  const lastObjectUrlRef = useRef<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  const [phoneInput, setPhoneInput] = useState<string>('');
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);

  // Join pricing depends on whether the group was created via an ambassador referral.
  // - With ambassador (group.ambassadorId present and not null): ₹149
  // - Without ambassador (null, undefined, or empty): ₹189
  const joinPricing = useMemo(() => {
    const groupAmbassadorId = (group as Group | undefined)?.ambassadorId;
    // Explicitly check: only true if ambassadorId exists and is not null/undefined/empty string
    const isAmbassadorGroup = !!(groupAmbassadorId && groupAmbassadorId !== null && groupAmbassadorId !== undefined && groupAmbassadorId !== '');
    const perItemTotal = isAmbassadorGroup ? 149 : 189;

    // Debug logging
    if (group) {
      console.log(`[JoinGroup Pricing] Group ID: ${group.id}, ambassadorId: ${JSON.stringify(groupAmbassadorId)}, type: ${typeof groupAmbassadorId}, isAmbassadorGroup: ${isAmbassadorGroup}, price: ₹${perItemTotal}`);
    }

    return {
      perItemSubtotal: perItemTotal,
      perItemGst: 0,
      perItemTotal,
      subtotal: perItemTotal,
      gst: 0,
      total: perItemTotal
    };
  }, [group]);

  const validateForm = useCallback((data: MemberData) => {
    const newErrors: Errors = {
      name: '',
      email: '',
      memberRollNumber: '',
      photo: '',
      size: ''
    };

    if (!data.name) {
      newErrors.name = 'Name is required';
    } else if (data.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!data.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!data.memberRollNumber) {
      newErrors.memberRollNumber = 'Roll number is required';
    }

    if (!data.photo) {
      newErrors.photo = 'Photo is required';
    }

    if (!data.size) {
      newErrors.size = 'Size selection is required';
    }

    return newErrors;
  }, []);

  const handleInputChange = useCallback((field: keyof MemberData, value: MemberData[keyof MemberData]) => {
    setMemberData((prev) => ({ ...prev, [field]: value }));
    if (!formTouched) setFormTouched(true);
  }, [formTouched]);

  const debouncedValidate = useCallback(
    debounce((data: MemberData) => {
      setErrors(validateForm(data));
    }, 500),
    [validateForm]
  );

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Please select an image under 5MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (lastObjectUrlRef.current && lastObjectUrlRef.current !== objectUrl) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
    }
    lastObjectUrlRef.current = objectUrl;
    setMemberData((prev) => ({ ...prev, photo: objectUrl }));

    const uploadToast = toast.loading('Uploading photo...');
    setIsUploadingPhoto(true);
    try {
      const result = await uploadToCloudinary(file, 'groups');
      setSubmitPhotoUrl(result.secure_url);
      setMemberData((prev) => ({ ...prev, photo: result.secure_url }));
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
      toast.success('Upload complete', { id: uploadToast });
    } catch (error) {
      console.error('[JoinGroup] Cloudinary upload failed', error);
      toast.error('Photo upload failed. You can still submit, but it may be slower.', { id: uploadToast });
      setSubmitPhotoUrl('');
    } finally {
      setIsUploadingPhoto(false);
    }
  }, []);

  const handlePhoneInput = useCallback((raw: string) => {
    setPhoneInput(raw);
    if (isPhoneVerified) {
      setIsPhoneVerified(false);
      setVerifiedPhone(null);
    }
  }, [isPhoneVerified]);

  const handlePhoneVerified = useCallback((normalized: string) => {
    setPhoneInput(normalized);
    setVerifiedPhone(normalized);
    setIsPhoneVerified(true);
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupId) return;

    const newErrors = validateForm(memberData);
    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!verifiedPhone || !isPhoneVerified) {
      toast.error('Please verify your phone number before joining.');
      return;
    }

    setIsSubmitting(true);

    try {
      const activeGroup = group;
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      const receipt = `grp_join_${groupId.slice(-6)}_${Date.now()}`;
      // Calculate amount in paise (must be integer for Razorpay)
      const amountPaise = Math.round(joinPricing.total * 100);
      const orderResponse = await fetch('/api/payments/join/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt,
          notes: { groupId, phone: verifiedPhone }
        })
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const order = await orderResponse.json();

      const keyRes = await fetch('/api/payments/key');
      if (!keyRes.ok) {
        throw new Error('Failed to fetch payment key');
      }
      const { keyId } = await keyRes.json();

      const options = {
        key: keyId,
        amount: order.amount,
        currency: 'INR',
        name: activeGroup?.name ?? 'Signature Day',
        description: activeGroup ? `${activeGroup.name} • Class of ${activeGroup.yearOfPassing}` : 'Signature Day Join Payment',
        order_id: order.id,
        prefill: {
          name: memberData.name,
          email: memberData.email,
          contact: verifiedPhone
        },
        notes: { groupId },
        handler: async (response: any) => {
          try {
            // Calculate price breakdown for invoice
            // With ambassador (₹149): T-shirt ₹112, Print ₹30, GST ₹7 (5% of ₹30)
            // Without ambassador (₹189): T-shirt ₹140, Print ₹40, GST ₹9 (5% of ₹40)
            const groupAmbassadorId = (activeGroup as Group | undefined)?.ambassadorId;
            const isAmbassadorGroup = !!(groupAmbassadorId && groupAmbassadorId !== null && groupAmbassadorId !== undefined && String(groupAmbassadorId).trim() !== '');
            
            const tshirtPrice = isAmbassadorGroup ? 112 : 140;
            const printPrice = isAmbassadorGroup ? 30 : 40;
            const gstRate = 0.05; // 5% GST on print cost only (for display purposes)
            const perItemGst = isAmbassadorGroup ? 7 : 9; // Fixed GST: ₹7 (with ambassador) or ₹9 (without ambassador)

            const invoiceBase64 = await generateInvoicePdfBase64(
              {
                name: 'CHITLU INNOVATIONS PRIVATE LIMITED',
                address: 'G2, Win Win Towers, Siddhi Vinayaka Nagar, Madhapur, Hyderabad, Telangana – 500081, India',
                gstin: '36AAHCC5155C1ZW',
                cin: 'U74999TG2018PTC123754',
                email: 'support@shelfmerch.com',
                logoUrl: '/shelf-merch-logo.webp'
              },
              {
                invoiceId: `INV-JOIN-${Date.now()}`,
                orderId: response.razorpay_order_id,
                dateISO: new Date().toISOString(),
                customerName: memberData.name,
                customerEmail: memberData.email,
                placeOfSupply: 'Telangana', // Defaulting to local for now, or could be dynamic
                paymentMethod: 'Razorpay UPI/Card/Netbanking',
                transactionRef: response.razorpay_payment_id
              },
              [
                {
                  description: `${activeGroup?.name ?? 'Group'} Join Fee`,
                  hsn: '6109',
                  quantity: 1,
                  unitPrice: tshirtPrice, // T-shirt price: ₹112 (with ambassador) or ₹140 (without)
                  printPrice: printPrice, // Print cost: ₹30 (with ambassador) or ₹40 (without)
                  taxRate: gstRate, // 5% for display purposes
                  taxAmount: perItemGst // Fixed GST amount: ₹7 (with ambassador) or ₹9 (without)
                }
              ]
            );

            const token = localStorage.getItem('token');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            const verifyResponse = await fetch('/api/payments/join/verify', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                groupId,
                member: {
                  ...memberData,
                  photo: submitPhotoUrl || memberData.photo,
                  phone: verifiedPhone,
                  zoomLevel: memberData.zoomLevel
                },
                invoicePdfBase64: invoiceBase64,
                invoiceFileName: `Invoice-${activeGroup?.name ?? 'Join'}-${Date.now()}.pdf`
              })
            });

            const verifyData = await verifyResponse.json().catch(() => null);
            if (!verifyResponse.ok || !verifyData?.success) {
              throw new Error(verifyData?.message || 'Payment verification failed');
            }

            await getGroup(groupId, true);

            const isCreatorRedirect = verifyData?.isCreator === true;

            // Update role only for the actual joiner (match by email) so we never demote the leader
            // when a member joins in the leader's browser.
            let isLeaderLocal = false;
            
            if (user) {
              const joinerEmail = (memberData.email || '').trim().toLowerCase();
              const currentUserEmail = (user.email || '').trim().toLowerCase();
              const isCurrentUserTheJoiner = !!joinerEmail && joinerEmail === currentUserEmail;

              if (isCreatorRedirect) {
                try {
                  await updateUser({ groupId, isLeader: true });
                  isLeaderLocal = true;
                } catch (err) {
                  console.warn('[JoinGroup] Skipping user update after payment:', err);
                }
              } else if (isCurrentUserTheJoiner) {
                try {
                  await updateUser({ groupId, isLeader: false });
                } catch (err) {
                  console.warn('[JoinGroup] Skipping user update after payment:', err);
                }
              }
            }

            toast.success('Payment successful! Welcome to the group.');
            setIsSubmitting(false);
            setIsProcessingPayment(false);

            // Redirect logic: simple check for creator status
            if (isCreatorRedirect || isLeaderLocal) {
              navigate(`/dashboard/${groupId}`);
            } else {
              try {
                sessionStorage.setItem('joinAsMember', '1');
              } catch {
                // ignore
              }
              navigate(`/success?groupId=${groupId}`);
            }
          } catch (err) {
            console.error('Verify payment error:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to finalize payment.');
            setIsSubmitting(false);
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setIsProcessingPayment(false);
            toast.info('Payment cancelled.');
          }
        },
        theme: { color: '#6d28d9' }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();


    } catch (error) {
      console.error('[JoinGroup] Join error', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join group.');
      setIsSubmitting(false);
      setIsProcessingPayment(false);
    }
  }, [groupId, memberData, validateForm, verifiedPhone, isPhoneVerified, group, joinPricing.total, submitPhotoUrl, getGroup, updateUser, navigate, user]);

  useEffect(() => {
    if (!formTouched) return;
    const timeout = setTimeout(() => debouncedValidate(memberData), 500);
    return () => {
      clearTimeout(timeout);
      debouncedValidate.cancel();
    };
  }, [memberData, formTouched, debouncedValidate]);

  useEffect(() => {
    if (!groupId) return;

    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    const fetchGroup = async () => {
      try {
        loadingTimeout = setTimeout(() => {
          if (isMounted) setLoadingGroup(true);
        }, 200);

        const groupData = await getGroup(groupId);
        if (!isMounted) return;

        if (groupData) {
          const gridTemplate: GridTemplate = groupData.gridTemplate === 'hexagonal' ? 'hexagonal' : 'square';
          const layoutMode = groupData.layoutMode ?? 'square';
          setGroup({
            ...groupData,
            id: groupData.id ?? groupData._id,
            gridTemplate,
            layoutMode,
            members: Array.isArray((groupData as any).members) ? (groupData as any).members : [],
            shareLink: (groupData as any).shareLink ?? '',
            createdAt: groupData.createdAt ? new Date(groupData.createdAt) : new Date(),
            votes: {
              square: typeof (groupData as any).votes?.square === 'number' ? (groupData as any).votes.square : 0,
              hexagonal: typeof (groupData as any).votes?.hexagonal === 'number' ? (groupData as any).votes.hexagonal : 0,
              any: typeof (groupData as any).votes?.any === 'number' ? (groupData as any).votes.any : 0
            }
          } as Group);
          setPreviewTemplate(gridTemplate);
        } else {
          setGroup(undefined);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch group:', error);
        toast.error('Failed to load group data');
      } finally {
        if (isMounted) {
          clearTimeout(loadingTimeout);
          setLoadingGroup(false);
        }
      }
    };

    fetchGroup();

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
    };
  }, [groupId, getGroup]);

  // When layout is locked (not voting), force member's vote to match the group template
  useEffect(() => {
    if (!group || group.layoutMode === 'voting') return;
    const lockedVote: GridTemplate = group.gridTemplate === 'hexagonal' ? 'hexagonal' : 'square';
    setMemberData((prev) => (prev.vote === lockedVote ? prev : { ...prev, vote: lockedVote }));
  }, [group?.id, group?.layoutMode, group?.gridTemplate]);

  useEffect(() => () => {
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
  }, []);

  return {
    memberData,
    errors,
    group,
    previewTemplate,
    isSubmitting,
    isProcessingPayment,
    loadingGroup,
    isLoading,
    formTouched,
    handleInputChange,
    handlePhotoUpload,
    handleSubmit,
    submitPhotoUrl,
    isUploadingPhoto,
    phone: phoneInput,
    setPhone: handlePhoneInput,
    isPhoneVerified,
    setIsPhoneVerified,
    onPhoneVerified: handlePhoneVerified,
    joinPricing
  };
};