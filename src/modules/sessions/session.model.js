import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    // Reference to the student this session belongs to.
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'A session must be linked to a student'],
      index: true, // sessions are frequently queried by student
    },
    date: {
      type: Date,
      required: [true, 'Session date is required'],
      default: Date.now,
    },
    durationMinutes: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
    },
    subject: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['PAID', 'UNPAID', 'OVERDUE'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'UNPAID',
    },
  },
  { timestamps: true }
);

const Session = mongoose.model('Session', sessionSchema);

export default Session;