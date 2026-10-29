
const mongoose = require("mongoose");

// פונקציות לטיפול בסיסמאות:
// isValidPassword - בודקת תקינות של סיסמה
// hashPassword - יוצרת Hash מאובטח של סיסמה
// isBcryptHash - בודקת האם סיסמה שמורה בפורמט bcrypt
// verifyPassword - מאמתת סיסמה מול הערך השמור במסד
const {
    isValidPassword,
    hashPassword,
    isBcryptHash,
    verifyPassword
} = require("../utils/password");

// פונקציה ליצירת Access Token מסוג JWT לאחר התחברות
const { createAccessToken } = require("../config/jwt");

// פונקציות להגבלת ניסיונות התחברות כושלים
const {
    getLoginLock,
    recordLoginFailure,
    clearLoginFailures
} = require("../utils/loginRateLimiter");


/**
 * ============================================================
 *                   GENERIC MODEL CONTROLLER
 * ============================================================
 *
 * פונקציה כללית המייצרת Controller עבור מודל Mongoose.
 *
 * במקום לכתוב פעולות CRUD נפרדות לכל מודל,
 * אפשר להשתמש בפונקציה הזו עבור מודלים שונים.
 *
 * לדוגמה:
 * Parent, Volunteer, Employee.
 *
 * הפונקציה מקבלת אובייקט הגדרות ומחזירה אובייקט
 * המכיל פונקציות לטיפול בבקשות HTTP.
 *
 * הפעולות:
 * getAll  - שליפת כל המסמכים
 * getById - שליפת מסמך לפי מזהה
 * create  - יצירת מסמך חדש
 * register - הרשמת משתמש
 * update  - עדכון מסמך
 * remove  - מחיקת מסמך
 * login   - התחברות משתמש, אם הוגדר שדה סיסמה
 *
 * כל הפונקציות הפנימיות זוכרות את המודל וההגדרות
 * שהתקבלו באמצעות מנגנון Closure של JavaScript.
 */

const createModelController = ({

    // מודל Mongoose שעליו יבוצעו הפעולות
    model,

    // רשימת השדות שמותר ללקוח לשלוח ביצירה ובעדכון
    editableFields,

    // שדות שלא יוחזרו ללקוח, כגון סיסמה
    privateFields = [],

    // שם השדה שבו שמורה הסיסמה
    passwordField,

    // רשימת שדות שלפיהם ניתן לחפש משתמש בהתחברות
    loginFields = [],

    // שם השדה שממנו קוראים את מזהה המשתמש בבקשת התחברות
    loginIdentifierField = "userName",

    // פונקציה לבדיקת תקינות מזהה ההתחברות
    // ברירת המחדל: מחרוזת שאינה ריקה לאחר הסרת רווחים
    loginIdentifierValidator = value =>
        typeof value === "string" && Boolean(value.trim()),

    // פונקציה להכנת מזהה המשתמש לפני חיפוש במסד
    // ברירת המחדל: הסרת רווחים בתחילת המחרוזת ובסופה
    loginIdentifierLookup = value => value.trim(),

    // פונקציה להכנת שדות לפני עדכון
    // כברירת מחדל מחזירה את השדות ללא שינוי
    prepareFields = async fields => fields,

    // פונקציה להכנת שדות לפני יצירה
    // ברירת המחדל זהה ל-prepareFields
    prepareCreateFields = prepareFields,

    // פונקציה לבדיקות מיוחדות לפני הרשמה
    // יכולה לאמת הרשאות ולהוסיף שדות מערכת
    prepareRegistration = async fields => ({ fields }),

    // שדות שהשרת רשאי להוסיף במהלך הרשמה
    // למשל שדה permission שנקבע אחרי אימות בשרת
    registrationOnlyFields = [],

    // שדה שממנו יילקח התפקיד לצורך יצירת JWT
    // אם אינו מוגדר, משתמשים בשם המודל
    tokenRoleField,

    // נתונים ציבוריים נוספים לתשובת התחברות, למשל פעולות Permission של עובד.
    prepareLoginUser = async () => ({}),

    // פונקציה לביצוע ולידציות נוספות
    // מחזירה null כאשר הנתונים תקינים
    // אחרת מחזירה הודעת שגיאה
    validateFields = () => null

}) => {

    /**
     * ========================================================
     *                  הגדרת שדות מותרים
     * ========================================================
     */

    // Set הוא אוסף של ערכים ייחודיים.
    // has מאפשר לבדוק האם ערך מסוים קיים באוסף.
    const allowedFields = new Set(editableFields);

    // שדות המותרים במהלך הרשמה:
    // גם שדות רגילים וגם שדות מערכת מיוחדים
    const allowedRegistrationFields = new Set([
        ...editableFields,
        ...registrationOnlyFields
    ]);


    /**
     * ========================================================
     *                  פונקציות עזר
     * ========================================================
     */


    /**
     * toPublicDocument
     *
     * ממירה מסמך Mongoose לאובייקט JavaScript רגיל,
     * ומוחקת ממנו שדות פרטיים לפני שליחתו ללקוח.
     *
     * לדוגמה:
     * אם במסמך יש userName, email, password
     * ו-password מוגדר כשדה פרטי,
     * יוחזרו רק userName ו-email.
     */
    const toPublicDocument = (document) => {

        // אם לא התקבל מסמך, אין מה להמיר
        if (!document) return document;

        // המרת מסמך Mongoose לאובייקט רגיל
        const result = document.toObject();

        // מעבר על כל השדות הפרטיים
        for (const field of privateFields) {

            // מחיקת השדה מהאובייקט המוחזר
            delete result[field];
        }

        return result;
    };


    /**
     * hidePrivateFields
     *
     * מוסיפה לשאילתת Mongoose הוראות שלא לשלוף
     * שדות פרטיים ממסד הנתונים.
     *
     * select("-password") פירושו:
     * שלוף את המסמך ללא שדה password.
     *
     * בניגוד ל-toPublicDocument שמסירה שדות
     * אחרי השליפה, פונקציה זו מונעת את שליפתם.
     */
    const hidePrivateFields = (query) => {

        let safeQuery = query;

        for (const field of privateFields) {

            // מינוס לפני שם השדה מציין החרגה מהשליפה
            safeQuery = safeQuery.select(`-${field}`);
        }

        return safeQuery;
    };


    /**
     * getUnsupportedFields
     *
     * מחזירה מערך של שמות השדות שהלקוח שלח
     * ואינם מופיעים ברשימת השדות המותרים.
     *
     * Object.keys מחזירה את שמות המאפיינים.
     * filter משאירה רק שדות שאינם מותרים.
     */
    const getUnsupportedFields = (fields) =>
        Object.keys(fields).filter(
            field => !allowedFields.has(field)
        );


    /**
     * isValidPasswordInput
     *
     * בודקת תקינות סיסמה כאשר היא מופיעה בבקשה.
     *
     * תחזיר true אם:
     * 1. לא הוגדר שדה סיסמה למודל.
     * 2. לא נשלחה סיסמה בבקשה.
     * 3. נשלחה סיסמה והיא עברה את בדיקת התקינות.
     *
     * האופרטור || מחזיר true אם לפחות אחד
     * מהתנאים מתקיים.
     */
    const isValidPasswordInput = (fields) =>
        !passwordField ||
        !(passwordField in fields) ||
        isValidPassword(fields[passwordField]);


    /**
     * ========================================================
     *                       LOGIN
     * ========================================================
     *
     * אחראית על התחברות משתמש.
     *
     * שלבי הפעולה:
     * 1. קבלת מזהה משתמש וסיסמה.
     * 2. בדיקת תקינות הנתונים.
     * 3. בדיקה האם המשתמש חסום זמנית.
     * 4. חיפוש המשתמש במסד.
     * 5. אימות הסיסמה.
     * 6. איפוס ניסיונות כושלים במקרה הצלחה.
     * 7. יצירת JWT.
     * 8. החזרת Token ופרטי משתמש ללא מידע פרטי.
     */
    const login = async (req, res) => {

        // נתוני הבקשה או אובייקט ריק אם לא נשלחו
        const body = req.body || {};

        // קבלת מזהה ההתחברות לפי שם השדה שהוגדר
        const identifier = body[loginIdentifierField];

        // חילוץ הסיסמה באמצעות Destructuring
        const { password } = body;

        // בדיקות תקינות ראשוניות
        if (
            !loginIdentifierValidator(identifier) ||
            !isValidPassword(password) ||
            loginFields.length === 0
        ) {
            return res.status(400).json({
                message: `נדרשים ${loginIdentifierField} תקין וסיסמה תקינה`
            });
        }

        // זיהוי כתובת ה-IP של שולח הבקשה
        // ?. מאפשר גישה בטוחה גם אם socket אינו קיים
        const ipAddress =
            req.ip || req.socket?.remoteAddress || "unknown";

        // בדיקת חסימה עקב ניסיונות התחברות כושלים
        // key מזהה את קבוצת ניסיונות ההתחברות
        // retryAfterSeconds מציין כמה שניות נשארו לחסימה
        const { key, retryAfterSeconds } = getLoginLock(
            model.modelName,
            ipAddress,
            identifier
        );

        // אם קיימת חסימה פעילה
        if (retryAfterSeconds > 0) {

            // כותרת HTTP המציינת כמה זמן להמתין
            res.set("Retry-After", String(retryAfterSeconds));

            // 429 = יותר מדי בקשות
            return res.status(429).json({
                message: "בוצעו יותר מדי ניסיוני התחברות כושלים. נסו שוב מאוחר יותר.",
                retryAfterSeconds
            });
        }

        try {

            // ניקוי מזהה המשתמש לפני חיפוש
            const lookupValue = loginIdentifierLookup(identifier);

            // בניית מערך תנאי חיפוש.
            // למשל עבור userName ו-email:
            // [
            //   { userName: "Sara" },
            //   { email: "Sara" }
            // ]
            const criteria = loginFields.map(field => ({
                [field]: lookupValue
            }));

            // חיפוש משתמש שמתאים לאחד מהתנאים
            // $or פירושו OR לוגי
            //
            // select עם + שולף במפורש את שדה הסיסמה,
            // גם אם הוגדר select:false ב-Schema.
            const document = await model
                .findOne({ $or: criteria })
                .select(`+${passwordField}`);

            // אם המשתמש אינו קיים,
            // אין לו סיסמה,
            // או שהסיסמה אינה תואמת
            if (
                !document ||
                !document[passwordField] ||
                !(await verifyPassword(
                    password,
                    document[passwordField]
                ))
            ) {

                // רישום ניסיון התחברות כושל
                recordLoginFailure(key);

                // בדיקה האם הניסיון הנוכחי גרם לחסימה
                const lock = getLoginLock(
                    model.modelName,
                    ipAddress,
                    identifier
                );

                if (lock.retryAfterSeconds > 0) {

                    res.set(
                        "Retry-After",
                        String(lock.retryAfterSeconds)
                    );

                    return res.status(429).json({
                        message: "בוצעו יותר מדי ניסיונות התחברות כושלים. נסו שוב מאוחר יותר.",
                        retryAfterSeconds: lock.retryAfterSeconds
                    });
                }

                // 401 = פרטי התחברות לא תקינים
                return res.status(401).json({
                    message: "פרטי ההתחברות שגויים"
                });
            }

            // התחברות מוצלחת:
            // מחיקת היסטוריית ניסיונות ההתחברות הכושלים
            clearLoginFailures(key);

            // טיפול בסיסמאות ישנות שלא נשמרו כ-bcrypt
            if (!isBcryptHash(document[passwordField])) {

                // יצירת Hash חדש לסיסמה
                document[passwordField] =
                    await hashPassword(password);

                // שמירת הסיסמה המעודכנת במסד
                await document.save();
            }

            // יצירת JWT לאחר אימות מוצלח
            // התפקיד נלקח מהמסמך או משם המודל
            const accessToken = createAccessToken(
                document,
                tokenRoleField
                    ? document[tokenRoleField]
                    : model.modelName
            );
            const loginUser = {
                ...toPublicDocument(document),
                ...await prepareLoginUser(document)
            }

            // החזרת תשובה מוצלחת ללקוח
            return res.json({
                message: "ההתחברות בוצעה בהצלחה",
                accessToken,
                tokenType: "Bearer",
                expiresIn: "1h",
                user: loginUser
            });

        } catch (error) {

            // רישום השגיאה בשרת
            console.error(
                `Failed to log in ${model.modelName}:`,
                error
            );

            // 500 = שגיאת שרת
            return res.status(500).json({
                message: `ההתחברות למערכת ${model.modelName} נכשלה`
            });
        }
    };


    /**
     * ========================================================
     *                       GET ALL
     * ========================================================
     *
     * שולפת את כל המסמכים של המודל.
     *
     * לדוגמה:
     * כל ההורים או כל המתנדבים.
     *
     * מחזירה מערך של מסמכים ללא שדות פרטיים.
     */
    const getAll = async (req, res) => {

        try {

            // model.find מחפש את כל המסמכים
            // hidePrivateFields מחריגה שדות פרטיים
            const documents = await hidePrivateFields(
                model.find()
            );

            // map מפעילה toPublicDocument על כל מסמך
            // כדי לוודא שלא יוחזרו שדות פרטיים
            return res.json(
                documents.map(toPublicDocument)
            );

        } catch (error) {

            return res.status(500).json({
                message: `שליפת רשומות ${model.modelName} נכשלה`
            });
        }
    };


    /**
     * ========================================================
     *                       GET BY ID
     * ========================================================
     *
     * שולפת מסמך אחד לפי מזהה MongoDB.
     *
     * המזהה מתקבל מתוך req.params.
     *
     * לדוגמה:
     * GET /parent/507f1f77bcf86cd799439011
     */
    const getById = async (req, res) => {

        // חילוץ id מפרמטרי הנתיב
        const { id } = req.params;

        // בדיקה האם המזהה תקין מבחינת מבנה ObjectId
        if (!mongoose.isValidObjectId(id)) {

            return res.status(400).json({
                message: "נדרש מזהה MongoDB תקין"
            });
        }

        try {

            // חיפוש מסמך לפי _id
            const document = await hidePrivateFields(
                model.findById(id)
            );

            // אם לא נמצא מסמך מתאים
            if (!document) {

                // 404 = המשאב לא נמצא
                return res.status(404).json({
                    message: `${model.modelName} לא נמצא`
                });
            }

            // החזרת המסמך ללא שדות פרטיים
            return res.json(
                toPublicDocument(document)
            );

        } catch (error) {

            return res.status(500).json({
                message: `שליפת ${model.modelName} נכשלה`
            });
        }
    };


    /**
     * ========================================================
     *                        CREATE
     * ========================================================
     *
     * יוצרת מסמך חדש במסד הנתונים.
     *
     * req - בקשת הלקוח
     * res - תגובת השרת
     * trustedFields - רשימת שדות נוספים שמותר לקבל
     *
     * שלבי הפעולה:
     * 1. בדיקת מבנה הבקשה.
     * 2. בדיקת שדות מותרים.
     * 3. בדיקת שדות חובה בסיסית.
     * 4. הפעלת ולידציות.
     * 5. הכנת הנתונים.
     * 6. יצירת Hash לסיסמה.
     * 7. שמירת המסמך.
     * 8. החזרת תשובה מתאימה.
     */
    const create = async (req, res, trustedFields = []) => {

        // קבלת הנתונים מגוף הבקשה
        const fields = req.body;

        // חובה לקבל אובייקט JSON תקין
        // typeof null הוא object ולכן נדרשת גם בדיקת !fields
        // מערך אינו נחשב לאובייקט נתונים תקין כאן
        if (
            !fields ||
            typeof fields !== "object" ||
            Array.isArray(fields)
        ) {
            return res.status(400).json({
                message: "יש לשלוח אובייקט JSON"
            });
        }

        // יצירת אוסף שדות מותרים לבקשה הנוכחית
        // כולל שדות מהימנים נוספים, אם הועברו
        const allowedFieldsForRequest = new Set([
            ...allowedFields,
            ...trustedFields
        ]);

        // איתור שדות שהלקוח אינו רשאי לשלוח
        const unsupportedFields = Object.keys(fields).filter(
            field => !allowedFieldsForRequest.has(field)
        );

        // דחיית בקשה שמכילה שדות אסורים
        if (unsupportedFields.length > 0) {

            return res.status(400).json({
                message: "נשלחו שדות שאינם נתמכים",
                fields: unsupportedFields
            });
        }

        // דחיית בקשה ללא שדות
        if (Object.keys(fields).length === 0) {

            return res.status(400).json({
                message: "יש לשלוח לפחות שדה אחד"
            });
        }

        // הפעלת ולידציות שהוגדרו עבור המודל
        const validationMessage = validateFields(fields);

        // אם הוחזרה הודעת שגיאה, הנתונים אינם תקינים
        if (validationMessage) {

            return res.status(400).json({
                message: validationMessage
            });
        }

        // בדיקת תקינות הסיסמה אם נשלחה
        if (!isValidPasswordInput(fields)) {

            return res.status(400).json({
                message: "הסיסמה חייבת להיות מחרוזת לא ריקה בגודל של עד 72 בתים ב-UTF-8"
            });
        }

        try {

            // יצירת עותק של הנתונים והעברתו להכנה
            // Spread יוצר העתקה שטחית של האובייקט
            const values = await prepareCreateFields({
                ...fields
            });

            // אם המודל כולל שדה סיסמה
            // והסיסמה קיימת בנתונים
            if (passwordField && passwordField in values) {

                // מחליפים את הסיסמה המקורית ב-Hash
                // כדי שלא תישמר כסיסמה גלויה
                values[passwordField] =
                    await hashPassword(values[passwordField]);
            }

            // יצירת המסמך במסד הנתונים
            const document = await model.create(values);

            // 201 = המסמך נוצר בהצלחה
            return res.status(201).json(
                toPublicDocument(document)
            );

        } catch (error) {

            // הדפסת השגיאה המלאה בצד השרת
            console.error("Create error:", error);

            // MongoDB מחזיר קוד 11000
            // כאשר כתיבה מפרה אינדקס ייחודי
            if (error.code === 11000) {

                // חילוץ שמות השדות שגרמו להתנגשות
                const duplicateFields = Object.keys(
                    error.keyPattern || error.keyValue || {}
                );

                // בניית הודעת שגיאה מפורטת
                const message = duplicateFields.length > 0
                    ? `קיים כבר רשומה עם ${duplicateFields.join(", ")}`
                    : `קיים כבר ערך כפול עבור ${model.modelName}`;

                // 409 = התנגשות עם נתון קיים
                return res.status(409).json({ message });
            }

            // שגיאת ולידציה או המרת טיפוס -> 400
            // כל שגיאה אחרת -> 500
            const status =
                error.name === "ValidationError" ||
                error.name === "CastError"
                    ? 400
                    : 500;

            return res.status(status).json({
                message: `יצירת ${model.modelName} נכשלה`
            });
        }
    };


    /**
     * ========================================================
     *                       REGISTER
     * ========================================================
     *
     * מטפלת בהרשמת משתמש חדש.
     *
     * בניגוד ל-create, כאן אפשר לבצע
     * בדיקות הרשאה מיוחדות לפני יצירת המסמך.
     *
     * למשל:
     * בדיקת קוד אישור לעובד,
     * קביעת תפקיד או הרשאות,
     * הוספת שדות מערכת.
     *
     * לאחר הבדיקות משתמשים בפונקציית create
     * כדי לא לשכפל את לוגיקת שמירת הנתונים.
     */
    const register = async (req, res) => {

        const fields = req.body;

        // בדיקה שהתקבל אובייקט JSON
        if (
            !fields ||
            typeof fields !== "object" ||
            Array.isArray(fields)
        ) {
            return res.status(400).json({
                message: "יש לשלוח אובייקט JSON"
            });
        }

        // בהרשמה חובה להגדיר סיסמה תקינה
        if (
            !passwordField ||
            !isValidPassword(fields[passwordField])
        ) {
            return res.status(400).json({
                message: "יש להזין סיסמה תקינה"
            });
        }

        try {

            // הפעלת פונקציית הכנה מיוחדת להרשמה
            // מקבלת את הנתונים ואת אובייקט הבקשה
            const registration = await prepareRegistration(
                fields,
                req
            );

            // אם פונקציית ההכנה החזירה שגיאה
            if (registration.error) {

                return res.status(registration.error.status).json({
                    message: registration.error.message
                });
            }

            // בדיקה שכל השדות לאחר ההכנה מותרים
            // כולל שדות מערכת מיוחדים להרשמה
            const unsupportedFields =
                Object.keys(registration.fields).filter(
                    field => !allowedRegistrationFields.has(field)
                );

            if (unsupportedFields.length > 0) {

                return res.status(400).json({
                    message: "נשלחו שדות שאינם נתמכים",
                    fields: unsupportedFields
                });
            }

            // יצירת אובייקט בקשה חדש:
            // מעתיקים את req ומחליפים את body
            // בנתונים שעברו את שלב הכנת ההרשמה.
            //
            // לאחר מכן מפעילים את create,
            // עם הרשאה לשדות המיוחדים של ההרשמה.
            return create(
                { ...req, body: registration.fields },
                res,
                registrationOnlyFields
            );

        } catch (error) {

            // שגיאה בזמן הכנת ההרשמה
            console.error(
                `Failed to prepare ${model.modelName} registration:`,
                error
            );

            return res.status(500).json({
                message: `הרשמת ${model.modelName} נכשלה`
            });
        }
    };


    /**
     * ========================================================
     *                        UPDATE
     * ========================================================
     *
     * מעדכנת מסמך קיים לפי _id.
     *
     * העדכון הוא חלקי:
     * רק השדות שנשלחו בבקשה ישתנו.
     *
     * משתמשת ב-$set כדי לא לדרוס
     * את שאר שדות המסמך.
     */
    const update = async (req, res) => {

        // קבלת מזהה המסמך מהנתיב
        const { id } = req.params;

        // קבלת השדות לעדכון
        const fields = req.body;

        // בדיקת תקינות ObjectId
        if (!mongoose.isValidObjectId(id)) {

            return res.status(400).json({
                message: "נדרש מזהה MongoDB תקין"
            });
        }

        // בדיקה שהנתונים הם אובייקט תקין
        if (
            !fields ||
            typeof fields !== "object" ||
            Array.isArray(fields)
        ) {
            return res.status(400).json({
                message: "יש לשלוח אובייקט JSON"
            });
        }

        // איתור שדות שאסור לעדכן
        const unsupportedFields = getUnsupportedFields(fields);

        if (unsupportedFields.length > 0) {

            return res.status(400).json({
                message: "נשלחו שדות שאינם נתמכים",
                fields: unsupportedFields
            });
        }

        // חובה לשלוח לפחות שדה אחד לעדכון
        if (Object.keys(fields).length === 0) {

            return res.status(400).json({
                message: "יש לשלוח לפחות שדה אחד"
            });
        }

        // הפעלת ולידציות מותאמות למודל
        const validationMessage = validateFields(fields);

        if (validationMessage) {

            return res.status(400).json({
                message: validationMessage
            });
        }

        // בדיקת תקינות סיסמה חדשה, אם נשלחה
        if (!isValidPasswordInput(fields)) {

            return res.status(400).json({
                message: "הסיסמה חייבת להיות מחרוזת לא ריקה בגודל של עד 72 בתים ב-UTF-8"
            });
        }

        try {

            // הכנת עותק הנתונים לפני עדכון
            const updates = await prepareFields({
                ...fields
            });

            // אם נשלחה סיסמה חדשה,
            // יוצרים Hash לפני שמירתה
            if (passwordField && passwordField in updates) {

                updates[passwordField] =
                    await hashPassword(updates[passwordField]);
            }

            // חיפוש המסמך ועדכונו לפי _id
            const document = await model.findByIdAndUpdate(
                id,

                // $set מעדכן רק את השדות שנשלחו
                { $set: updates },

                {
                    // מחזיר את המסמך לאחר העדכון
                    new: true,

                    // מפעיל ולידציות Schema המתאימות לעדכון
                    runValidators: true
                }
            );

            // אם המסמך אינו קיים
            if (!document) {

                return res.status(404).json({
                    message: `${model.modelName} לא נמצא`
                });
            }

            // החזרת המסמך המעודכן ללא שדות פרטיים
            return res.json(
                toPublicDocument(document)
            );

        } catch (error) {

            // קביעת קוד שגיאה בהתאם לסוג התקלה:
            // 400 - ולידציה או המרת טיפוס
            // 409 - התנגשות עם אינדקס ייחודי
            // 500 - שגיאה אחרת
            const status =
                error.name === "ValidationError" ||
                error.name === "CastError"
                    ? 400
                    : error.code === 11000
                        ? 409
                        : 500;

            return res.status(status).json({
                message: `עדכון ${model.modelName} נכשל`
            });
        }
    };


    /**
     * ========================================================
     *                        REMOVE
     * ========================================================
     *
     * מוחקת מסמך לפי מזהה MongoDB.
     *
     * שלבי הפעולה:
     * 1. קבלת id מהנתיב.
     * 2. בדיקת תקינות המזהה.
     * 3. חיפוש ומחיקת המסמך.
     * 4. החזרת הודעת הצלחה או שגיאה.
     */
    const remove = async (req, res) => {

        // חילוץ מזהה המסמך מהנתיב
        const { id } = req.params;

        // בדיקת תקינות ObjectId
        if (!mongoose.isValidObjectId(id)) {

            return res.status(400).json({
                message: "נדרש מזהה MongoDB תקין"
            });
        }

        try {

            // חיפוש המסמך לפי _id ומחיקתו
            // הפונקציה מחזירה את המסמך שנמחק,
            // או null אם לא נמצא מסמך
            const document = await model.findByIdAndDelete(id);

            // אם לא נמצא מסמך למחיקה
            if (!document) {

                return res.status(404).json({
                    message: `${model.modelName} לא נמצא`
                });
            }

            // החזרת הודעת הצלחה
            return res.json({
                message: `${model.modelName} נמחק בהצלחה`
            });

        } catch (error) {

            // שגיאת שרת בזמן מחיקה
            return res.status(500).json({
                message: `מחיקת ${model.modelName} נכשלה`
            });
        }
    };


    /**
     * ========================================================
     *                 החזרת פונקציות ה-CONTROLLER
     * ========================================================
     *
     * הפונקציה הראשית מחזירה אובייקט
     * שמכיל את כל הפעולות שנוצרו.
     *
     * כתיבה מקוצרת:
     * { getAll }
     *
     * שקולה ל:
     * { getAll: getAll }
     *
     * הביטוי:
     * ...(passwordField ? { login } : {})
     *
     * מוסיף את login רק אם הוגדר passwordField.
     *
     * כך מודל ללא סיסמה לא יקבל פעולת התחברות.
     */

    return {
        getAll,
        getById,
        create,
        register,
        update,
        remove,
        ...(passwordField ? { login } : {})
    };

}; // סוף createModelController


/**
 * ============================================================
 *                         EXPORT
 * ============================================================
 *
 * ייצוא פונקציית יצירת ה-Controller.
 *
 * מאפשר לקבצים אחרים להשתמש בה באמצעות require.
 *
 * לדוגמה:
 *
 * const createModelController =
 *     require("./createModelController");
 */

module.exports = createModelController;
