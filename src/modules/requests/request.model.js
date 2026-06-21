import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    parentName: {
      type: String,
      required: [true, 'Parent name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      // Accepts optional leading +, digits, spaces, parentheses and dashes.
      match: [/^[+]?[\d\s()-]{7,20}$/, 'Please provide a valid phone number'],
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    gradeLevel: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'ACCEPTED', 'DECLINED'],
        message: '{VALUE} is not a valid status',
      },
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

const Request = mongoose.model('Request', requestSchema);

export default Request;