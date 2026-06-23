import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema(
  {
    parentAuthor: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Testimonial message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number between 1 and 5',
      },
    },
    isApproved: {
      type: Boolean,
      default: false,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
  },
  { timestamps: true }
);

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

export default Testimonial;