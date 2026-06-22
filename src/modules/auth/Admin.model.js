import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Admin name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // Never return the password hash by default. To authenticate, query
      // with `.select('+password')` so matchPassword has access to it.
      select: false,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'SUPER_ADMIN'],
      default: 'ADMIN',
    },
  },
  { timestamps: true }
);

/**
 * Pre-save hook: hash the password ONLY when it has been set or changed.
 *
 * Note: this is an `async` function with NO `next` parameter. Modern Mongoose
 * (6+) runs async middleware in promise mode and does NOT pass a `next`
 * callback — it treats the resolved promise as "done" and a thrown error as
 * the failure. Just `return` early to skip, and `throw` to abort the save.
 */
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Instance method to compare a plaintext login attempt against the
 * stored hash. Returns a boolean.
 */
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;