import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createAmbassador, loginAmbassadorByPhone } from '@/lib/ambassadorApi';
import { toast } from 'sonner';
import PhoneOtpWidgetIndia from '@/components/otp/PhoneOtpWidgetIndia';
import {
  Clock, User, School, MapPin, Mail,
  Smartphone, ShieldCheck, ArrowLeft, Shirt, Heart, Star, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '@/components/seo/SEOHead';

// Shared Animated Background component logic
const FloatingElement = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    className={`absolute ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{
      opacity: [0.3, 0.6, 0.3],
      y: [0, -20, 0],
      rotate: [0, 5, 0]
    }}
    transition={{
      duration: 5,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    {children}
  </motion.div>
);

const AnimatedBackground = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50" />
    <FloatingElement className="top-20 left-[10%] text-purple-200" delay={0}>
      <Shirt className="w-16 h-16 opacity-30" />
    </FloatingElement>
    <FloatingElement className="top-40 right-[15%] text-pink-200" delay={1.2}>
      <Camera className="w-12 h-12 opacity-30" />
    </FloatingElement>
    <FloatingElement className="bottom-32 left-[20%] text-yellow-200" delay={2.4}>
      <Heart className="w-10 h-10 opacity-30" />
    </FloatingElement>
    <FloatingElement className="top-60 right-[25%] text-purple-300" delay={1.8}>
      <Star className="w-8 h-8 opacity-30" />
    </FloatingElement>
  </div>
);

export default function AmbassadorSignup() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    college: '',
    city: '',
  });
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginVerifiedPhone, setLoginVerifiedPhone] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [waitlistId, setWaitlistId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.whatsapp || !formData.college || !formData.city) {
      toast.error('Please fill all fields');
      return;
    }

    if (!verifiedPhone) {
      toast.error('Please verify your phone number with the OTP');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await createAmbassador({
        name: formData.name,
        email: formData.email,
        phone: verifiedPhone,
        college: formData.college,
        city: formData.city,
      });

      if ('waitlistId' in response && response.waitlistId) {
        setWaitlistId(response.waitlistId);
        setSubmitted(true);
        toast.success('Waitlist registration successful!');
      } else if ('id' in response && response.id) {
        toast.success('Account created successfully!');
        navigate(`/ambassador/${response.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginVerifiedPhone) {
      toast.error('Please verify your phone number first');
      return;
    }

    try {
      setIsSubmitting(true);
      const ambassador = await loginAmbassadorByPhone(loginVerifiedPhone);
      if (!ambassador?.id) {
        toast.error('Ambassador not found');
        return;
      }

      localStorage.setItem('ambassadorId', ambassador.id);
      localStorage.setItem('ambassadorProfile', JSON.stringify(ambassador));

      toast.success(`Welcome back, ${ambassador.name}!`);
      navigate(`/ambassador/${ambassador.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <AnimatedBackground />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="w-full max-w-md border-none shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
              <CardTitle className="text-2xl font-heading">Application Received</CardTitle>
              <CardDescription>We're reviewing your request to join us!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-center">
                <p className="text-sm text-orange-800 leading-relaxed font-medium">
                  We'll notify you via email and WhatsApp once your application is approved.
                  Usually, this takes about 24-48 hours.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Next Steps</h4>
                <div className="grid gap-3">
                  {[
                    "Profile Review",
                    "Email Verification",
                    "Activation & Unique Link",
                    "Start Earning Commissions"
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {waitlistId && (
                <p className="text-[10px] text-center text-slate-400 font-mono">ID: {waitlistId}</p>
              )}

              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => setSubmitted(false)}
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <SEOHead
        title="Campus Ambassador - Signature Day Tshirt"
        description="Join our exclusive Campus Ambassador program and earn while you share."
      />
      <AnimatedBackground />

      {/* Header-like top bar */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between px-2">
        <Link to="/" className="text-slate-500 hover:text-purple-600 transition-colors flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back Home
        </Link>
        <div className="flex items-center gap-2">
          <Shirt className="h-5 w-5 text-purple-600" />
          <span className="font-heading font-bold text-slate-900">Signature Day</span>
        </div>
      </div>

      <Card className="w-full max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-heading bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
            Campus Ambassador
          </CardTitle>
          <CardDescription className="text-slate-500">
            Earn rewards and build your student network
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signup' | 'login')} className="w-full">
            <TabsList className="grid grid-cols-2 p-1 bg-slate-100/50 rounded-2xl mb-8">
              <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Join Program</TabsTrigger>
              <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Login</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative group">
                  <User className="absolute left-4 top-3 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    className="pl-12 h-12 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <School className="absolute left-4 top-3 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    <Input
                      name="college"
                      value={formData.college}
                      onChange={handleChange}
                      placeholder="College"
                      className="pl-12 h-12 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl"
                      required
                    />
                  </div>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-3 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="pl-12 h-12 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl"
                      required
                    />
                  </div>
                </div>

                <div className="relative group">
                  <Mail className="absolute left-4 top-3 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email Address"
                    className="pl-12 h-12 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="relative group">
                    <Smartphone className="absolute left-4 top-3.5 z-10 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    <PhoneOtpWidgetIndia
                      purpose="ambassadorSignup"
                      onVerified={(phone10) => {
                        const n = '+91' + phone10;
                        setVerifiedPhone(n);
                        setFormData(prev => ({ ...prev, whatsapp: n }));
                      }}
                      hideLabel={true}
                    />
                  </div>
                  {!verifiedPhone && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl">
                      <ShieldCheck className="h-4 w-4 text-purple-500" />
                      <p className="text-[11px] text-purple-600 font-medium">Verify your WhatsApp number with an OTP to complete registration</p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all font-bold"
                  disabled={!verifiedPhone || isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Register as Ambassador'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-3">
                  <div className="relative group">
                    <Smartphone className="absolute left-4 top-3.5 z-10 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    <PhoneOtpWidgetIndia
                      purpose="ambassadorLogin"
                      onVerified={(phone10) => setLoginVerifiedPhone('+91' + phone10)}
                      hideLabel={true}
                    />
                  </div>
                  {!loginVerifiedPhone && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl">
                      <ShieldCheck className="h-4 w-4 text-purple-500" />
                      <p className="text-[11px] text-purple-600 font-medium">Verify registered phone with OTP</p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all font-bold"
                  disabled={!loginVerifiedPhone || isSubmitting}
                >
                  {isSubmitting ? 'Authenticating...' : 'Access My Dashboard'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="mt-8 text-slate-400 text-xs">
        By continuing, you agree to our <Link to="/terms-of-service" className="text-purple-500 hover:underline">Terms of Service</Link>
      </p>
    </div>
  );
}
