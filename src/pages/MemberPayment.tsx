import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCollage } from '@/context/CollageContext';
import { paymentsApi } from '@/lib/api';
import { getEffectivePricePerMember } from '@/lib/pricing';

const MemberPayment = () => {
    const { groupId, memberRollNumber } = useParams<{ groupId: string; memberRollNumber: string }>();
    const navigate = useNavigate();
    const { getGroup } = useCollage();
    const [group, setGroup] = useState<any>(null);
    const [member, setMember] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!groupId || !memberRollNumber) return;
            try {
                const refreshed = await getGroup(groupId, true);
                if (refreshed) {
                    setGroup(refreshed);
                    const m = refreshed.members.find((m: any) => m.memberRollNumber === memberRollNumber);
                    if (m) {
                        setMember(m);
                        if (m.paidDeposit) {
                            setIsSuccess(true);
                        }
                    } else {
                        toast.error('Member not found in this group');
                    }
                } else {
                    toast.error('Group not found');
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load payment details');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [groupId, memberRollNumber, getGroup]);

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

    const handlePayment = async () => {
        if (!group || !member) return;
        setIsProcessing(true);
        try {
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) throw new Error('Failed to load Razorpay SDK');

            const amount = getEffectivePricePerMember(group);
            const amountPaise = amount * 100;

            const order = await paymentsApi.createOrder(
                amountPaise,
                `m_${memberRollNumber.slice(0, 10)}_${Date.now()}`,
                { groupId, memberRollNumber, type: 'individual_payment' }
            );

            const { keyId } = await paymentsApi.getKey();

            const options = {
                key: keyId,
                amount: order.amount,
                currency: 'INR',
                name: 'Signature Day',
                description: `Payment for ${group.name}`,
                order_id: order.id,
                prefill: {
                    name: member.name,
                    email: member.email,
                    contact: member.phone
                },
                handler: async (response: any) => {
                    try {
                        const verifyRes = await paymentsApi.verifyBulk({
                            ...response,
                            groupId,
                            unpaidMemberRolls: [memberRollNumber]
                        });

                        if (!verifyRes.success) throw new Error(verifyRes.message || 'Payment verification failed');
                        setIsSuccess(true);
                        toast.success('Payment successful!');
                    } catch (err) {
                        console.error(err);
                        toast.error(err instanceof Error ? err.message : 'Failed to verify payment');
                    } finally {
                        setIsProcessing(false);
                    }
                },
                modal: { ondismiss: () => setIsProcessing(false) },
                theme: { color: '#6d28d9' }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Payment failed');
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
            </div>
        );
    }

    if (!group || !member) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                        <CardTitle>Error</CardTitle>
                        <CardDescription>Could not find group or member details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate('/')} className="w-full bg-purple-600">Go Home</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
            <Card className="w-full max-w-lg shadow-2xl border-none">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className={`h-8 w-8 ${isSuccess ? 'text-green-600' : 'text-purple-600'}`} />
                    </div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                        {isSuccess ? 'Payment Successful!' : 'Complete Your Payment'}
                    </CardTitle>
                    <CardDescription className="text-base text-gray-600">
                        {isSuccess
                            ? `Thank you, ${member.name}! Your payment has been confirmed.`
                            : `Hi ${member.name}, please complete your payment for ${group.name}.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Group Name</span>
                            <span className="font-semibold text-gray-900">{group.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Member Name</span>
                            <span className="font-semibold text-gray-900">{member.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Roll Number</span>
                            <span className="font-semibold text-gray-900">{member.memberRollNumber}</span>
                        </div>
                        <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-base font-bold text-gray-900">Amount to Pay</span>
                            <span className="text-2xl font-extrabold text-purple-600">₹{getEffectivePricePerMember(group)}</span>
                        </div>
                    </div>

                    {!isSuccess ? (
                        <Button
                            onClick={handlePayment}
                            disabled={isProcessing}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white h-12 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                        >
                            {isProcessing ? (
                                <>
                                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                `Pay ₹${getEffectivePricePerMember(group)} Now`
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => navigate(`/success?groupId=${groupId}`)}
                            className="w-full bg-green-600 text-white h-12 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                        >
                            Go to Group Page
                        </Button>
                    )}

                    <p className="text-center text-xs text-gray-400">
                        Secure payment processing by Razorpay
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default MemberPayment;
