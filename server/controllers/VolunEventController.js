const mongoose = require("mongoose")
const createModelController = require("./modelControllerFactory")
const VolunteerEvent = require("../models/VolunEvent")
const Event = require("../models/Event")

// בקר CRUD לקשר VolunteerEvent. הרשמה עצמית מטופלת בנתיבים הייעודיים למטה,
// כי היא חייבת לקשור גם את מזהה המתנדבת מה-token וגם את ההפניה באירוע.
const controller = createModelController({
    model: VolunteerEvent,
    editableFields: ["child", "volunteer", "notes", "favouredChild"]
})

/**
 * POST /volunteer-event/register יוצר הרשמה עצמית של המתנדבת המחוברת.
 * הלקוח רשאי לספק event ו-favouredChild (טקסט העדפה אופציונלי), אך אינו
 * מספק volunteerId: זה נלקח מ-req.user לאחר אימות JWT ו-role בנתיב.
 *
 * ההרשמה נשמרת בשני מקומות: מסמך VolunteerEvent עם event/volunteer, וה-_id
 * שלו במערך Event.Volunteers. אם הצעד השני נכשל, מוחקים את המסמך הראשון
 * (compensating action) כדי לא להשאיר הרשמה חלקית. אינדקס ייחודי במודל
 * הוא הגנה סופית נגד שתי בקשות הרשמה מקבילות.
 */
controller.registerForEvent = async (req, res) => {
    const eventId = req.body?.event
    const volunteerId = req.user?.id
    const favouredChild = req.body?.favouredChild

    // ObjectId נבדק לפני שאילתות; שם הילד הוא טקסט אופציונלי ואינו מזהה ילד במסד.
    if (!mongoose.isValidObjectId(eventId)) {
        return res.status(400).json({ message: "נדרש מזהה אירוע תקין" })
    }
    if (
        favouredChild !== undefined
        && (typeof favouredChild !== "string" || favouredChild.trim().length > 100)
    ) {
        return res.status(400).json({ message: "שם הילד/ה אינו תקין (עד 100 תווים)" })
    }

    const now = new Date()
    let registration

    try {
        const event = await Event.findById(eventId)
            .select("_id isActive startReg endReg")
            .lean()
        if (!event) {
            return res.status(404).json({ message: "האירוע לא נמצא" })
        }
        if (
            !event.isActive
            || !event.startReg
            || !event.endReg
            || now < event.startReg
            || now > event.endReg
        ) {
            return res.status(409).json({ message: "ההרשמה לאירוע אינה פתוחה" })
        }

        const existingRegistration = await VolunteerEvent.exists({
            event: eventId,
            volunteer: volunteerId
        })
        if (existingRegistration) {
            return res.status(409).json({ message: "כבר נרשמת לאירוע הזה" })
        }

        // VolunteerEvent הוא מסמך קשר (association document), לא רישום ילד.
        // שומרים אותו ואז מוסיפים את ה-reference שלו ל-Event.Volunteers.
        registration = await VolunteerEvent.create({
            event: eventId,
            volunteer: volunteerId,
            ...(favouredChild?.trim() ? { favouredChild: favouredChild.trim() } : {})
        })

        const updatedEvent = await Event.findOneAndUpdate(
            {
                _id: eventId,
                isActive: true,
                startReg: { $lte: now },
                endReg: { $gte: now }
            },
            { $addToSet: { Volunteers: registration._id } },
            { new: true }
        ).select("_id")

        if (!updatedEvent) {
            // חלון הרישום עשוי להיסגר בין הקריאה הראשונה לעדכון; במקרה כזה מבטלים יצירה זמנית.
            await VolunteerEvent.deleteOne({ _id: registration._id })
            const currentEvent = await Event.findById(eventId).select("_id").lean()
            return currentEvent
                ? res.status(409).json({ message: "ההרשמה לאירוע אינה פתוחה" })
                : res.status(404).json({ message: "האירוע לא נמצא" })
        }

        return res.status(201).json(registration)
    } catch (error) {
        if (registration) {
            // פיצוי (compensating action): מחזיר את שני האוספים למצב עקבי אם צעד מאוחר נכשל.
            try {
                await Event.updateOne(
                    { _id: eventId },
                    { $pull: { Volunteers: registration._id } }
                )
                await VolunteerEvent.deleteOne({ _id: registration._id })
            } catch (rollbackError) {
                console.error("Failed to roll back volunteer event registration:", rollbackError)
            }
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: "כבר נרשמת לאירוע הזה" })
        }
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ message: "נתוני ההרשמה אינם תקינים" })
        }
        console.error("Failed to register volunteer for event:", error)
        return res.status(500).json({ message: "רישום המתנדבת לאירוע נכשל" })
    }
}

/**
 * POST /volunteer-event/unregister מבטל הרשמה של המתנדבת המחוברת לאירוע.
 * שני תנאי הבעלות (event + volunteer מה-token) מבטיחים שהבקשה אינה יכולה
 * למחוק הרשמה של משתמש אחר. תחילה מוסרת ההפניה מהאירוע ואז נמחק מסמך הקשר.
 */
controller.cancelEventRegistration = async (req, res) => {
    const eventId = req.body?.event
    const volunteerId = req.user?.id

    if (!mongoose.isValidObjectId(eventId)) {
        return res.status(400).json({ message: "נדרש מזהה אירוע תקין" })
    }

    let registration
    let eventReferenceUpdated = false
    try {
        // החיפוש כולל את מזהה ה-JWT כדי שמתנדבת תוכל לבטל רק את הרישום שלה.
        registration = await VolunteerEvent.findOne({
            event: eventId,
            volunteer: volunteerId
        }).select("_id").lean()
        if (!registration) {
            return res.status(404).json({ message: "לא נמצאה הרשמה שלך לאירוע הזה" })
        }

        const eventUpdate = await Event.updateOne(
            { _id: eventId },
            { $pull: { Volunteers: registration._id } }
        )
        eventReferenceUpdated = eventUpdate.matchedCount > 0

        // מוחקים את מסמך הקשר רק אחרי הסרת ההפניה אליו מהאירוע.
        const deletion = await VolunteerEvent.deleteOne({
            _id: registration._id,
            volunteer: volunteerId
        })
        if (deletion.deletedCount !== 1) {
            return res.status(404).json({ message: "ההרשמה כבר בוטלה" })
        }

        return res.json({ message: "ההרשמה לאירוע בוטלה בהצלחה" })
    } catch (error) {
        if (registration && eventReferenceUpdated) {
            // אם המחיקה נכשלה, משיבים את ההפניה כדי למנוע רישום יתום/חלקי.
            try {
                await Event.updateOne(
                    { _id: eventId },
                    { $addToSet: { Volunteers: registration._id } }
                )
            } catch (rollbackError) {
                console.error("Failed to restore event volunteer registration:", rollbackError)
            }
        }
        console.error("Failed to cancel volunteer event registration:", error)
        return res.status(500).json({ message: "ביטול ההרשמה לאירוע נכשל" })
    }
}

module.exports = controller