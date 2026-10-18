const { createHash } = require("crypto")

// לאחר חמש שגיאות בתוך חלון של רבע שעה נחסמות התחברות ובדיקת הרשאת עובד לחמש דקות.
const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 5 * 60 * 1000
// מגבילים את הזיכרון שתופס המנגנון; מפתחות כוללים hash ולא מזהה משתמש גלוי.
const MAX_ENTRIES = 10000
const attempts = new Map()

// מחשב מפתח קבוע לפי סוג הפעולה, כתובת ה-IP ופרטי הזיהוי, בלי לשמור אותם כטקסט.
const makeKey = (scope, ipAddress, identifier) => createHash("sha256")
    .update(`${scope}\0${ipAddress}\0${identifier}`)
    .digest("hex")

const cleanupExpiredEntries = (now) => {
    // מסיר רק רשומות שחלפו גם תקופת החסימה וגם חלון הספירה שלהן.
    for (const [key, attempt] of attempts) {
        if (attempt.lockUntil <= now && attempt.windowStartedAt + WINDOW_MS <= now) {
            attempts.delete(key)
        }
    }
}

const getLoginLock = (scope, ipAddress, identifier, now = Date.now()) => {
    const key = makeKey(scope, ipAddress, identifier)
    const attempt = attempts.get(key)
    if (!attempt || attempt.lockUntil <= now) return { key, retryAfterSeconds: 0 }
    return { key, retryAfterSeconds: Math.ceil((attempt.lockUntil - now) / 1000) }
}

const recordLoginFailure = (key, now = Date.now()) => {
    cleanupExpiredEntries(now)
    const current = attempts.get(key)
    if (!current || current.windowStartedAt + WINDOW_MS <= now) {
        if (!current && attempts.size >= MAX_ENTRIES) {
            // כאשר המפה מלאה, מפנים את הרשומה הוותיקה ביותר לפני הוספת חדשה.
            const oldestKey = attempts.keys().next().value
            if (oldestKey !== undefined) attempts.delete(oldestKey)
        }
        attempts.set(key, { failures: 1, windowStartedAt: now, lockUntil: 0 })
        return
    }

    current.failures += 1
    if (current.failures >= MAX_FAILURES) {
        current.lockUntil = now + LOCK_MS
    }
}

const clearLoginFailures = (key) => attempts.delete(key)

module.exports = { getLoginLock, recordLoginFailure, clearLoginFailures }
