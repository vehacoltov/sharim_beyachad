/*
 * Contract: save(file)->relativePath, remove(relativePath)->void, getUrl(relativePath)->URL.
 * חתימת bytes ואימות MIME מגינים מפני קובץ ממחולל סיומת או כותרת לקוח מזויפת.
 * החלפת המימוש ל-S3/Cloudinary אינה אמורה לשנות את חתימת השירות או הבקרים.
 */
// שכבת האחסון מבודדת את הבקרים מפרטי המערכת הקובצים.
// בעתיד אפשר להחליף את save/remove/getUrl ביישום ענן בלי לשנות את הבקרים.
const crypto = require("crypto")
const fs = require("fs/promises")
const path = require("path")

const uploadsDirectory = path.join(__dirname, "..", "uploads")
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const imageSignatures = [
    { mimeType: "image/jpeg", matches: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
    { mimeType: "image/png", matches: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { mimeType: "image/gif", matches: buffer => buffer.length >= 6 && (buffer.subarray(0, 6).toString() === "GIF87a" || buffer.subarray(0, 6).toString() === "GIF89a") },
    { mimeType: "image/webp", matches: buffer => buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP" }
]

const ensureUploadsDirectory = () => fs.mkdir(uploadsDirectory, { recursive: true })

const validateImage = file => {
    if (!file || !Buffer.isBuffer(file.buffer)) {
        throw new Error("No image file was provided")
    }
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("Image exceeds the 5 MB limit")
    }

    const signature = imageSignatures.find(item => item.matches(file.buffer))
    if (!signature || (file.mimetype && !file.mimetype.startsWith("image/"))) {
        throw new Error("Only JPEG, PNG, GIF, or WebP images are allowed")
    }
    if (file.mimetype && file.mimetype !== signature.mimeType) {
        throw new Error("Image content does not match its declared type")
    }

    return signature.mimeType
}

const save = async file => {
    const mimeType = validateImage(file)
    const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" }
    await ensureUploadsDirectory()
    const filename = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}.${extensions[mimeType]}`
    const absolutePath = path.join(uploadsDirectory, filename)
    await fs.writeFile(absolutePath, file.buffer, { flag: "wx" })
    return `/uploads/${filename}`
}

const remove = async storedPath => {
    if (!storedPath || !storedPath.startsWith("/uploads/")) return
    const filename = path.basename(storedPath)
    await fs.unlink(path.join(uploadsDirectory, filename)).catch(error => {
        if (error.code !== "ENOENT") throw error
    })
}

const getUrl = storedPath => storedPath

module.exports = { save, remove, getUrl, validateImage, uploadsDirectory }
