// טוען את Mongoose כדי לבדוק שמזהים שנשלחו הם מזהי MongoDB תקינים.
const mongoose = require("mongoose")
// טוען את מודל Event, שמספק פעולות מול אוסף האירועים במסד הנתונים.
const Event = require("../models/Event")

// מגדיר אילו שדות מותר לשנות; השדות id, _id וחותמות הזמן אינם ניתנים לעדכון כאן.
const editableEventFields = [
    "name",
    "Children",
    "Volunteers",
    "date",
    "startReg",
    "endReg",
    "hour",
    "detailingForParent",
    "detailingForVolun",
    "sumOfChilds",
    "SavedPlaces",
    "isActive"
]

// מגדיר פעולה אסינכרונית שמטפלת בבקשה לקבלת כל האירועים.
const getAllEvents = async (req, res) => {
    // מתחיל אזור שבו שגיאות ממסד הנתונים ייתפסו ולא יפילו את השרת.
    try {
        // שולף את כל המסמכים מאוסף האירועים; await ממתין לתשובת MongoDB.
        const events = await Event.find()
        // מחזיר ללקוח את רשימת האירועים בפורמט JSON.
        return res.json(events)
    // מטפל בשגיאה שהתרחשה במהלך השליפה.
    } catch (error) {
        // מחזיר קוד HTTP 500, שמשמעותו שגיאה פנימית בשרת.
        return res.status(500).json({ message: "Failed to fetch events" })
    // מסיים את פעולת קבלת כל האירועים.
    }
// מסיים את ההגדרה של getAllEvents.
}

// מגדיר פעולה אסינכרונית לקבלת אירוע יחיד לפי מזהה שבכתובת.
const getById = async (req, res) => {
    // שולף מתוך פרמטרי הנתיב את id, למשל מתוך /event/:id.
    const { id } = req.params
    // בודק מראש שהמזהה מתאים לפורמט של ObjectId של MongoDB.
    if (!mongoose.isValidObjectId(id)) {
        // מחזיר שגיאת בקשה 400 ומפסיק כדי לא לבצע שאילתה עם מזהה פגום.
        return res.status(400).json({ message: "A valid event _id is required" })
    // מסיים את בדיקת תקינות המזהה.
    }

    // מתחיל טיפול בשליפה, כולל אפשרות לכשל במסד הנתונים.
    try {
        // מחפש אירוע לפי מזהה MongoDB הפנימי שלו.
        const event = await Event.findById(id)
        // בודק אם השאילתה הצליחה אך לא נמצא אירוע כזה.
        if (!event) {
            // מחזיר 404 ומפסיק, כדי לא לנסות להחזיר ערך חסר.
            return res.status(404).json({ message: "Event not found" })
        // מסיים את בדיקת קיום האירוע.
        }
        // מחזיר את האירוע שנמצא ללקוח כ־JSON.
        return res.json(event)
    // מטפל בשגיאות בלתי צפויות במהלך השליפה.
    } catch (error) {
        // מחזיר שגיאת שרת כללית במקום לחשוף פרטים פנימיים ללקוח.
        return res.status(500).json({ message: "Failed to fetch event" })
    // מסיים את הטיפול בשגיאות השליפה.
    }
// מסיים את ההגדרה של getById.
}

// מגדיר פעולה אסינכרונית ליצירת אירוע חדש.
const createEvent = async (req, res) => {
    // לוקח רק שדות שמוגדרים במודל; אם גוף הבקשה חסר, משתמש באובייקט ריק.
    const {
        name, id, Children, Volunteers, date, startReg, endReg, hour,
        detailingForParent, detailingForVolun, sumOfChilds, SavedPlaces, isActive
    } = req.body ?? {}

    // מתחיל ניסיון ליצור את האירוע במסד הנתונים.
    try {
        // יוצר מסמך חדש רק מהשדות המפורשים, ו־Mongoose בודק את כללי המודל.
        const event = await Event.create({
            name,
            id,
            Children,
            Volunteers,
            date,
            startReg,
            endReg,
            hour,
            detailingForParent,
            detailingForVolun,
            sumOfChilds,
            SavedPlaces,
            isActive
        })
        // מחזיר 201, המציין שהמשאב נוצר בהצלחה, יחד עם האירוע שנוצר.
        return res.status(201).json(event)
    // תופס שגיאות ולידציה ושגיאות אחרות מתהליך היצירה.
    } catch (error) {
        // שגיאת ולידציה נחשבת קלט לא תקין (400); שגיאה אחרת היא שגיאת שרת (500).
        const status = error.name === "ValidationError" ? 400 : 500
        // מחזיר את קוד השגיאה ואת הודעת הכשל ביצירה.
        return res.status(status).json({ message: "Failed to create event" })
    // מסיים את הטיפול בשגיאות היצירה.
    }
// מסיים את ההגדרה של createEvent.
}

// מגדיר פעולה אסינכרונית לעדכון חלקי של אירוע קיים.
const update = async (req, res) => {
    // מפריד את _id משאר הנתונים; ...fields אוסף את כל השדות המבוקשים לעדכון.
    const { _id, ...fields } = req.body ?? {}

    // מוודא שהמזהה הפנימי של האירוע תקין לפני גישה למסד הנתונים.
    if (!mongoose.isValidObjectId(_id)) {
        // מחזיר 400 אם לא נשלח _id תקין, ומונע המשך ביצוע.
        return res.status(400).json({ message: "A valid event _id is required" })
    // מסיים את בדיקת המזהה.
    }

    // בונה מערך של שמות שדות שנשלחו אך אינם נמצאים ברשימת השדות המותרים.
    const unsupportedFields = Object.keys(fields).filter(
        // משאיר רק שדות שאינם מופיעים ברשימת השדות שניתן לערוך.
        field => !editableEventFields.includes(field)
    // מסיים את בניית רשימת השדות הלא מורשים.
    )
    // בודק אם נמצאו שדות לא מורשים, למשל _id נוסף או שדה מערכת.
    if (unsupportedFields.length > 0) {
        // מחזיר 400, כולל שמות השדות הלא מורשים כדי להקל על תיקון הבקשה.
        return res.status(400).json({
            // מסביר שהבקשה כוללת שדות שאסור לעדכן.
            message: "Unsupported event fields",
            // מוסר ללקוח את שמות השדות שנדחו.
            fields: unsupportedFields
        // מסיים את בניית תגובת השגיאה.
        })
    // מסיים את בדיקת השדות הלא מורשים.
    }

    // בודק אם לא נשלח אף שדה לעדכון לאחר הוצאת _id מגוף הבקשה.
    if (Object.keys(fields).length === 0) {
        // מחזיר 400 כי אין פעולה לבצע כאשר לא נשלחו נתונים לעדכון.
        return res.status(400).json({ message: "At least one event field is required" })
    // מסיים את בדיקת גוף העדכון הריק.
    }

    // מתחיל את פעולת העדכון מול MongoDB.
    try {
        // מחפש לפי _id ומעדכן רק את השדות שהתקבלו, בלי להחליף את המסמך כולו.
        const updatedEvent = await Event.findByIdAndUpdate(
            // הפרמטר הראשון הוא מזהה האירוע שיש לעדכן.
            _id,
            // אופרטור $set משנה רק את השדות שנשלחו ומשאיר את יתר השדות ללא שינוי.
            { $set: fields },
            // new מחזיר את המסמך לאחר העדכון; runValidators מפעיל את בדיקות המודל.
            { new: true, runValidators: true }
        // מסיים את קריאת Mongoose ומקבל את תוצאת העדכון.
        )

        // אם לא התקבל מסמך, אין אירוע עם המזהה שנשלח.
        if (!updatedEvent) {
            // מחזיר 404 ומפסיק את הפעולה.
            return res.status(404).json({ message: "Event not found" })
        // מסיים את בדיקת קיום האירוע.
        }

        // מחזיר ללקוח את המסמך המעודכן.
        return res.json(updatedEvent)
    // תופס שגיאות ולידציה, המרת טיפוסים או שגיאות שרת אחרות.
    } catch (error) {
        // שגיאת ValidationError או CastError נובעת בדרך כלל מהנתונים (400); אחרות הן 500.
        const status = error.name === "ValidationError" || error.name === "CastError" ? 400 : 500
        // מחזיר את קוד השגיאה המתאים והודעה כללית על כשל בעדכון.
        return res.status(status).json({ message: "Failed to update event" })
    // מסיים את הטיפול בשגיאות העדכון.
    }
// מסיים את ההגדרה של update.
}

// מגדיר פעולה אסינכרונית למחיקת אירוע לפי _id שמתקבל בגוף הבקשה.
const deleteEvent = async (req, res) => {
    // שולף את _id מגוף הבקשה; גוף חסר מוחלף באובייקט ריק כדי למנוע שגיאת פירוק.
    const { _id } = req.body ?? {}
    // בודק את תקינות המזהה לפני ניסיון המחיקה.
    if (!mongoose.isValidObjectId(_id)) {
        // מחזיר 400 אם המזהה חסר או אינו בפורמט תקין.
        return res.status(400).json({ message: "A valid event _id is required" })
    // מסיים את בדיקת המזהה.
    }

    // מתחיל את ניסיון המחיקה מול מסד הנתונים.
    try {
        // מוחק לפי מזהה ומחזיר את המסמך שנמחק, או null אם לא נמצא מסמך מתאים.
        const event = await Event.findByIdAndDelete(_id)
        // בודק אם לא נמצא אירוע למחיקה.
        if (!event) {
            // מחזיר 404 ומפסיק את הפעולה.
            return res.status(404).json({ message: "Event not found" })
        // מסיים את בדיקת קיום האירוע.
        }
        // מחזיר הודעת הצלחה שמשתמשת בשם האירוע כפי שהוא מוגדר במודל.
        return res.json({ message: `${event.name} deleted successfully` })
    // מטפל בשגיאה בלתי צפויה במהלך המחיקה.
    } catch (error) {
        // מחזיר 500 ומסתיר פרטים פנימיים של השגיאה.
        return res.status(500).json({ message: "Failed to delete event" })
    // מסיים את הטיפול בשגיאות המחיקה.
    }
// מסיים את ההגדרה של deleteEvent.
}

// מייצא את פעולות ה־controller כדי שה־route יוכל לשייך אותן לכתובות HTTP.
module.exports = { getAllEvents, getById, createEvent, update, deleteEvent }
