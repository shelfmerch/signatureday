import mongoose from 'mongoose';

const variationTemplateSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    index: true
  },
  variantId: {
    type: String,
    required: true
  },
  gridType: {
    type: String,
    enum: ['square', 'hexagonal'],
    default: 'square',
    index: true
  },
  centerMemberId: {
    type: String,
    required: true
  },
  centerMemberName: {
    type: String
  },
  imageUrl: {
    type: String,
    required: true
  },
  // Store image metadata
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  sizeBytes: {
    type: Number
  },
  format: {
    type: String,
    default: 'png'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
variationTemplateSchema.index({ orderId: 1, variantId: 1 }, { unique: true });

const VariationTemplate = mongoose.model('VariationTemplate', variationTemplateSchema);

export default VariationTemplate;
