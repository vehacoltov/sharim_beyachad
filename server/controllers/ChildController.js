
/**
 * ============================================================
 *                    Child Controller
 * ============================================================
 *
 * הבקר אחראי ליצירת מסמך Child ב-MongoDB,
 * ובמידת הצורך גם לשמירת תמונה.
 *
 * תהליך היצירה:
 *
 * 1. קבלת נתוני הילד מתוך req.body.
 * 2. המרת הנתונים לטיפוסים המתאימים ל-Mongoose.
 * 3. שמירת התמונה באמצעות שירות אחסון.
 * 4. יצירת מסמך Child במסד הנתונים.
 * 5. אם היצירה נכשלת - ניסיון למחוק את התמונה.
 *
 * הבקר אינו יודע כיצד הקובץ נשמר בפועל.
 * הוא משתמש בשירות fileStorage, כך שבעתיד
 * ניתן להחליף אחסון מקומי באחסון ענן.
 */

const createModelController = require("./modelControllerFactory")
const Child = require("../models/Child")
const fileStorage = require("../services/fileStorageService")


/**
 * ============================================================
 *                 יצירת Controller בסיסי
 * ============================================================
 *
 * Factory Pattern:
 *
 * createModelController היא פונקציה שמייצרת
 * Controller לפי הגדרות שמועברות אליה.
 *
 * כך אפשר להשתמש בפעולות CRUD משותפות
 * עבור מודלים שונים, בלי לשכפל את הקוד.
 *
 * model:
 * מודל Mongoose שעליו יתבצעו הפעולות.
 *
 * editableFields:
 * רשימת שדות שה-Controller הכללי רשאי
 * לעדכן, בהתאם למימוש של ה-Factory.
 *
 * בהמשך אנחנו דורסים את הפעולה create
 * כדי להוסיף טיפול מיוחד בהעלאת תמונה.
 */
const controller = createModelController({
    model: Child,

    editableFields: [
        "fullName",
        "parent",
        "id",
        "phone",
        "anothwrPhone",
        "age",
        "epilepsy",
        "sensitivity",
        "medicines",
        "canBeFilemed",
        "detailing",
        "notes",
        "img",
        "status",
        "category"
    ]
})


/**
 * ============================================================
 *                     normalizeFields
 * ============================================================
 *
 * פונקציה שממירה נתונים שהתקבלו מהטופס
 * לטיפוסים המתאימים לשמירה ב-Mongoose.
 *
 * למה צריך אותה?
 *
 * כאשר React שולחת נתונים באמצעות FormData,
 * שדות טקסט ומספרים מגיעים בדרך כלל כמחרוזות.
 *
 * לדוגמה:
 *
 * {
 *   age: "12",
 *   canBeFilemed: "true",
 *   category: "A, B, C"
 * }
 *
 * הפונקציה מחזירה:
 *
 * {
 *   age: 12,
 *   canBeFilemed: true,
 *   category: ["A", "B", "C"]
 * }
 *
 * חשוב:
 * הפונקציה יוצרת עותק של האובייקט,
 * ולכן אינה משנה ישירות את req.body.
 */
const normalizeFields = fields => {

    /**
     * Spread Operator:
     *
     * { ...fields }
     *
     * יוצר עותק שטחי (Shallow Copy)
     * של האובייקט.
     *
     * כלומר:
     * שינוי מאפיינים ברמה הראשונה של values
     * לא ישנה את אותם מאפיינים ב-fields.
     *
     * אם קיימים אובייקטים פנימיים,
     * הם עדיין עשויים להיות משותפים.
     */
    const values = { ...fields }


    /**
     * המרת age ממחרוזת למספר.
     *
     * בודקים שהערך אינו undefined
     * וגם אינו מחרוזת ריקה.
     *
     * Number("12") מחזיר 12.
     *
     * שימי לב:
     * Number("abc") מחזיר NaN.
     * במקרה כזה Mongoose עשויה להחזיר
     * שגיאת CastError בזמן השמירה.
     */
    if (values.age !== undefined && values.age !== "") {
        values.age = Number(values.age)
    }


    /**
     * המרת canBeFilemed לערך Boolean.
     *
     * includes בודקת אם הערך מופיע במערך.
     *
     * הערכים הבאים נחשבים true:
     * true, "true", "on", "1"
     *
     * כל ערך אחר יומר ל-false.
     *
     * לדוגמה:
     * "true"  -> true
     * "on"    -> true
     * "false" -> false
     *
     * חשוב:
     * זו בדיקת חברות במערך ולא המרה רגילה
     * באמצעות Boolean().
     *
     * Boolean("false") מחזיר true,
     * כי זו מחרוזת שאינה ריקה.
     *
     * לכן השימוש ב-includes מתאים כאן יותר.
     */
    if (values.canBeFilemed !== undefined) {
        values.canBeFilemed = [
            true,
            "true",
            "on",
            "1"
        ].includes(values.canBeFilemed)
    }


    /**
     * המרת category ממחרוזת למערך.
     *
     * typeof בודק האם הערך הוא מחרוזת.
     *
     * split(","):
     * מפצל את המחרוזת לפי פסיקים.
     *
     * map:
     * מפעיל trim על כל איבר,
     * כדי להסיר רווחים בתחילתו ובסופו.
     *
     * filter(Boolean):
     * מסיר איברים ריקים.
     *
     * לדוגמה:
     *
     * "A, B, , C"
     *
     * יהפוך ל:
     *
     * ["A", "B", "C"]
     */
    if (typeof values.category === "string") {
        values.category = values.category
            .split(",")
            .map(value => value.trim())
            .filter(Boolean)
    }


    /**
     * הסרת שדות שערכם מחרוזת ריקה.
     *
     * Object.keys(values):
     * מחזירה מערך של שמות המאפיינים.
     *
     * forEach:
     * עוברת על כל שם שדה.
     *
     * delete:
     * מסירה מאפיין מתוך האובייקט.
     *
     * לדוגמה:
     *
     * {
     *   fullName: "Dana",
     *   notes: ""
     * }
     *
     * יהפוך ל:
     *
     * {
     *   fullName: "Dana"
     * }
     *
     * המשמעות:
     * שדה ריק לא יישלח ל-Mongoose
     * כחלק מהאובייקט המנורמל.
     *
     * זה עשוי לאפשר שימוש בערכי default
     * שהוגדרו בסכמת Mongoose.
     */
    Object.keys(values).forEach(field => {
        if (values[field] === "") {
            delete values[field]
        }
    })

    return values
}


/**
 * ============================================================
 *                    controller.create
 * ============================================================
 *
 * כאן אנחנו מחליפים את פעולת create
 * שנוצרה על ידי ה-Controller Factory.
 *
 * הסיבה:
 * יצירת Child כוללת גם טיפול בקובץ תמונה,
 * ולא רק שמירת מסמך במסד הנתונים.
 *
 * חשוב להבין:
 *
 * MongoDB ואחסון הקבצים הם שני מנגנונים נפרדים.
 *
 * לכן שמירת תמונה ושמירת מסמך אינן מתבצעות
 * כטרנזקציה אטומית אחת.
 *
 * אם שמירת התמונה מצליחה אבל שמירת המסמך
 * נכשלת, עלול להישאר קובץ שאין אליו הפניה
 * במסד הנתונים.
 *
 * קובץ כזה נקרא Orphan File.
 *
 * כדי לצמצם את הבעיה משתמשים ב-Rollback:
 * במקרה של כישלון מנסים למחוק את התמונה
 * שכבר נשמרה.
 */
controller.create = async (req, res) => {

    /**
     * המשתנה ישמור את הנתיב שהתקבל
     * משירות האחסון.
     *
     * let מאפשר לשנות את הערך בהמשך.
     *
     * המשתנה מוגדר מחוץ ל-try,
     * כדי שגם ה-catch יוכל לגשת אליו.
     *
     * אם לא נשמרה תמונה,
     * ערכו יישאר undefined.
     */
    let storedImagePath

    try {

        /**
         * req.body מכיל את נתוני הטופס.
         *
         * req.body || {}:
         * אם req.body אינו קיים או שהוא falsy,
         * נשתמש באובייקט ריק.
         *
         * normalizeFields ממירה את הנתונים
         * לפני העברתם ל-Mongoose.
         */
        const fields = normalizeFields(req.body || {})


        /**
         * בדיקה שלא התקבלה בקשה ריקה.
         *
         * Object.keys(fields).length === 0
         * בודק האם אין שדות באובייקט.
         *
         * !req.file בודק שלא התקבל קובץ.
         *
         * אם אין שדות ואין קובץ,
         * מחזירים HTTP 400 - Bad Request.
         *
         * return עוצר את המשך ביצוע הפונקציה.
         */
        if (Object.keys(fields).length === 0 && !req.file) {
            return res.status(400).json({
                message: "יש לשלוח לפחות שדה אחד"
            })
        }


        /**
         * ====================================================
         *                    שמירת התמונה
         * ====================================================
         *
         * req.file מתקבל בדרך כלל מ-Middleware
         * כמו Multer, שמטפל בהעלאת קבצים.
         *
         * אם התקבל קובץ:
         *
         * fileStorage.save(req.file)
         * שומר אותו באמצעות שירות האחסון.
         *
         * await ממתין לסיום פעולת השמירה.
         *
         * הפונקציה מחזירה נתיב או מזהה קובץ,
         * בהתאם למימוש של fileStorageService.
         *
         * הנתיב נשמר גם ב-storedImagePath
         * לצורך Rollback במקרה של כישלון.
         *
         * לאחר מכן מוסיפים אותו ל-fields.img
         * כדי שיישמר במסמך Child.
         */
        if (req.file) {
            storedImagePath = await fileStorage.save(req.file)

            fields.img = storedImagePath
        }


        /**
         * ====================================================
         *                  שמירה ב-MongoDB
         * ====================================================
         *
         * Child.create(fields):
         * מבקשת מ-Mongoose ליצור מסמך חדש.
         *
         * במהלך הפעולה Mongoose מבצעת,
         * בין היתר, המרת טיפוסים ובדיקות
         * ולידציה שהוגדרו בסכמה.
         *
         * אם מתרחשת שגיאה,
         * Promise הפעולה נדחה
         * והביצוע עובר ל-catch.
         *
         * אם הפעולה מצליחה,
         * child מכיל את המסמך שנוצר.
         */
        const child = await Child.create(fields)


        /**
         * HTTP 201 - Created:
         * מציין שמשאב חדש נוצר בהצלחה.
         *
         * child.toObject():
         * ממירה מסמך Mongoose לאובייקט
         * JavaScript רגיל.
         *
         * לאחר מכן Express מחזירה אותו כ-JSON.
         */
        return res.status(201).json(child.toObject())

    } catch (error) {

        /**
         * ====================================================
         *                        Rollback
         * ====================================================
         *
         * אם התמונה נשמרה בהצלחה,
         * אבל אחת הפעולות הבאות נכשלה,
         * ננסה למחוק אותה.
         *
         * כך מצמצמים מצב של Orphan File:
         * קובץ שנמצא באחסון אך אינו מקושר
         * למסמך שנוצר בהצלחה.
         *
         * .catch(() => {}):
         * תופסת שגיאה שמתרחשת במהלך המחיקה
         * ואינה מעבירה אותה הלאה.
         *
         * המטרה היא ששגיאת המחיקה לא תסתיר
         * את השגיאה המקורית שגרמה לכישלון.
         *
         * חשוב:
         * זהו Rollback מפצה (Compensating Action),
         * ולא טרנזקציה אמיתית.
         *
         * אם המחיקה נכשלת, הקובץ עלול להישאר.
         */
        if (storedImagePath) {
            await fileStorage
                .remove(storedImagePath)
                .catch(() => {})
        }


        /**
         * ====================================================
         *              שגיאות ולידציה של Mongoose
         * ====================================================
         *
         * ValidationError:
         * אחד או יותר מהשדות אינם עומדים
         * בכללי הוולידציה שהוגדרו בסכמה.
         *
         * CastError:
         * Mongoose לא הצליחה להמיר ערך
         * לטיפוס הנדרש.
         *
         * לדוגמה:
         * שדה Number שקיבל "abc".
         */
        if (
            error.name === "ValidationError" ||
            error.name === "CastError"
        ) {

            /**
             * חילוץ שמות השדות שבהם נמצאו שגיאות.
             *
             * ValidationError עשויה להכיל
             * אובייקט error.errors עם מספר שגיאות.
             *
             * CastError בודדת עשויה להכיל
             * את שם השדה ב-error.path.
             *
             * לכן משתמשים ב-Ternary Operator
             * כדי לבחור את המבנה המתאים.
             */
            const fields = error.errors
                ? Object.keys(error.errors)
                : [error.path || "general"]


            /**
             * יצירת אובייקט עם פירוט השגיאות.
             *
             * Object.entries:
             * ממירה אובייקט למערך זוגות
             * של [שם שדה, שגיאה].
             *
             * map:
             * מחלצת מכל שגיאה את message.
             *
             * Object.fromEntries:
             * מחזירה את הזוגות לאובייקט.
             *
             * לדוגמה:
             *
             * {
             *   age: "Cast to Number failed",
             *   fullName: "Path is required"
             * }
             *
             * כך הלקוח יכול לדעת אילו שדות
             * גרמו לכישלון ומה הבעיה בכל שדה.
             */
            const details = error.errors
                ? Object.fromEntries(
                    Object.entries(error.errors).map(
                        ([name, issue]) => [
                            name,
                            issue.message
                        ]
                    )
                )
                : {
                    [error.path || "general"]: error.message
                }

            return res.status(400).json({
                message: "נתוני הילד אינם תקינים",
                fields,
                details
            })
        }


        /**
         * ====================================================
         *                   Duplicate Key
         * ====================================================
         *
         * MongoDB מחזירה קוד 11000
         * כאשר מנסים להכניס ערך שמפר
         * Unique Index.
         *
         * לדוגמה:
         * אם id מוגדר כייחודי וכבר קיים
         * מסמך עם אותו id.
         *
         * HTTP 409 - Conflict:
         * מציין התנגשות עם המצב הקיים בשרת.
         */
        if (error.code === 11000) {
            return res.status(409).json({
                message: "קיים כבר ילד עם ערך ייחודי זה"
            })
        }


        /**
         * ====================================================
         *                 שגיאות הקשורות לתמונה
         * ====================================================
         *
         * startsWith:
         * בודקת האם מחרוזת מתחילה בטקסט מסוים.
         *
         * ?. (Optional Chaining):
         * מאפשרת להפעיל startsWith רק אם
         * error.message אינו null או undefined.
         *
         * הקוד מזהה הודעות שגיאה המתחילות ב:
         *
         * "Image"
         * "Only"
         * "No image"
         *
         * ומחזיר HTTP 400.
         *
         * חשוב:
         * הזיהוי תלוי בניסוח הודעת השגיאה.
         * בעתיד עדיף להשתמש בסוגי שגיאות
         * או בקודי שגיאה מוגדרים מראש.
         */
        if (
            error.message?.startsWith("Image") ||
            error.message?.startsWith("Only") ||
            error.message?.startsWith("No image")
        ) {
            return res.status(400).json({
                message: error.message
            })
        }


        /**
         * ====================================================
         *                   שגיאה בלתי צפויה
         * ====================================================
         *
         * console.error:
         * מתעדת את השגיאה המלאה בצד השרת,
         * לצורך איתור תקלות.
         *
         * ללקוח מחזירים הודעה כללית בלבד,
         * כדי לא לחשוף פרטים פנימיים
         * על השרת או על מסד הנתונים.
         *
         * HTTP 500 - Internal Server Error.
         */
        console.error("Child create error:", error)

        return res.status(500).json({
            message: "יצירת הילד נכשלה"
        })
    }
}

module.exports = controller
