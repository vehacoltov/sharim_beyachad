const mongoose = require("mongoose")
const { isValidPassword, hashPassword, verifyPassword } = require("../utils/password")
const { createAccessToken } = require("../config/jwt")

// בונה פעולות CRUD למודל, תוך הגבלת שדות והסתרת מידע פרטי מתגובות.
const createModelController = ({ model, editableFields, privateFields = [], passwordField, loginFields = [] }) => {
    const allowedFields = new Set(editableFields)

    // ממיר מסמך Mongoose לאובייקט רגיל ומסיר ממנו שדות פרטיים לפני שליחתו ללקוח.
    const toPublicDocument = (document) => {
        if (!document) return document
        const result = document.toObject()
        for (const field of privateFields) delete result[field]
        return result
    }

    // מוסיף לשאילתה הוראות כדי ששדות פרטיים לא יישלפו ממסד הנתונים.
    const hidePrivateFields = (query) => {
        let safeQuery = query
        for (const field of privateFields) safeQuery = safeQuery.select(`-${field}`)
        return safeQuery
    }

    // מחזיר רשימה של שדות שהבקשה שלחה ואינם מותרים במודל הנוכחי.
    const getUnsupportedFields = (fields) => Object.keys(fields).filter(field => !allowedFields.has(field))

    const isValidPasswordInput = (fields) =>
        !passwordField || !(passwordField in fields) || isValidPassword(fields[passwordField])

    const login = async (req, res) => {
        const { userName, password } = req.body || {}
        if (
            typeof userName !== "string" ||
            !userName.trim() ||
            !isValidPassword(password) ||
            loginFields.length === 0
        ) {
            return res.status(400).json({ message: "A valid userName and password are required" })
        }

        try {
            // אותו userName בבקשה יכול להתאים לאחד משדות ההזדהות שהוגדרו למודל (למשל שם משתמש או אימייל).
            const criteria = loginFields.map(field => ({ [field]: userName.trim() }))
            // סיסמה מוגדרת select:false במודל, לכן שולפים אותה במפורש רק לצורך אימות הכניסה.
            const document = await model.findOne({ $or: criteria }).select(`+${passwordField}`)
            if (!document || !document[passwordField] || !(await verifyPassword(password, document[passwordField]))) {
                return res.status(401).json({ message: "Invalid credentials" })
            }
            // מנפיקים אסימון רק אחרי אימות הסיסמה; ה-hash עצמו מוסר מתשובת המשתמש.
            const accessToken = createAccessToken(document, model.modelName)
            return res.json({
                message: "Login successful",
                accessToken,
                tokenType: "Bearer",
                expiresIn: "1h",
                user: toPublicDocument(document)
            })
        } catch (error) {
            console.error(`Failed to log in ${model.modelName}:`, error)
            return res.status(500).json({ message: `Failed to log in ${model.modelName}` })
        }
    }

    // שולף את כל המסמכים ומסיר שדות פרטיים מתוצאות השאילתה.
    const getAll = async (req, res) => {
        try {
            const documents = await hidePrivateFields(model.find())
            return res.json(documents.map(toPublicDocument))
        } catch (error) {
            return res.status(500).json({ message: `Failed to fetch ${model.modelName} records` })
        }
    }

    // שולף מסמך בודד לפי ObjectId שמתקבל בפרמטר הנתיב.
    const getById = async (req, res) => {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "A valid MongoDB _id is required" })
        }

        try {
            const document = await hidePrivateFields(model.findById(id))
            if (!document) return res.status(404).json({ message: `${model.modelName} not found` })
            return res.json(toPublicDocument(document))
        } catch (error) {
            return res.status(500).json({ message: `Failed to fetch ${model.modelName}` })
        }
    }

    // יוצר מסמך חדש רק מהשדות המותרים ומחזיר שגיאות ולידציה באופן מתאים.
    const create = async (req, res) => {
        const fields = req.body
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
            return res.status(400).json({ message: "A JSON object is required" })
        }

        const unsupportedFields = getUnsupportedFields(fields)
        if (unsupportedFields.length > 0) {
            return res.status(400).json({ message: "Unsupported fields", fields: unsupportedFields })
        }
        if (Object.keys(fields).length === 0) {
            return res.status(400).json({ message: "At least one field is required" })
        }
        if (!isValidPasswordInput(fields)) {
            return res.status(400).json({ message: "Password must be a non-empty string of at most 72 UTF-8 bytes" })
        }

        try {
            const values = { ...fields }
            if (passwordField && passwordField in values) {
                // משנים עותק של נתוני הבקשה כדי לשמור במסד רק hash ולא את הסיסמה המקורית.
                values[passwordField] = await hashPassword(values[passwordField])
            }
            const document = await model.create(values)
            return res.status(201).json(toPublicDocument(document))
        } catch (error) {
            const status = error.name === "ValidationError" || error.name === "CastError" ? 400 : error.code === 11000 ? 409 : 500
            return res.status(status).json({ message: `Failed to create ${model.modelName}` })
        }
    }

    const register = async (req, res) => {
        const fields = req.body
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
            return res.status(400).json({ message: "A JSON object is required" })
        }
        if (!passwordField || !isValidPassword(fields[passwordField])) {
            return res.status(400).json({ message: "A valid password is required" })
        }
        // משתמשים באותה יצירה מאובטחת ומוגבלת שדות, אך מחייבים סיסמה במסלול הרישום.
        return create(req, res)
    }

    // מעדכן רק שדות שנשלחו ומאושרים, כאשר id שבכתובת מזהה את המסמך.
    const update = async (req, res) => {
        const { id } = req.params
        const fields = req.body
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "A valid MongoDB _id is required" })
        }
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
            return res.status(400).json({ message: "A JSON object is required" })
        }

        const unsupportedFields = getUnsupportedFields(fields)
        if (unsupportedFields.length > 0) {
            return res.status(400).json({ message: "Unsupported fields", fields: unsupportedFields })
        }
        if (Object.keys(fields).length === 0) {
            return res.status(400).json({ message: "At least one field is required" })
        }
        if (!isValidPasswordInput(fields)) {
            return res.status(400).json({ message: "Password must be a non-empty string of at most 72 UTF-8 bytes" })
        }

        try {
            const updates = { ...fields }
            if (passwordField && passwordField in updates) {
                // גם שינוי סיסמה עובר hash לפני עדכון; שדות אחרים נשארים ללא שינוי.
                updates[passwordField] = await hashPassword(updates[passwordField])
            }
            // $set מעדכן רק את השדות שהתקבלו; runValidators בודק אותם מול ה־schema.
            const document = await model.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
            if (!document) return res.status(404).json({ message: `${model.modelName} not found` })
            return res.json(toPublicDocument(document))
        } catch (error) {
            const status = error.name === "ValidationError" || error.name === "CastError" ? 400 : error.code === 11000 ? 409 : 500
            return res.status(status).json({ message: `Failed to update ${model.modelName}` })
        }
    }

    // מוחק מסמך לפי מזהה שבנתיב ומחזיר 404 אם לא נמצא מסמך מתאים.
    const remove = async (req, res) => {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "A valid MongoDB _id is required" })
        }

        try {
            const document = await model.findByIdAndDelete(id)
            if (!document) return res.status(404).json({ message: `${model.modelName} not found` })
            return res.json({ message: `${model.modelName} deleted successfully` })
        } catch (error) {
            return res.status(500).json({ message: `Failed to delete ${model.modelName}` })
        }
    }

    return { getAll, getById, create, register, update, remove, ...(passwordField ? { login } : {}) }
}

module.exports = createModelController