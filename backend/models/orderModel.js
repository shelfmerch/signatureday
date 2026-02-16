import mongoose from 'mongoose';

const AdminMemberSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    memberRollNumber: { type: String, required: true },
    photo: { type: String, required: true },
    vote: { type: String, enum: ['square', 'hexagonal', 'circle', 'any'], required: false },
    joinedAt: { type: Date, required: true },
    size: { type: String, enum: ['s', 'm', 'l', 'xl', 'xxl'], required: false },
    phone: { type: String, required: false }
  },
  { _id: false }
);

const ShippingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    size: { type: String, enum: ['s', 'm', 'l', 'xl', 'xxl'], required: false }
  },
  { _id: false }
);

const OrderSettingsSchema = new mongoose.Schema(
  {
    widthPx: { type: Number, required: true },
    heightPx: { type: Number, required: true },
    keepAspect: { type: Boolean, default: true },
    gapPx: { type: Number, default: 4 },
    cellScale: { type: Number, default: 1.0 },
    dpi: { type: Number, default: 300 }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    clientOrderId: { type: String },
    status: { type: String, enum: ['new', 'in_progress', 'ready', 'shipped'], default: 'new', index: true },
    paid: { type: Boolean, default: false, index: true },
    paymentId: { type: String },
    paidAt: { type: Date },
    description: { type: String },
    gridTemplate: { type: String, enum: ['square', 'hexagonal', 'circle'], required: true },
    members: { type: [AdminMemberSchema], default: [] },
    shipping: { type: ShippingSchema, required: true },
    settings: { type: OrderSettingsSchema, required: true },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      index: true
    },
    centerVariantImages: {
      type: [{
        variantId: { type: String, required: true },
        imageUrl: { type: String, required: true },
        centerMemberName: { type: String },
        gridType: { type: String, enum: ['square', 'hexagonal'], default: 'square' }
      }],
      default: []
    }
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ clientOrderId: 1 }, { unique: false });

// Provide a stable "id" field in JSON responses
OrderSchema.virtual('id').get(function () {
  return this.clientOrderId || this._id.toString();
});

OrderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    delete ret._id;
  }
});

const Order = mongoose.model('Order', OrderSchema);

export default Order;


