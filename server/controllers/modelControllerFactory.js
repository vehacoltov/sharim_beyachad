const mongoose = require("mongoose")

// בונה פעולות CRUD למודל, תוך הגבלת שדות והסתרת מידע פרטי מתגובות.
const createModelController = ({ model, editableFields, privateFields = [] }) => {
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

        try {
            const document = await model.create(fields)
            return res.status(201).json(toPublicDocument(document))
        } catch (error) {
            const status = error.name === "ValidationError" || error.name === "CastError" ? 400 : error.code === 11000 ? 409 : 500
            return res.status(status).json({ message: `Failed to create ${model.modelName}` })
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

        try {
            // $set מעדכן רק את השדות שהתקבלו; runValidators בודק אותם מול ה־schema.
            const document = await model.findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true })
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

    return { getAll, getById, create, update, remove }
}

module.exports = createModelController