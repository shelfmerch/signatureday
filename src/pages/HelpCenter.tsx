import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Shirt, Heart, Star, Camera, Mail, Clock, Globe,
    MessageCircle, X, Shield,
    Package, Truck, HelpCircle, Phone, Info, RefreshCcw, CreditCard
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
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
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
                                Need help with your order? Our team is available 9AM - 6PM IST.
                            </p>
                            <a
                                href="https://wa.me/917036365724"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-lg font-bold text-white transition-all bg-[#25D366] hover:bg-[#128C7E] p-3 rounded-xl shadow-md"
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
                className="w-16 h-16 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-300 relative group"
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

const HelpCenter = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            id: 1,
            title: "Orders & Shipping",
            icon: Package,
            items: [
                { label: "Confirmation", text: "You will receive an order confirmation via email/SMS immediately after placing your order." },
                { label: "Processing Time", text: "Orders are typically processed within 1–3 business days." },
                { label: "Delivery", text: "Standard delivery times vary by location. Track your order status in the dashboard." },
                { label: "Issues", text: "If your order is delayed or has issues, please contact our support team." }
            ],
            color: "purple"
        },
        {
            id: 2,
            title: "Product Information",
            icon: Info,
            items: [
                { label: "Fabric", text: "Premium quality, breathable cotton fabric designed for comfort and durability." },
                { label: "Sizes", text: "Available in multiple sizes. Please refer to our size chart before ordering." },
                { label: "Designs", text: "Vibrant, high-resolution prints that maintain quality after multiple washes." }
            ],
            color: "pink"
        },
        {
            id: 3,
            title: "Returns & Exchanges",
            icon: RefreshCcw,
            items: [
                { label: "Eligible Items", text: "We accept returns/exchanges for damaged or incorrect items delivered." },
                { label: "Timeframe", text: "Requests must be raised within 7 days of receiving the product." },
                { label: "Condition", text: "Items must be unused and in their original packaging with tags intact." }
            ],
            color: "yellow"
        },
        {
            id: 4,
            title: "Payments",
            icon: CreditCard,
            items: [
                { label: "Secure Payments", text: "We support all major UPI, Credit/Debit cards, and Net Banking." },
                { label: "Refunds", text: "Valid refunds are processed within 5-7 business days to the original payment method." },
                { label: "Failed Transactions", text: "If amount is debited but order not placed, it will be auto-refunded by your bank." }
            ],
            color: "purple"
        },
        {
            id: 5,
            title: "Contact Support",
            icon: Phone,
            items: [
                { label: "Phone", text: "703-636-5724" },
                { label: "Hours", text: "Monday – Saturday, 9:00 AM – 6:00 PM IST" },
                { label: "Email", text: "support@shelfmerch.com" }
            ],
            color: "pink"
        }
    ];

    return (
        <>
            <SEOHead
                title="Help Center - Signature Day Tshirt"
                description="Find answers to common questions about orders, shipping, products, and more."
                keywords="help center, support, shipping, returns, signature day"
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
                            <HelpCircle className="h-4 w-4" />
                            <span>Help Center & Support</span>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-heading bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 text-transparent bg-clip-text">
                            How can we help?
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Everything you need to know about your Signature Day order and beyond.
                        </p>
                    </motion.div>
                </section>

                {/* Main Content Grid */}
                <section className="container mx-auto px-4 py-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

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

                            {/* Need More Help specialized card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="col-span-full mt-12"
                            >
                                <Card className="border-none shadow-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Phone className="w-48 h-48" />
                                    </div>
                                    <CardContent className="p-8 lg:p-12 relative z-10 flex flex-col items-center text-center">
                                        <h2 className="text-3xl font-heading mb-4">Still have questions?</h2>
                                        <p className="text-lg opacity-90 leading-relaxed max-w-2xl mb-8">
                                            If you couldn't find what you're looking for, don't worry. Our team is just a call or message away!
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <a
                                                href="tel:7036365724"
                                                className="flex items-center justify-center gap-2 bg-white text-purple-600 font-bold px-8 py-4 rounded-full shadow-lg hover:bg-slate-50 transition-colors"
                                            >
                                                <Phone className="h-5 w-5" />
                                                Call Us Directly
                                            </a>
                                            <a
                                                href="https://wa.me/917036365724"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold px-8 py-4 rounded-full shadow-lg hover:bg-[#128C7E] transition-colors"
                                            >
                                                <WhatsAppIcon className="h-5 w-5" />
                                                WhatsApp Support
                                            </a>
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
                                <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
                                <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                                <Link to="/help-center" className="hover:text-white transition-colors font-bold text-purple-400">Help Center</Link>
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

export default HelpCenter;
