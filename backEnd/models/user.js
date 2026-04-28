import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never returned in queries by default
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      // used to invalidate old JWTs after a password change
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// The "Pre-Save" Hook: Your automated security check
userSchema.pre("save", async function () {
  // 1. Check if the password was actually changed.
  // This prevents errors when updating 'lastLogin' or other fields.
  if (!this.isModified("password")) return;

  try {
    // 2. Generate salt and hash the password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);

    // 3. Update the password change timestamp (only for existing users)
    if (!this.isNew) {
      this.passwordChangedAt = new Date();
    }
    
    // No next() needed! The async function resolves and Mongoose continues.
  } catch (err) {
    // If something goes wrong, throwing the error stops the save process
    throw err;
  }
});

// ─── METHOD: compare plain password against hashed password ──────────────────
// Usage in authController: const isMatch = await user.comparePassword(plain)
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// ─── METHOD: check if JWT was issued before a password change ─────────────────
// Usage in auth middleware: if (user.isJWTStale(iat)) → force re-login
userSchema.methods.isJWTStale = function (jwtIssuedAt) {
  if (!this.passwordChangedAt) return false;
  // jwtIssuedAt is in seconds (JWT standard), Date is in ms
  return this.passwordChangedAt.getTime() / 1000 > jwtIssuedAt;
};

// ─── INDEXES ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });

export default mongoose.model("User", userSchema);