
import { Button } from "@/components/ui/button";
import { Users, Camera, Shirt, Heart, Sparkles, Star, ArrowRight, Zap, MessageCircle, X, CheckCircle, Instagram, Youtube } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import SEOHead from "@/components/seo/SEOHead";

// Animated background components (reused from Index.tsx)
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

const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const WhatsAppSupport = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-2xl p-6 border border-green-100 min-w-[280px]"
                    >
                        <div className="flex flex-col gap-3">
                            <h3 className="text-xl font-bold text-[#075E54] flex items-center gap-2">
                                <WhatsAppIcon className="h-6 w-6 text-[#25D366]" />
                                WhatsApp Support
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Message us on WhatsApp for any help with your Signature Day Tee!
                            </p>
                            <a
                                href="https://wa.me/917036365724"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-lg font-bold text-white transition-all bg-[#25D366] hover:bg-[#128C7E] p-3 rounded-xl shadow-md border-b-4 border-black/10 active:border-b-0 active:translate-y-0.5"
                            >
                                <WhatsAppIcon className="h-5 w-5" />
                                Start Chat
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-16 h-16 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-300 relative group overflow-hidden"
                aria-label="Chat on WhatsApp"
            >
                <div className="absolute inset-0 bg-white/10 group-hover:bg-white/0 transition-colors" />
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X className="h-7 w-7" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="whatsapp"
                            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.2 }}
                        >
                            <WhatsAppIcon className="h-9 w-9" />
                        </motion.div>
                    )}
                </AnimatePresence>
                {!isOpen && (
                    <span className="absolute top-3 right-3 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                )}
            </motion.button>
        </div>
    );
};

const HowItWorks = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const steps = [
        {
            icon: Users,
            title: "1. Create & Share",
            description: "Create a group and share the link with your friends to join.",
            bgColor: "bg-purple-100",
            textColor: "text-purple-600",
            img: "/images/friends_with_tee_cutout .png"
        },
        {
            icon: Sparkles,
            title: "2. Members Join",
            description: "Members fill their details (Name, Phone, Email, Roll No, T-Shirt Size, Photo) and join by paying.",
            bgColor: "bg-pink-100",
            textColor: "text-pink-600",
            img: "/images/signing_group_cutout.png"
        },
        {
            icon: CheckCircle,
            title: "3. Review & Order",
            description: "Leader reviews the group and places the order.",
            bgColor: "bg-green-100",
            textColor: "text-green-600",
            img: "/images/delivery.webp"
        }
    ];

    const handleStartCreating = () => {
        navigate(isAuthenticated ? '/create-group' : '/auth');
    };

    return (
        <>
            <SEOHead
                title="How It Works - Signature Day Tshirt"
                description="Learn how to create your custom farewell T-shirt. A simple 3-step process from group creation to doorstep delivery."
                keywords="how it works, custom t-shirt process, farewell shirt design, group photo collage"
            />

            <style>
                {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Permanent+Marker&family=Comfortaa:wght@400;500;600;700&display=swap');
          
          .font-brand {
            font-family: 'Permanent Marker', cursive;
            letter-spacing: -0.02em;
          }
          
          .font-heading {
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            letter-spacing: -0.03em;
          }
          
          .font-body {
            font-family: 'Comfortaa', cursive;
          }
        `}
            </style>

            <div className="min-h-screen relative bg-background font-body">
                <AnimatedBackground />

                {/* Header */}
                <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-between h-16 lg:h-20">
                            <Link to="/" className="flex items-center gap-3">
                                <div className="relative">
                                    <Shirt className="h-8 w-8 lg:h-10 lg:w-10 text-purple-600" />
                                    <motion.div
                                        className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-pink-500"
                                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                </div>
                                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 text-transparent bg-clip-text">
                                    Signature Day Tshirt
                                </h1>
                            </Link>

                            <Button
                                onClick={handleStartCreating}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                                size="sm"
                            >
                                Start Creating
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="container mx-auto px-4 py-16 lg:py-24 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                        className="max-w-3xl mx-auto space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                            <Zap className="h-4 w-4" />
                            <span>Simple & Transparent Process</span>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-heading bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 text-transparent bg-clip-text">
                            Making Memories is Now Easier!
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            A simple three-step process to get your perfect keepsake without any hassle.
                        </p>
                    </motion.div>
                </section>

                {/* Steps Section */}
                <section className="container mx-auto px-4 py-12 lg:py-24">
                    <div className="space-y-24 max-w-6xl mx-auto">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.7 }}
                                className={`flex flex-col lg:items-center gap-12 ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}
                            >
                                <div className="flex-1 space-y-6">
                                    <div className={`w-16 h-16 rounded-2xl ${step.bgColor} flex items-center justify-center`}>
                                        <step.icon className={`h-8 w-8 ${step.textColor}`} />
                                    </div>
                                    <h2 className="text-3xl lg:text-4xl font-heading text-slate-900">
                                        {step.title}
                                    </h2>
                                    <p className="text-lg text-muted-foreground leading-relaxed">
                                        {step.description}
                                    </p>
                                    {index === 0 && (
                                        <Button
                                            variant="outline"
                                            onClick={handleStartCreating}
                                            className="border-purple-200 hover:bg-purple-50"
                                        >
                                            Get Started <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="relative aspect-video lg:aspect-square rounded-3xl overflow-hidden shadow-2xl bg-white p-4">
                                        <img
                                            src={step.img}
                                            alt={step.title}
                                            className="w-full h-full object-contain rounded-2xl"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section className="container mx-auto px-4 py-24 text-center">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-[3rem] p-8 md:p-12 lg:p-24 text-white shadow-2xl flex flex-col items-center">
                        <h2 className="text-3xl lg:text-5xl font-heading mb-8">Ready to Start Your Journey?</h2>
                        <p className="text-xl mb-12 opacity-90 max-w-2xl mx-auto">Join thousands of students who have immortalized their memories with Signature Day Tshirt.</p>
                        <Button
                            size="lg"
                            onClick={handleStartCreating}
                            className="bg-white text-purple-600 hover:bg-slate-100 px-8 sm:px-12 h-16 text-lg font-bold rounded-2xl w-full sm:w-auto max-w-sm"
                        >
                            Create Your Group Now
                        </Button>
                    </div>
                </section>

                {/* Footer (Simplified from Index.tsx) */}
                <footer className="border-t bg-slate-900 text-slate-200 py-12">
                    <div className="container mx-auto px-4 text-center">
                        <div className="flex flex-col items-center gap-8">
                            <div className="flex items-center gap-8 bg-slate-800/40 p-5 rounded-[2rem] border border-slate-800 backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <Shirt className="h-7 w-7 text-purple-400" />
                                    <span className="font-brand text-white text-2xl tracking-tight">SignatureDayTshirt</span>
                                </div>
                                <div className="h-8 w-px bg-slate-700 hidden sm:block" />
                                <div className="flex items-center gap-4">
                                    <a
                                        href="https://www.instagram.com/signaturedaytshirt/?igsh=NWoyM2Vud3Ftdm9i&utm_source=qr#"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-purple-600 transition-all duration-300 text-slate-300 hover:text-white group"
                                        aria-label="Follow us on Instagram"
                                    >
                                        <Instagram className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </a>
                                    <a
                                        href="https://www.youtube.com/@signaturedaytshirt"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-600 transition-all duration-300 text-slate-300 hover:text-white group"
                                        aria-label="Subscribe to our YouTube channel"
                                    >
                                        <Youtube className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
                                <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">Home</Link>
                                <Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
                                <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
                                <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                                <Link to="/help-center" className="hover:text-white transition-colors">Help Center</Link>
                                <Link to="/ambassador/signup" className="hover:text-white transition-colors">Campus Ambassador</Link>
                            </div>

                            <p className="text-sm text-slate-500">
                                © 2026 SignatureDayTshirt. All rights reserved.
                            </p>
                        </div>
                    </div>
                </footer>

                <WhatsAppSupport />
            </div>
        </>
    );
};

export default HowItWorks;
