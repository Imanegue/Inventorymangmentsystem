import cloudinary from "../config/cloudinary.js";

// ─── UPLOAD IMAGE ───────────────────────────────────────────────
export const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "inventory/products",
      resource_type: "image",
    });

    return result;
  } catch (err) {
    throw new Error(`Cloudinary upload failed: ${err.message}`);
  }
};

// ─── DELETE IMAGE ───────────────────────────────────────────────
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(
      `Cloudinary delete failed for "${publicId}":`,
      err.message
    );
  }
};
