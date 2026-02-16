// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, 'Name is required'],
//       trim: true
//     },
//     email: {
//       type: String,
//       required: [true, 'Email is required'],
//       unique: true,
//       trim: true,
//       lowercase: true,
//       match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
//     },
//     password: {
//       type: String,
//       required: [true, 'Password is required'],
//       minlength: [6, 'Password must be at least 6 characters long']
//     },
//     googleId: {
//       type: String,
//       sparse: true,
//       index: true
//     },
//     profileImage: {
//       type: String
//     },
//     isLeader: {
//       type: Boolean,
//       default: false
//     },
//     isAdmin: {
//       type: Boolean,
//       default: false
//     },
//     groupId: {
//       type: String,
//       default: null
//     },
//     resetPasswordToken: {
//       type: String,
//       default: null
//     },
//     resetPasswordExpires: {
//       type: Date,
//       default: null
//     }
//   },
//   {
//     timestamps: true
//   }
// );

// // Add indexes for frequently queried fields
// userSchema.index({ groupId: 1 }); // For finding users by group
// userSchema.index({ isLeader: 1 }); // For finding leaders
// // Optional TTL-like usage with manual cleanup; helpful for queries
// userSchema.index({ resetPasswordExpires: 1 });

// // Hash password before saving
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) {
//     return next();
//   }
  
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // Method to compare password
// userSchema.methods.matchPassword = async function(enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// const User = mongoose.model('User', userSchema);

// export default User;

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long']
    },
    googleId: {
      type: String,
      sparse: true,
      index: true
    },
    profileImage: {
      type: String
    },
    isLeader: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    groupId: {
      type: String,
      default: null
    },
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    },
    guidesSeen: {
      dashboard: { type: Boolean, default: false },
      editor: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

// Add indexes for frequently queried fields
userSchema.index({ groupId: 1 }); // For finding users by group
userSchema.index({ isLeader: 1 }); // For finding leaders
// Optional TTL-like usage with manual cleanup; helpful for queries
userSchema.index({ resetPasswordExpires: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;