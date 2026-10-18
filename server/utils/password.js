const bcrypt = require("bcrypt")

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
const verifyPassword = (password, hash) => bcrypt.compare(password, hash)

module.exports = { isValidPassword, hashPassword, verifyPassword }
