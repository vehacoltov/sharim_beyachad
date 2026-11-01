const express = require("express")
const verifyToken = require("../middleware/verifyToken")
const { getCurrentUser } = require("../controllers/AuthController")

const router = express.Router()

// Authentication מתבצע ב-verifyToken לפני הבקר; הבקר מחזיר את ה-session העדכני.
router.get("/me", verifyToken, getCurrentUser)

module.exports = router
