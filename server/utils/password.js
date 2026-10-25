const bcrypt = require("bcrypt")
const crypto = require("crypto")

// מספר הסבבים קובע את עלות חישוב ה-hash; הגדלתו מקשה על ניחוש סיסמאות אך מאטה אימות.
const SALT_ROUNDS = 12
// bcrypt מתחשב בעד 72 בתים. מודדים בתים ולא תווים, כי UTF-8 עשוי לייצג תו בכמה בתים.
const MAX_PASSWORD_BYTES = 72

const isValidPassword = (password) =>
    typeof password === "string" &&
    password.length > 0 &&
    Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES

// bcrypt מוסיף salt אקראי כחלק מה-hash, ולכן לא שומרים או משווים את הסיסמה הגלויה ישירות.
const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS)
const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value)
const verifyPassword = async (password, hash) => {
    if (isBcryptHash(hash)) return bcrypt.compare(password, hash)

    // תמיכה חד-פעמית ברישומים ישנים ששמרו טקסט גלוי עד שהכניסה הראשונה מעדכנת אותם ל-hash.
    const passwordBuffer = Buffer.from(password)
    const hashBuffer = Buffer.from(hash)
    return passwordBuffer.length === hashBuffer.length && crypto.timingSafeEqual(passwordBuffer, hashBuffer)
}

module.exports = { isValidPassword, hashPassword, isBcryptHash, verifyPassword }
