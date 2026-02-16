import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Shirt, Heart, Star, Camera, Mail, Clock, Globe,
    MessageCircle, X, MapPin, Shield,
    Briefcase, Lock, Ban, Scale, FileText, CheckCircle2,
    Database, Handshake
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import SEOHead from "@/components/seo/SEOHead";

// Animated background components
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

const WhatsAppSupport = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-2xl p-6 border border-green-100 min-w-[240px]"
                    >
                        <div className="flex flex-col gap-3">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 text-transparent bg-clip-text flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-green-600" />
                                Chat with Support
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Message us on WhatsApp for any help with your Signature Day Tee!
                            </p>
                            <a
                                href="https://wa.me/917036365724"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-lg font-bold text-white transition-all bg-[#25D366] hover:bg-[#128C7E] p-3 rounded-xl shadow-md"
                            >
                                <MessageCircle className="h-5 w-5" />
                                Message Us
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-300 relative group"
                aria-label="Chat on WhatsApp"
            >
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
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <MessageCircle className="h-7 w-7" />
                        </motion.div>
                    )}
                </AnimatePresence>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                </span>
            </motion.button>
        </div>
    );
};

const TermsOfService = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            id: 1,
            title: "Eligibility",
            icon: CheckCircle2,
            content: "To be eligible for the Program, the Ambassador must be a student currently enrolled in a recognized college or university.",
            color: "purple"
        },
        {
            id: 2,
            title: "Role and Responsibilities",
            icon: Briefcase,
            items: [
                { label: "Promotion", text: "Ambassadors shall promote the Company's products and services within their campus and social circles." },
                { label: "Conduct", text: "Ambassadors must maintain high ethical standards and represent the Company positively." },
                { label: "IP", text: "Use of Company trademarks or logos requires prior written consent." }
            ],
            color: "pink"
        },
        {
            id: 3,
            title: "Compensation",
            icon: Star,
            items: [
                { label: "Commissions", text: "Eligible for commissions based on verified sales using their unique code." },
                { label: "Incentives", text: "Performance-based bonuses or perks as communicated by the Company." },
                { label: "Payment", text: "Commissions will be paid on a monthly basis or as otherwise specified." }
            ],
            color: "yellow"
        },
        {
            id: 4,
            title: "Independent Contractor",
            icon: Handshake,
            content: "The Ambassador is an independent contractor and not an employee of the Company. This Agreement does not create a partnership, joint venture, or agency relationship.",
            color: "purple"
        },
        {
            id: 5,
            title: "Confidentiality",
            icon: Lock,
            content: "The Ambassador may have access to confidential information of the Company and agrees not to disclose such information to any third party without prior written consent.",
            color: "pink"
        },
        {
            id: 6,
            title: "Termination",
            icon: Ban,
            items: [
                { label: "By Ambassador", text: "The Ambassador may terminate their participation with 7 days' notice." },
                { label: "By Company", text: "The Company may terminate participation immediately for any breach of these terms." }
            ],
            color: "yellow"
        },
        {
            id: 7,
            title: "Legal Info",
            icon: Scale,
            items: [
                { label: "Liability", text: "The Company shall not be liable for any indirect, incidental, or consequential damages." },
                { label: "Law", text: "Agreement governed by laws of India. Disputes subject to courts in Hyderabad." }
            ],
            color: "purple"
        }
    ];

    return (
        <>
            <SEOHead
                title="Terms of Service - Signature Day Tshirt"
                description="Terms and conditions for our Campus Ambassador Program."
                keywords="terms of service, signature day, ambassador program"
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
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
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
                                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 text-transparent bg-clip-text font-heading">
                                    Signature Day Tshirt
                                </h1>
                            </Link>
                            <Link to="/auth">
                                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-6">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="container mx-auto px-4 py-16 lg:py-24 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl mx-auto space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                            <Shield className="h-4 w-4" />
                            <span>Legal Agreement & Terms</span>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-heading bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 text-transparent bg-clip-text">
                            Terms of Service
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Everything you need to know about our Campus Ambassador Program and how we work together to create memories.
                        </p>
                    </motion.div>
                </section>

                {/* Main Content Grid */}
                <section className="container mx-auto px-4 py-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Intro Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="col-span-full mb-8"
                            >
                                <Card className="border-none shadow-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <FileText className="w-48 h-48" />
                                    </div>
                                    <CardContent className="p-8 lg:p-12 relative z-10">
                                        <h2 className="text-3xl font-heading mb-4">Welcome to our Program</h2>
                                        <p className="text-lg opacity-90 leading-relaxed max-w-3xl">
                                            These Terms of Service ("Agreement") govern your participation in the Campus Ambassador Program ("Program") offered by SignatureDayTshirt ("Company"). By enrolling in the Program, you ("Ambassador") agree to be bound by these terms.
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {sections.map((section, idx) => (
                                <motion.div
                                    key={section.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Card className="h-full border-none shadow-lg hover:shadow-2xl transition-all duration-300 group">
                                        <CardHeader className="pb-4">
                                            <div className={`w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                <section.icon className={`h-6 w-6 text-purple-600`} />
                                            </div>
                                            <CardTitle className="text-xl font-heading flex items-center gap-2">
                                                <span className="text-slate-400 text-sm font-body">0{section.id}</span>
                                                {section.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-slate-600 leading-relaxed">
                                            {section.content && <p>{section.content}</p>}
                                            {section.items && (
                                                <ul className="space-y-3">
                                                    {section.items.map((item, i) => (
                                                        <li key={i} className="flex flex-col gap-1">
                                                            <span className="font-bold text-slate-800 text-sm underline decoration-purple-200">{item.label}</span>
                                                            <span className="text-sm">{item.text}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}

                            {/* Data Privacy Specialized Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="col-span-full lg:col-span-2"
                            >
                                <Card className="h-full border-none shadow-xl bg-slate-900 text-white overflow-hidden">
                                    <CardHeader className="bg-slate-800/50 p-6">
                                        <CardTitle className="flex items-center gap-3 font-heading text-2xl">
                                            <Database className="text-pink-500" />
                                            Data Privacy & Protection
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 grid md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-pink-400">Collection & Use</h4>
                                            <p className="text-sm text-slate-400 leading-relaxed">
                                                We collect limited data (Name, College, UPI) strictly for verifying orders and processing payments. We never sell or commercially exploit your personal information.
                                            </p>
                                            <ul className="text-xs text-slate-500 space-y-2">
                                                <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" /> Encrypted storage</li>
                                                <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" /> Limited access protocol</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-pink-400">Your Consent</h4>
                                            <p className="text-sm text-slate-400 leading-relaxed">
                                                By enrolling, you explicitly consent to the collection and use of data as outlined, in accordance with the IT Act 2000 and Digital Personal Data Protection Act 2023.
                                            </p>
                                            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                                                <p className="text-xs italic text-slate-400">"Data is retained only as long as necessary for business, legal, or compliance requirements."</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Contact Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <Card className="h-full border-none shadow-xl bg-purple-50">
                                    <CardHeader>
                                        <CardTitle className="font-heading text-xl">Get in Touch</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="text-purple-600 h-5 w-5 mt-1" />
                                            <div className="text-sm">
                                                <p className="font-bold">Headquarters</p>
                                                <p className="text-slate-600">Chitlu Innovations Private Limited</p>
                                                <p className="text-slate-600">G2, Win Win Towers,
                                                    Siddhi Vinayaka Nagar,
                                                    Madhapur, Hyderabad,
                                                    Telangana – 500081, India</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Mail className="text-purple-600 h-5 w-5" />
                                            <a href="mailto:support@shelfmerch.com" className="text-sm hover:underline">support@shelfmerch.com</a>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Globe className="text-purple-600 h-5 w-5" />
                                            <a href="https://signaturedaytshirt.com/" className="text-sm hover:underline">https://signaturedaytshirt.com/</a>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t bg-slate-900 text-slate-200 py-12">
                    <div className="container mx-auto px-4 text-center">
                        <div className="flex flex-col items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Shirt className="h-6 w-6 text-purple-400" />
                                <span className="font-brand text-white text-xl">SignatureDayTshirt</span>
                            </div>
                            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
                                <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">Home</Link>
                                <Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
                                <Link to="/terms-of-service" className="hover:text-white transition-colors font-bold text-purple-400">Terms of Service</Link>
                                <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                                <Link to="/help-center" className="hover:text-white transition-colors">Help Center</Link>
                                <Link to="/ambassador/signup" className="hover:text-white transition-colors">Campus Ambassador</Link>
                            </div>
                            <p className="text-sm text-slate-500 mt-8">
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

export default TermsOfService;
