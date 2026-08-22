import multer from "multer";
import { AppError } from "../lib/errors.js";

export const uploadDocument = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },

  fileFilter: (_req, file, callback) => {
    if (
      file.mimetype !== "application/pdf" ||
      !file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      callback(
        new AppError("Only PDF files are allowed.", 400, "INVALID_FILE_TYPE"),
      );
      return;
    }

    callback(null, true);
  },
});
