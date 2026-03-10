import React from 'react';
import { format } from 'date-fns';
import { Order } from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface InvoiceLayoutProps {
    order: Order;
}

const COMPANY_DETAILS = {
    name: "CHITLU INNOVATIONS PRIVATE LIMITED",
    address: "G2, Win Win Towers, Siddhi Vinayaka Nagar, Madhapur, Hyderabad, Telangana – 500081, India",
    gstin: "36AAHCC5155C1ZW",
    cin: "U74999TG2018PTC123754",
    email: "support@signatureday.com",
    phone: "+91-XXXXXXXXXX", // Replace with actual if known
    logoUrl: "/logo.png", // Assuming logo path
};

export const InvoiceLayout: React.FC<InvoiceLayoutProps> = ({ order }) => {
    const invoiceDate = order.paidAt ? new Date(order.paidAt) : new Date(order.createdAt);
    const invoiceNumber = `INV-${order.id.slice(-8).toUpperCase()}-${format(invoiceDate, 'yyyyMMdd')}`;

    // Calculate totals
    const ITEM_PRICE = 189; // Default price per member
    const subtotal = order.members.length * ITEM_PRICE;
    const shipping = 0; // Default shipping fee if not in order
    const tax = 0;
    const totalAmount = subtotal + shipping + tax;

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto text-slate-800 font-sans print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        {/* Logo Placeholder - should be replaced with actual logo */}
                        <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-xl uppercase tracking-tighter">SD</div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">{COMPANY_DETAILS.name}</h1>
                            <p className="text-xs text-slate-500 font-medium tracking-wide">GSTIN: {COMPANY_DETAILS.gstin}</p>
                        </div>
                    </div>
                    <div className="text-[13px] text-slate-500 leading-relaxed max-w-xs">
                        {COMPANY_DETAILS.address}<br />
                        Email: {COMPANY_DETAILS.email}
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-5xl font-extralight text-slate-200 mb-6 tracking-tight">INVOICE</h2>
                    <div className="space-y-1.5 text-sm">
                        <p className="flex justify-end items-center"><span className="text-slate-400 mr-2">Invoice No:</span> <span className="font-semibold text-slate-900">{invoiceNumber}</span></p>
                        <p className="flex justify-end items-center"><span className="text-slate-400 mr-2">Order ID:</span> <span className="font-semibold text-slate-900 font-mono text-xs">{order.id}</span></p>
                        <p className="flex justify-end items-center"><span className="text-slate-400 mr-2">Date:</span> <span className="font-semibold text-slate-900">{format(invoiceDate, 'PPP')}</span></p>
                        <div className="mt-4">
                            <Badge variant={order.paid ? "success" as any : "destructive"} className="uppercase text-[10px] py-0.5 px-3 rounded-full font-bold">
                                {order.paid ? 'PAID' : 'UNPAID'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-16 mb-16">
                <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-slate-100 pb-2">Billing Details</h3>
                    <div className="space-y-1.5">
                        <p className="font-bold text-slate-900 text-xl tracking-tight">{order.shipping.name}</p>
                        <p className="text-sm text-slate-500 font-medium">{order.shipping.email}</p>
                        <p className="text-[13px] text-slate-500 mt-4 leading-relaxed">
                            {order.shipping.line1}<br />
                            {order.shipping.line2 && <>{order.shipping.line2}<br /></>}
                            {order.shipping.city}, {order.shipping.state} {order.shipping.postalCode}<br />
                            {order.shipping.country}
                        </p>
                    </div>
                </div>
                <div className="bg-slate-50/50 p-7 rounded-2xl border border-slate-100 h-fit">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Payment Summary</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center text-slate-500">
                            <span>Method</span>
                            <span className="font-bold text-slate-900 tracking-tight">Razorpay</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                            <span>Transaction ID</span>
                            <span className="font-bold text-slate-900 font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">{order.paymentId || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-slate-500">
                            <span>Payment Date</span>
                            <span className="font-bold text-slate-900">{order.paidAt ? format(new Date(order.paidAt), 'MMMM dd, yyyy') : '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Items Table */}
            <div className="mb-16">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-slate-900/5">
                            <th className="pb-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Description</th>
                            <th className="pb-4 px-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Quantity</th>
                            <th className="pb-4 px-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Unit Price</th>
                            <th className="pb-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {order.members.map((member) => (
                            <tr key={member.id} className="group transition-colors hover:bg-slate-50/50">
                                <td className="py-5">
                                    <p className="font-bold text-slate-900 text-[15px] tracking-tight truncate max-w-sm">Signature Day Member • {member.name}</p>
                                    <p className="text-[12px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider">{order.groupName || 'No Group'} • {member.memberRollNumber}</p>
                                </td>
                                <td className="py-5 px-4 text-center text-slate-600 font-semibold">01</td>
                                <td className="py-5 px-4 text-right text-slate-600 font-medium whitespace-nowrap">₹{ITEM_PRICE.toFixed(2)}</td>
                                <td className="py-5 text-right font-bold text-slate-900 whitespace-nowrap">₹{ITEM_PRICE.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary Section */}
            <div className="flex justify-end pt-8 border-t border-slate-100">
                <div className="w-full max-w-xs space-y-6">
                    <div className="space-y-3 text-sm font-medium text-slate-500">
                        <div className="flex justify-between items-center">
                            <span>Items Subtotal</span>
                            <span className="text-slate-900 font-bold tracking-tight">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Shipping Fee</span>
                            <span className="font-bold text-slate-900 tracking-tight">₹{shipping.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Processing Tax (0%)</span>
                            <span className="font-bold text-slate-900 tracking-tight">₹{tax.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                        <div className="flex justify-between items-center text-xl font-black text-slate-900 tracking-tighter uppercase whitespace-nowrap">
                            <span className="mr-8">Total Amount</span>
                            <span>₹{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {order.paid && (
                        <div className="bg-emerald-500 text-white px-5 py-4 rounded-2xl flex justify-between items-center shadow-lg shadow-emerald-500/20 translate-y-2">
                            <div className="flex items-center space-x-2">
                                <div className="h-6 w-6 bg-white/20 rounded-full flex items-center justify-center">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest">Amount Paid</span>
                            </div>
                            <span className="text-lg font-black tracking-tight">₹{totalAmount.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-8 border-t border-slate-100 text-center space-y-2">
                <p className="text-sm font-medium text-slate-900">Thank you for your business!</p>
                <p className="text-xs text-slate-400 italic">This is a system generated invoice and doesn't require a signature.</p>
                <div className="flex justify-center space-x-4 pt-4 text-[10px] text-slate-300 uppercase tracking-widest font-bold">
                    <span>{COMPANY_DETAILS.gstin}</span>
                    <span>•</span>
                    <span>{COMPANY_DETAILS.cin}</span>
                </div>
            </div>
        </div>
    );
};
