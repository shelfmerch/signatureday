import mongoose from 'mongoose';

const VariantRenderStatusSchema = new mongoose.Schema(
    {
        variantId: { type: String, required: true },
        centerMemberId: { type: String },
        centerMemberName: { type: String },
        gridType: { type: String, enum: ['square', 'hexagonal'], default: 'square' },
        imageUrl: { type: String },
        status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
        error: { type: String }
    },
    { _id: false }
);

const OrderRenderStatusSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true
        },
        status: {
            type: String,
            enum: ['queued', 'processing', 'completed', 'failed'],
            default: 'queued',
            index: true
        },
        totalVariants: { type: Number, default: 0 },
        completedVariants: { type: Number, default: 0 },
        variants: [VariantRenderStatusSchema],
        error: { type: String }
    },
    { timestamps: true }
);

const OrderRenderStatus = mongoose.model('OrderRenderStatus', OrderRenderStatusSchema);

export default OrderRenderStatus;
