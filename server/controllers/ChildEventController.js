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

/**
 * מבטל שיבוץ הדדי בין רשומת ילד לרשומת מתנדבת באותו אירוע.
 *
 * הבקשה מקבלת eventId, childEventId ו-volunteerEventId, באותה תבנית של
 * פעולת assign. לפני שינוי נתונים נבדקים רישום שתי הרשומות באירוע והקשר
 * ההדדי המדויק ביניהן. שני שדות הקשר נמחקים בטרנזקציה אחת; מכיוון שלא
 * הוגדר להם default מפורש בסכמות, שדה חסר הוא ערך ברירת המחדל שלהם.
 */
controller.unassign = async (req, res) => {
    // שולף את מזהה האירוע ואת מזהי שתי רשומות ההשתתפות מגוף הבקשה.
    const { eventId, childEventId, volunteerEventId } = req.body ?? {}

    // מוודא שכל שלושת המזהים הם ObjectId תקינים לפני גישה למסד הנתונים.
    if (
        !mongoose.isObjectIdOrHexString(eventId)
        || !mongoose.isObjectIdOrHexString(childEventId)
        || !mongoose.isObjectIdOrHexString(volunteerEventId)
    ) {
        // מחזיר שגיאת בקשה כאשר מזהה חסר או שאינו במבנה הנתמך.
        return res.status(400).json({ message: "נדרשים מזהים תקינים של אירוע, ילד ומתנדבת" })
    }

    // מצמיד קוד HTTP לשגיאה עסקית, כדי להבדיל אותה משגיאת מסד נתונים.
    const createUnassignmentError = (status, message) => Object.assign(new Error(message), { status })
    // שומר את ה-session מחוץ ל-try כדי שניתן יהיה לסגור אותו גם לאחר כשל.
    let session

    try {
        // פותח session חדש שבו יבוצעו כל בדיקות העקביות ועדכוני הביטול.
        session = await mongoose.startSession()
        // ישמור את שתי הרשומות לאחר ביטול, ורק אם הטרנזקציה תסתיים בהצלחה.
        let cancelledAssignment

        // מבטיח שכל העדכונים יישמרו יחד, או שכולם יחזרו לאחור במקרה של כשל.
        await session.withTransaction(async () => {
            // מאמת שהאירוע מכיל את שתי הרשומות, ובמקביל יוצר נקודת כתיבה
            // משותפת לפעולת השיבוץ ולפעולת הביטול כדי לתאם פעולות מתחרות.
            const event = await Event.findOneAndUpdate({
                _id: eventId,
                Children: childEventId,
                Volunteers: volunteerEventId
            }, {
                // עדכון חותמת הזמן גורם לפעולות המתחרות באותו אירוע להתנגש בטרנזקציה.
                $set: { updatedAt: new Date() }
            }, {
                // מחזיר את האירוע שנמצא ומצמיד את הפעולה לטרנזקציה הנוכחית.
                new: true,
                session,
                // מונע ממנגנון timestamps להוסיף שינוי מעבר לחותמת הזמן המפורשת.
                timestamps: false
            }).select("_id Children Volunteers")

            // אם אחת ההפניות חסרה, שתי הרשומות אינן רשומות יחד באירוע המבוקש.
            if (!event) {
                // מחזיר שגיאת אי-מציאה לפני שינוי של אחד ממסמכי המשתתפים.
                throw createUnassignmentError(404, "הילד והמתנדבת אינם רשומים יחד לאירוע הזה")
            }

            // מאתר את רישום הילד ומוודא שגם שדה האירוע במסמך מצביע לאירוע המבוקש.
            const childRegistration = await ChildEvent.findOne({
                _id: childEventId,
                event: eventId
            }).session(session)

            // מחזיר שגיאה אם רישום הילד חסר או שייך לאירוע אחר.
            if (!childRegistration) {
                throw createUnassignmentError(404, "רשומת הילד לא נמצאה באירוע הנוכחי")
            }

            // מאתר את רישום המתנדבת ומוודא ששדה event שלו תואם לאותו אירוע.
            const volunteerRegistration = await VolunteerEvent.findOne({
                _id: volunteerEventId,
                event: eventId
            }).session(session)

            // מחזיר שגיאה אם רישום המתנדבת חסר או שייך לאירוע אחר.
            if (!volunteerRegistration) {
                throw createUnassignmentError(404, "רשומת המתנדבת לא נמצאה באירוע הנוכחי")
            }

            // ממיר את הקישור במסמך הילד למחרוזת לצורך השוואה בטוחה מול מזהה הרשומה.
            const assignedVolunteerId = childRegistration.volunteer
                ? String(childRegistration.volunteer)
                : null
            // ממיר גם את הקישור ההפוך במתנדבת, תוך הבחנה בין קישור חסר למזהה קיים.
            const assignedChildId = volunteerRegistration.child
                ? String(volunteerRegistration.child)
                : null

            // אם שני הקישורים חסרים, הביטול כבר בוצע או שהזוג כלל לא שובץ.
            if (!assignedVolunteerId && !assignedChildId) {
                // מחזיר conflict כדי שהלקוח יוכל להבחין בין פעולה חוזרת להצלחה חדשה.
                throw createUnassignmentError(409, "השיבוץ כבר בוטל או שאינו קיים")
            }

            // דורש ששני המסמכים יצביעו זה על זה; קשר חד-צדדי או זוג שגוי אינו מבוטל.
            if (
                assignedVolunteerId !== String(volunteerEventId)
                || assignedChildId !== String(childEventId)
            ) {
                // הטרנזקציה תבוטל ללא שינוי, כדי לא להסתיר חוסר עקביות או לבטל זוג אחר.
                throw createUnassignmentError(409, "רשומות הילד והמתנדבת אינן משובצות זו לזו")
            }

            // מסיר רק את קישור המתנדבת מרשומת הילד, ורק אם הוא עדיין תואם לזוג שנבדק.
            const updatedChildRegistration = await ChildEvent.findOneAndUpdate(
                {
                    _id: childEventId,
                    event: eventId,
                    volunteer: volunteerEventId
                },
                // $unset מחזיר את השדה למצב ברירת המחדל שלו בסכמה: לא מוגדר.
                { $unset: { volunteer: 1 } },
                // מבקש את המסמך המעודכן, ולידציה, והשתתפות באותה טרנזקציה.
                { new: true, runValidators: true, session }
            )

            // אם הקישור השתנה במקביל, אין להמשיך לביטול חלקי.
            if (!updatedChildRegistration) {
                // זריקת השגיאה מבטלת את הטרנזקציה ואת כל השינויים שבוצעו בה.
                throw createUnassignmentError(409, "השיבוץ השתנה במקביל. יש לרענן את הרשימה")
            }

            // מסיר את הקישור ההפוך רק כשהוא עדיין מצביע לרשומת הילד שאומתה.
            const updatedVolunteerRegistration = await VolunteerEvent.findOneAndUpdate(
                {
                    _id: volunteerEventId,
                    event: eventId,
                    child: childEventId
                },
                // מוחק את שדה הילד כדי להשיב את רשומת המתנדבת למצב לא משובץ.
                { $unset: { child: 1 } },
                // מבקש את המסמך המעודכן ומשייך את העדכון לאותה טרנזקציה.
                { new: true, runValidators: true, session }
            )

            // כשל בעדכון ההפוך מחזיר לאחור גם את הסרת הקישור מרשומת הילד.
            if (!updatedVolunteerRegistration) {
                // השגיאה נזרקת לפני commit ולכן לא נשאר שינוי חד-צדדי במסד הנתונים.
                throw createUnassignmentError(409, "השיבוץ השתנה במקביל. יש לרענן את הרשימה")
            }

            // שומר את שתי התוצאות לתשובה שתישלח רק לאחר commit מוצלח.
            cancelledAssignment = {
                childRegistration: updatedChildRegistration,
                volunteerRegistration: updatedVolunteerRegistration
            }
        })

        // מחזיר אישור ואת שתי הרשומות רק לאחר השלמת הטרנזקציה בהצלחה.
        return res.json(cancelledAssignment)
    } catch (error) {
        // מחזיר שגיאה עסקית עם הסטטוס שהוגדר במקום שבו התגלתה.
        if (error.status) {
            return res.status(error.status).json({ message: error.message })
        }

        // מתעד שגיאת מסד ומחזיר תשובה כללית, בלי לחשוף פרטים פנימיים ללקוח.
        console.error("Failed to unassign child and volunteer:", error)
        return res.status(503).json({
            message: "ביטול השיבוץ האטומי נכשל. יש לוודא שמסד הנתונים תומך בטרנזקציות ולנסות שוב"
        })
    } finally {
        // סוגר את ה-session גם לאחר הצלחה, שגיאה עסקית או כשל במסד הנתונים.
        if (session) {
            // כשל בסגירת session מתועד, אך אינו משנה את התשובה העסקית שכבר נקבעה.
            await session.endSession().catch((error) => {
                // רושם את שגיאת הסגירה לצורכי אבחון בלי לחשוף אותה למשתמש.
                console.error("Failed to close unassignment session:", error)
            })
        }
    }
}

module.exports = controller
