const mongoose = require("mongoose")
const createModelController = require("./modelControllerFactory")
const Child = require("../models/Child")
const ChildEvent = require("../models/ChildEvent")
const Event = require("../models/Event")

const controller = createModelController({
    model: ChildEvent,
    editableFields: ["child", "event", "volunteer", "favoriteVolun"]
})

/**
 * GET /child-event/check הוא preflight להצגת הודעה מוקדמת לפני פתיחת הטופס.
 * זו בדיקת קריאה בלבד ולא הבטחה שהרישום עדיין פנוי: בין הבדיקה ל-POST
 * משתמש אחר יכול להירשם. לכן create והאינדקס הייחודי נשארים האכיפה בפועל.
 */
controller.checkRegistration = async (req, res) => {
    const { child: childId, event: eventId } = req.query
    if (!mongoose.isValidObjectId(childId) || !mongoose.isValidObjectId(eventId)) {
        return res.status(400).json({ message: "נדרשים מזהי ילד ואירוע תקינים" })
    }

    try {
        const childQuery = Child.findById(childId)
        // מזהה ההורה מגיע מה-JWT; אי אפשר לבדוק ילד של חשבון אחר באמצעות שינוי query.
        if (req.user?.role === "Parent") {
            childQuery.where({ parent: req.user.id })
        }
        const child = await childQuery.select("_id").lean()
        if (!child) {
            return res.status(404).json({ message: "הילד לא נמצא או שאינו משויך לחשבון ההורה" })
        }

        const registration = await ChildEvent.exists({ child: childId, event: eventId })
        return res.json({ isRegistered: Boolean(registration) })
    } catch (error) {
        console.error("Failed to check child event registration:", error)
        return res.status(500).json({ message: "בדיקת הרשמת הילד לאירוע נכשלה" })
    }
}

/**
 * POST /child-event יוצר רישום ילד לאירוע.
 * הורה יכול לרשום רק ילד ששייך אליו; עובד יכול לצרף שדה volunteer בהתאם
 * להרשאות השרת. תפיסת מקום מותנית מתבצעת בעדכון MongoDB יחיד כדי ששתי
 * בקשות מקבילות לא יחרגו מהקיבולת, ואינדקס child+event מונע כפילות.
 */
controller.create = async (req, res) => {
    const { child: childId, event: eventId, favoriteVolun = "" } = req.body ?? {}
    const allowedFields = req.user?.role === "Parent"
        ? ["child", "event", "favoriteVolun"]
        : ["child", "event", "volunteer", "favoriteVolun"]
    const unsupportedFields = Object.keys(req.body ?? {}).filter(
        field => !allowedFields.includes(field)
    )

    if (unsupportedFields.length > 0) {
        return res.status(400).json({
            message: "נשלחו שדות שאינם מותרים",
            fields: unsupportedFields
        })
    }
    if (
        !mongoose.isValidObjectId(childId)
        || !mongoose.isValidObjectId(eventId)
        || typeof favoriteVolun !== "string"
    ) {
        return res.status(400).json({ message: "נדרשים מזהי ילד ואירוע תקינים" })
    }

    try {
        const childQuery = Child.findById(childId)
        if (req.user?.role === "Parent") {
            childQuery.where({ parent: req.user.id })
        }
        const child = await childQuery.select("_id").lean()
        if (!child) {
            return res.status(404).json({ message: "הילד לא נמצא או שאינו משויך לחשבון ההורה" })
        }

        const existingRegistration = await ChildEvent.findOne({ child: childId, event: eventId })
            .select("_id")
            .lean()
        if (existingRegistration) {
            return res.status(409).json({ message: "הילד כבר רשום לאירוע זה" })
        }

        const registration = new ChildEvent({
            child: childId,
            event: eventId,
            ...(req.user?.role === "Employee" && req.body.volunteer
                ? { volunteer: req.body.volunteer }
                : {}),
            favoriteVolun: favoriteVolun.trim()
        })
        const now = new Date()
        // התנאי וה-$addToSet נבדקים/מתבצעים באותה פעולת DB (atomic update);
        // כך בקשות מתחרות לא יכולות שתיהן לתפוס את המקום האחרון.
        const updatedEvent = await Event.findOneAndUpdate(
            {
                _id: eventId,
                isActive: true,
                startReg: { $lte: now },
                endReg: { $gte: now },
                $expr: {
                    $lt: [
                        {
                            $add: [
                                { $size: { $ifNull: ["$Children", []] } },
                                { $ifNull: ["$SavedPlaces", 0] }
                            ]
                        },
                        "$sumOfChilds"
                    ]
                }
            },
            { $addToSet: { Children: registration._id } },
            { new: true }
        )

        if (!updatedEvent) {
            const eventDocument = await Event.findById(eventId).select(
                "isActive startReg endReg Children SavedPlaces sumOfChilds"
            ).lean()
            if (!eventDocument) {
                return res.status(404).json({ message: "האירוע לא נמצא" })
            }
            if (
                !eventDocument.isActive
                || now < eventDocument.startReg
                || now > eventDocument.endReg
            ) {
                return res.status(409).json({ message: "ההרשמה לאירוע אינה פתוחה" })
            }
            return res.status(409).json({ message: "לא נותרו מקומות פנויים באירוע" })
        }

        try {
            await registration.save()
        } catch (error) {
            // אם יצירת הקשר נכשלה אחרי תפיסת המקום, מחזירים את ההפניה באירוע.
            try {
                await Event.updateOne(
                    { _id: eventId },
                    { $pull: { Children: registration._id } }
                )
            } catch (rollbackError) {
                console.error("Failed to roll back event registration:", rollbackError)
            }
            if (error.code === 11000) {
                return res.status(409).json({ message: "הילד כבר רשום לאירוע זה" })
            }
            throw error
        }

        return res.status(201).json(registration)
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ message: "נתוני ההרשמה אינם תקינים" })
        }
        console.error("Failed to register child for event:", error)
        return res.status(500).json({ message: "רישום הילד לאירוע נכשל" })
    }
}

module.exports = controller
