const mongoose = require("mongoose")
const createModelController = require("./modelControllerFactory")
const Child = require("../models/Child")
const ChildEvent = require("../models/ChildEvent")
const Event = require("../models/Event")
const VolunteerEvent = require("../models/VolunEvent")

const controller = createModelController({
    model: ChildEvent,
    editableFields: ["child", "event", "volunteer", "favoriteVolun"]
})

// שומרים את עדכון ה-CRUD המקורי כדי לאפשר שדות אחרים להמשיך להתעדכן באותה דרך.
const updateChildEvent = controller.update

// חוסמים עדכון ישיר של קישור השיבוץ, שחייב להתבצע יחד עם הצד ההפוך בטרנזקציה.
controller.update = async (req, res) => {
    // אם הבקשה כוללת volunteer, מחזירים conflict במקום לשמור קשר חד-צדדי.
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "volunteer")) {
        return res.status(409).json({
            message: "יש לעדכן את שיבוץ הילד דרך פעולת השיבוץ האטומית"
        })
    }

    // שדות השתתפות אחרים נשארים תחת אותם כללי ולידציה ועדכון גנריים.
    return updateChildEvent(req, res)
}

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
    // רשומה חדשה יכולה להירשם לאירוע, אך קישור מתנדבת חייב להישמר עם הצד ההפוך בטרנזקציה.
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "volunteer")) {
        return res.status(409).json({
            message: "יש ליצור שיבוץ דרך פעולת השיבוץ האטומית"
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
            favoriteVolun: favoriteVolun.trim()
        })
        const now = new Date()
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

/**
 * שומר שיבוץ הדדי בין רשומת ילד לרשומת מתנדבת באותו אירוע.
 *
 * הבקשה מקבלת מזהה אירוע, מזהה ChildEvent ומזהה VolunteerEvent.
 * requireAction("matching") שבנתיב מאמת לפני הפעלת הבקר שהמשתמש הוא עובד
 * ושיש לו הרשאת matching עדכנית. הבקר בודק שוב את הקשרים במסד, אינו משנה
 * מסמכי Child או Volunteer, ומעדכן את שני מסמכי ההשתתפות באותה טרנזקציה.
 */
controller.assign = async (req, res) => {
    // שולף את שלושת המזהים מגוף הבקשה; מזהי המשתתפים עצמם אינם מתקבלים כאן.
    const { eventId, childEventId, volunteerEventId } = req.body ?? {}

    // דורש מזהי ObjectId כמחרוזות הקסדצימליות או אובייקטי ObjectId תקינים.
    if (
        !mongoose.isObjectIdOrHexString(eventId)
        || !mongoose.isObjectIdOrHexString(childEventId)
        || !mongoose.isObjectIdOrHexString(volunteerEventId)
    ) {
        return res.status(400).json({ message: "נדרשים מזהים תקינים של אירוע, ילד ומתנדבת" })
    }

    // שומר שגיאות עסקיות עם קוד HTTP כדי להחזיר אותן בצורה ברורה לאחר ביטול הטרנזקציה.
    const createAssignmentError = (status, message) => Object.assign(new Error(message), { status })
    let session

    try {
        // פותח session של MongoDB; כל קריאה שמשנה או בודקת נתונים תשויך אליו.
        session = await mongoose.startSession()
        let savedAssignment

        // withTransaction מתחייבת או לכל העדכונים יחד או לאף אחד מהם.
        await session.withTransaction(async () => {
            // מאמת את שתי הרשומות וגם כותב לאירוע בתוך הטרנזקציה כדי לסדר הקצאות מקבילות.
            // עדכון updatedAt משמש נקודת כתיבה משותפת; אם הבקשה תיכשל, הטרנזקציה תחזיר אותו.
            const event = await Event.findOneAndUpdate({
                _id: eventId,
                Children: childEventId,
                Volunteers: volunteerEventId
            }, {
                $set: { updatedAt: new Date() }
            }, {
                new: true,
                session,
                timestamps: false
            }).select("_id Children Volunteers")

            // אין להסתפק במזהי רשומות תקינים: שני המשתתפים חייבים להיות באותו אירוע.
            if (!event) {
                throw createAssignmentError(404, "הילד והמתנדבת חייבים להיות רשומים לאותו אירוע")
            }

            // מאתר את רשומת הילד רק אם שדה event שלה תואם לאירוע הנוכחי.
            const childRegistration = await ChildEvent.findOne({
                _id: childEventId,
                event: eventId
            }).session(session)

            // רשומת אירוע חסרה או שאינה משויכת לאירוע נחשבת לרשומה שאינה זמינה לשיבוץ.
            if (!childRegistration) {
                throw createAssignmentError(404, "רשומת הילד לא נמצאה באירוע הנוכחי")
            }

            // VolunteerEvent אינו מכיל שדה event, ולכן שייכותו נבדקה דרך מערך האירוע למעלה.
            const volunteerRegistration = await VolunteerEvent.findById(volunteerEventId).session(session)

            // מוודא שמסמך המתנדבת עצמו קיים ולא רק הופיע במערך האירוע.
            if (!volunteerRegistration) {
                throw createAssignmentError(404, "רשומת המתנדבת לא נמצאה באירוע הנוכחי")
            }

            // רשומת VolunteerEvent חייבת לזהות מתנדבת כללית כדי לאכוף שימוש יחיד באירוע.
            if (!volunteerRegistration.volunteer) {
                throw createAssignmentError(409, "רשומת המתנדבת אינה כוללת מזהה מתנדבת תקין")
            }

            // כל קישור קיים נחשב שיבוץ שמור; אין לדרוס אותו, גם אם הוא קישור חלקי.
            if (childRegistration.volunteer || volunteerRegistration.child) {
                throw createAssignmentError(409, "אחד המשתתפים כבר משובץ. החלפת שיבוץ קיים אינה זמינה")
            }

            // בודק גם רשומות כפולות: המודל אינו מבטיח מזהה השתתפות יחיד לכל אדם באירוע.
            const childRegistrationsForParticipant = await ChildEvent.find({
                _id: { $in: event.Children },
                child: childRegistration.child
            }).select("_id volunteer").session(session).lean()

            // אם אותו ילד כבר משויך דרך רשומה אחרת, אין לשבץ אותו פעם נוספת באותו אירוע.
            if (childRegistrationsForParticipant.some(registration => (
                String(registration._id) !== String(childEventId) && registration.volunteer
            ))) {
                throw createAssignmentError(409, "הילד כבר משובץ באירוע דרך רשומת השתתפות אחרת")
            }

            // מחפשים כל רשומת השתתפות באירוע שמצביעה לאותה מתנדבת כללית.
            const volunteerRegistrationsForParticipant = await VolunteerEvent.find({
                _id: { $in: event.Volunteers },
                volunteer: volunteerRegistration.volunteer
            }).select("_id child").session(session).lean()

            // שיבוץ קיים בכל אחת מהרשומות מונע שימוש חוזר באותה מתנדבת באירוע.
            if (volunteerRegistrationsForParticipant.some(registration => (
                String(registration._id) !== String(volunteerEventId) && registration.child
            ))) {
                throw createAssignmentError(409, "המתנדבת כבר משובצת באירוע דרך רשומת השתתפות אחרת")
            }

            // תנאי null תופס גם שדה חסר וגם null, ומגן מפני דריסה של עדכון מקביל.
            const updatedChildRegistration = await ChildEvent.findOneAndUpdate(
                { _id: childEventId, event: eventId, volunteer: null },
                { $set: { volunteer: volunteerEventId } },
                { new: true, runValidators: true, session }
            )

            // אם המסמך השתנה מאז הקריאה הקודמת, מבטלים ולא שומרים רק חצי שיבוץ.
            if (!updatedChildRegistration) {
                throw createAssignmentError(409, "הילד שובץ במקביל. יש לרענן את הרשימה לפני ניסיון נוסף")
            }

            // מעדכן את הקשר ההפוך באותה טרנזקציה, ללא שינוי במסמך המתנדבת הכללי.
            const updatedVolunteerRegistration = await VolunteerEvent.findOneAndUpdate(
                { _id: volunteerEventId, child: null },
                { $set: { child: childEventId } },
                { new: true, runValidators: true, session }
            )

            // כשל בעדכון השני זורק שגיאה, ולכן הטרנזקציה מחזירה גם את עדכון הילד לאחור.
            if (!updatedVolunteerRegistration) {
                throw createAssignmentError(409, "המתנדבת שובצה במקביל. יש לרענן את הרשימה לפני ניסיון נוסף")
            }

            // שומר את שני המסמכים המעודכנים לתשובת הלקוח לאחר שהטרנזקציה תסתיים בהצלחה.
            savedAssignment = {
                childRegistration: updatedChildRegistration,
                volunteerRegistration: updatedVolunteerRegistration
            }
        })

        // הצלחה נשלחת רק לאחר ש-MongoDB אישר commit של שתי ההפניות.
        return res.json(savedAssignment)
    } catch (error) {
        // שגיאה עסקית צפויה מוחזרת עם הקוד וההודעה שהוגדרו במהלך בדיקת הנתונים.
        if (error.status) {
            return res.status(error.status).json({ message: error.message })
        }

        // שגיאות MongoDB, ובפרט חוסר תמיכה בטרנזקציות, אינן חושפות פרטים פנימיים ללקוח.
        console.error("Failed to assign child and volunteer:", error)
        return res.status(503).json({
            message: "שמירת השיבוץ האטומית נכשלה. יש לוודא שמסד הנתונים תומך בטרנזקציות ולנסות שוב"
        })
    } finally {
        // סוגר את ה-session גם במסלולי הצלחה, ולידציה שנכשלה או שגיאת מסד נתונים.
        if (session) {
            await session.endSession().catch((error) => {
                console.error("Failed to close assignment session:", error)
            })
        }
    }
}

module.exports = controller
