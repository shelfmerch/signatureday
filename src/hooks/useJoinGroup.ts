import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollage, GridTemplate, Group } from '@/context/CollageContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { debounce } from 'lodash';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { groupApi } from '@/lib/api';
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
      
      await groupApi.joinGroup(groupId, {
        ...memberData,
        photo: submitPhotoUrl || memberData.photo,
        phone: verifiedPhone,
        zoomLevel: memberData.zoomLevel
      });

      await getGroup(groupId, true);

      // Check if the joiner is the creator
      let isLeaderLocal = false;
      if (user && activeGroup) {
        const joinerEmail = (memberData.email || '').trim().toLowerCase();
        const creatorId = activeGroup.leaderId || (activeGroup as any).createdByUserId;
        // If we have a user session, check if it matches the group owner
        if (user.id === creatorId) {
          isLeaderLocal = true;
          await updateUser({ groupId, isLeader: true });
        }
      }

      toast.success('Successfully joined the group!');
      setIsSubmitting(false);

      if (isLeaderLocal) {
        navigate(`/dashboard/${groupId}`);
      } else {
        try {
          sessionStorage.setItem('joinAsMember', '1');
        } catch { /* ignore */ }
        navigate(`/success?groupId=${groupId}`);
      }

    } catch (error) {
      console.error('[JoinGroup] Join error', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join group.');
      setIsSubmitting(false);
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