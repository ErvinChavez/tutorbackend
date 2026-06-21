import mongoose from 'mongoose';

/**
 * Establishes a connection to MongoDB Atlas using the MONGODB_URI
 * environment variable. Exits the process on an initial connection
 * failure so the app never runs in a half-started state.
 */
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Fail fast: a backend with no database is not safe to keep running.
    process.exit(1);
  }
};

/**
 * Runtime listeners for connection drops that occur AFTER the initial
 * successful connection (e.g. Atlas failover or network blips).
 */
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB runtime error: ${err.message}`);
});

export default connectDB;