import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true
  },
  memberRollNumber: {
    type: String,
    required: true,
    trim: true
  },
  photo: {
    type: String,
    required: true
  },
  vote: {
    type: String,
    enum: ['hexagonal', 'square', 'circle', 'any'],
    default: 'square'
  },
  size: {
    type: String,
    enum: ['s', 'm', 'l', 'xl', 'xxl'],
    default: 'm'
  },
  zoomLevel: {
    type: Number,
    required: false,
    default: 0.4,
    min: 0.1,
    max: 2.0
  },
  phone: {
    type: String,
    required: false
  },
  paidDeposit: {
    type: Boolean,
    default: false
  },
  depositAmountPaise: {
    type: Number,
    required: false
  },
  depositOrderId: {
    type: String,
    required: false
  },
  depositPaymentId: {
    type: String,
    required: false
  },
  depositPaidAt: {
    type: Date,
    required: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: false
    },
    yearOfPassing: {
      type: String,
      required: [true, 'Year of passing is required'],
      trim: true
    },
    totalMembers: {
      type: Number,
      required: [true, 'Total members is required'],
      min: [1, 'Total members must be at least 1']
    },
    gridTemplate: {
      type: String,
      enum: ['hexagonal', 'square', 'circle'],
      default: 'square'
    },
    layoutMode: {
      type: String,
      enum: ['square', 'hexagonal', 'voting'],
      default: 'voting'
    },
    shareLink: {
      type: String,
      default: function () {
        return `/join/${this._id}`;
      }
    },
    members: [memberSchema],
    votes: {
      hexagonal: {
        type: Number,
        default: 0
      },
      square: {
        type: Number,
        default: 0
      },
      circle: {
        type: Number,
        default: 0
      },
      any: {
        type: Number,
        default: 0
      }
    },
    ambassadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ambassador',
      default: null
    },
    referralCode: {
      type: String,
      trim: true,
      default: null
    },
    referredAt: {
      type: Date,
      default: null
    },
    // User who created/owns this group
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: false
    },
    status: {
      type: String,
      enum: ['created', 'paid'],
      default: 'created',
      index: true
    },
    orderTotal: {
      type: Number,
      min: 0,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
groupSchema.index({ createdAt: -1 });
groupSchema.index({ yearOfPassing: 1 });
groupSchema.index({ 'members.memberRollNumber': 1 });
groupSchema.index({ ambassadorId: 1, createdAt: -1 });
groupSchema.index({ createdByUserId: 1, createdAt: -1 });
groupSchema.index({ referralCode: 1, createdByUserId: 1 });

// Virtual for calculating current member count
groupSchema.virtual('currentMemberCount').get(function () {
  return this.members.length;
});

// Method to check if group is full
groupSchema.methods.isFull = function () {
  return this.members.length >= this.totalMembers;
};

// Method to add a new member
groupSchema.methods.addMember = function (memberData) {
  if (this.isFull()) {
    throw new Error('Group is already full');
  }

  this.members.push(memberData);
  this.votes[memberData.vote]++;

  return this;
};

// Method to update grid template based on votes
groupSchema.methods.updateGridTemplate = function () {
  const votes = this.votes;
  let maxVotes = 0;
  let winningTemplate = this.gridTemplate;

  for (const [template, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      winningTemplate = template;
    }
  }

  this.gridTemplate = winningTemplate;
  return this;
};

const Group = mongoose.model('Group', groupSchema);

export default Group;


