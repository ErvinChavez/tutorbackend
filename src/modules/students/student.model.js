import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    // ---- Student details ----
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    gradeLevel: {
      type: String,
      trim: true,
    },
    subjects: {
      type: [String],
      default: [],
    },

    // ---- Parent / guardian details ----
    parentName: {
      type: String,
      required: [true, 'Parent name is required'],
      trim: true,
    },
    parentEmail: {
      type: String,
      required: [true, 'Parent email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    parentPhone: {
      type: String,
      required: [true, 'Parent phone is required'],
      trim: true,
      match: [/^[+]?[\d\s()-]{7,20}$/, 'Please provide a valid phone number'],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

 
    originalRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      default: null,
    },
  },
  { timestamps: true }
);

const Student = mongoose.model('Student', studentSchema);

export default Student;