import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

// ─── CLOUDINARY STORAGE ─────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "inventory/products",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

// ─── FILE FILTER ────────────────────────────────
const fileFilter = (req, file, cb) => {
  console.log("Uploading file:", file.originalname, file.mimetype);

  // Accept images only (broader + safer for Postman uploads)
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`), false);
  }
};

// ─── MULTER CONFIG ──────────────────────────────
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit per image
  },
});