const mongoose = require("mongoose")
const { isValidPassword, hashPassword, verifyPassword } = require("../utils/password")
const { createAccessToken } = require("../config/jwt")
const { getLoginLock, recordLoginFailure, clearLoginFailures } = require("../utils/loginRateLimiter")

// בונה פעולות CRUD למודל, תוך הגבלת שדות והסתרת מידע פרטי מתגובות.
const createModelController = ({
    model,
    editableFields,
    privateFields = [],
    passwordField,
    loginFields = [],
    loginIdentifierField = "userName",
    loginIdentifierValidator = value => typeof value === "string" && Boolean(value.trim()),
    loginIdentifierLookup = value => value.trim(),
    prepareFields = async fields => fields,
    prepareCreateFields = prepareFields,
    // מאפשר ל-controller של משתמש לדרוש אישור נוסף לפני שמירת הרשמה.
    prepareRegistration = async fields => ({ fields }),
    // שדות מערכת שניתן להוסיף רק אחרי שהשרת אימת אותם במהלך הרשמה.
    registrationOnlyFields = [],
    // מאפשר לחתום JWT בתפקיד שנשמר במסמך במקום בשם המודל.
    tokenRoleField,
    validateFields = () => null
}) => {
    const allowedFields = new Set(editableFields)
    const allowedRegistrationFields = new Set([...editableFields, ...registrationOnlyFields])

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
        const body = req.body || {}
        const identifier = body[loginIdentifierField]
        const { password } = body
        if (
            !loginIdentifierValidator(identifier) ||
            !isValidPassword(password) ||
            loginFields.length === 0
        ) {
            return res.status(400).json({ message: `A valid ${loginIdentifierField} and password are required` })
        }

        // מגבלת ניסיונות נפרדת לכל מודל, כתובת IP וערך זיהוי.
        const ipAddress = req.ip || req.socket?.remoteAddress || "unknown"
        const { key, retryAfterSeconds } = getLoginLock(model.modelName, ipAddress, identifier)
        if (retryAfterSeconds > 0) {
            res.set("Retry-After", String(retryAfterSeconds))
            return res.status(429).json({
                message: "Too many failed login attempts. Try again later.",
                retryAfterSeconds
            })
        }

        try {
            const lookupValue = loginIdentifierLookup(identifier)
            const criteria = loginFields.map(field => ({ [field]: lookupValue }))
            // סיסמה מוגדרת select:false במודל, לכן שולפים אותה במפורש רק לצורך אימות הכניסה.
            const document = await model.findOne({ $or: criteria }).select(`+${passwordField}`)
            if (!document || !document[passwordField] || !(await verifyPassword(password, document[passwordField]))) {
                recordLoginFailure(key)
                const lock = getLoginLock(model.modelName, ipAddress, identifier)
                if (lock.retryAfterSeconds > 0) {
                    res.set("Retry-After", String(lock.retryAfterSeconds))
                    return res.status(429).json({
                        message: "Too many failed login attempts. Try again later.",
                        retryAfterSeconds: lock.retryAfterSeconds
                    })
                }
                return res.status(401).json({ message: "Invalid credentials" })
            }
            clearLoginFailures(key)
            // מנפיקים אסימון רק אחרי אימות הסיסמה; ה-hash עצמו מוסר מתשובת המשתמש.
            const accessToken = createAccessToken(
                document,
                tokenRoleField ? document[tokenRoleField] : model.modelName
            )
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
    const create = async (req, res, trustedFields = []) => {
        const fields = req.body
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
            return res.status(400).json({ message: "A JSON object is required" })
        }

        const allowedFieldsForRequest = new Set([...allowedFields, ...trustedFields])
        const unsupportedFields = Object.keys(fields).filter(field => !allowedFieldsForRequest.has(field))
        if (unsupportedFields.length > 0) {
            return res.status(400).json({ message: "Unsupported fields", fields: unsupportedFields })
        }
        if (Object.keys(fields).length === 0) {
            return res.status(400).json({ message: "At least one field is required" })
        }
        const validationMessage = validateFields(fields)
        if (validationMessage) {
            return res.status(400).json({ message: validationMessage })
        }
        if (!isValidPasswordInput(fields)) {
            return res.status(400).json({ message: "Password must be a non-empty string of at most 72 UTF-8 bytes" })
        }

        try {
            const values = await prepareCreateFields({ ...fields })
            if (passwordField && passwordField in values) {
                // משנים עותק של נתוני הבקשה כדי לשמור במסד רק hash ולא את הסיסמה המקורית.
                values[passwordField] = await hashPassword(values[passwordField])
            }
            const document = await model.create(values)
            return res.status(201).json(toPublicDocument(document))
        } catch (error) {
            console.error("Create error:", error);
            if (error.code === 11000) {
                const duplicateFields = Object.keys(error.keyPattern || error.keyValue || {})
                const message = duplicateFields.length > 0
                    ? `A record with this ${duplicateFields.join(", ")} already exists`
                    : `A duplicate value already exists for ${model.modelName}`
                return res.status(409).json({ message })
            }
            const status = error.name === "ValidationError" || error.name === "CastError" ? 400 : 500
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
        try {
            // מבצע בדיקת הרשאה ייעודית לפני שממשיכים ליצירת המסמך.
            const registration = await prepareRegistration(fields, req)
            if (registration.error) {
                return res.status(registration.error.status).json({ message: registration.error.message })
            }

            // שדות מערכת כגון permission מתקבלים רק לאחר הכנה מהימנה בצד השרת.
            const unsupportedFields = Object.keys(registration.fields)
                .filter(field => !allowedRegistrationFields.has(field))
            if (unsupportedFields.length > 0) {
                return res.status(400).json({ message: "Unsupported fields", fields: unsupportedFields })
            }

            // ממשיכים דרך אותה יצירה מוגבלת שדות, לאחר הכנת ערכי הרישום המהימנים.
            return create({ ...req, body: registration.fields }, res, registrationOnlyFields)
        } catch (error) {
            console.error(`Failed to prepare ${model.modelName} registration:`, error)
            return res.status(500).json({ message: `Failed to register ${model.modelName}` })
        }
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
        const validationMessage = validateFields(fields)
        if (validationMessage) {
            return res.status(400).json({ message: validationMessage })
        }
        if (!isValidPasswordInput(fields)) {
            return res.status(400).json({ message: "Password must be a non-empty string of at most 72 UTF-8 bytes" })
        }

        try {
            const updates = await prepareFields({ ...fields })
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