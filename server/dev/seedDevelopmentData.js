// טוען את Mongoose כדי להשתמש במודלים ובמזהי ObjectId קבועים.
const mongoose = require("mongoose")
// טוען HMAC כדי לזהות את הרשאת medium לפי מנגנון החיפוש הפרטי הקיים.
const { createHmac } = require("crypto")
// טוען מודלים כדי שכל מסמך יעבור ולידציה לפי הסכמה הקיימת.
const Parent = require("../models/Parent")
const Child = require("../models/Child")
const Volunteer = require("../models/Volun")
const Employee = require("../models/Employee")
const Event = require("../models/Event")
const ChildEvent = require("../models/ChildEvent")
const VolunteerEvent = require("../models/VolunEvent")
const Payment = require("../models/Payment")
// טוען את אותו סוד שרת שבו המערכת יוצרת את nameLookup להרשאות.
const { getJwtSecret } = require("../config/jwt")
const Permission = require("../models/Permission")
// משתמשים באותו מנגנון bcrypt של השרת; סיסמת בדיקה גלויה אינה נשמרת במסד.
const { hashPassword, isValidPassword } = require("../utils/password")

// מזהי ObjectId קבועים מאפשרים לזהות מסמכים שנוצרו על ידי הסקריפט בהרצות הבאות.
// הערכים נמצאים בטווח ייעודי ואינם מזהים של משתמשים אמיתיים.
const IDS = Object.freeze({
    parents: ["66f100000000000000000001", "66f100000000000000000002", "66f100000000000000000003"],
    children: [
        "66f200000000000000000001", "66f200000000000000000002",
        "66f200000000000000000003", "66f200000000000000000004",
        "66f200000000000000000005", "66f200000000000000000006",
        "66f200000000000000000007", "66f200000000000000000008",
        "66f200000000000000000009", "66f20000000000000000000a"
    ],
    volunteers: [
        "66f300000000000000000001", "66f300000000000000000002",
        "66f300000000000000000003", "66f300000000000000000004",
        "66f300000000000000000005", "66f300000000000000000006",
        "66f300000000000000000007", "66f300000000000000000008"
    ],
    employee: "66f400000000000000000001",
    events: [
        "66f500000000000000000001", "66f500000000000000000002",
        "66f500000000000000000003", "66f500000000000000000004",
        "66f500000000000000000005", "66f500000000000000000006"
    ],
    childEvents: [
        "66f600000000000000000001", "66f600000000000000000002",
        "66f600000000000000000003", "66f600000000000000000004",
        "66f600000000000000000005", "66f600000000000000000006",
        "66f600000000000000000007", "66f600000000000000000008",
        "66f600000000000000000009", "66f60000000000000000000a",
        "66f60000000000000000000b", "66f60000000000000000000c",
        "66f60000000000000000000d", "66f60000000000000000000e"
    ],
    volunteerEvents: [
        "66f700000000000000000001", "66f700000000000000000002",
        "66f700000000000000000003", "66f700000000000000000004",
        "66f700000000000000000005", "66f700000000000000000006",
        "66f700000000000000000007", "66f700000000000000000008",
        "66f700000000000000000009", "66f70000000000000000000a",
        "66f70000000000000000000b", "66f70000000000000000000c"
    ],
    payments: [
        "66f800000000000000000001", "66f800000000000000000002",
        "66f800000000000000000003", "66f800000000000000000004",
        "66f800000000000000000005"
    ]
})

// מחזיר מערך של תיאורי רשומות, כאשר ההפניות מבוססות על IDS ולא על מזהים אקראיים.
// passwordHash הוא bcrypt hash שכבר חושב פעם אחת עבור כל חשבונות ההדגמה.
const createSeedPlan = (passwordHash, permissionId, now = new Date()) => {
    // קובע תאריכים יחסיים להפעלה, כדי שבכל פעם ראשונה יהיו אירועים עתידיים ואירועים שהסתיימו.
    const daysFromNow = days => new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    // יוצר חלון הרשמה עם הפרש של ימים; כל חלון מתחיל לפני שהוא מסתיים.
    const registrationWindow = (startOffset, endOffset) => ({
        startReg: daysFromNow(startOffset),
        endReg: daysFromNow(endOffset)
    })

    // מגדיר הורים לפי השדות שיש בסכמה; אין בסכמת Parent שדה שם, ולכן נשמרים רק פרטי התחברות וקשרי ילדים.
    const parents = [
        { _id: IDS.parents[0], id: "DEV-PARENT-001", email: "rachel.parent@example.com", password: passwordHash, children: [IDS.children[0], IDS.children[1], IDS.children[2], IDS.children[3]] },
        { _id: IDS.parents[1], id: "DEV-PARENT-002", email: "miriam.parent@example.com", password: passwordHash, children: [IDS.children[4], IDS.children[5], IDS.children[6]] },
        { _id: IDS.parents[2], id: "DEV-PARENT-003", email: "chana.parent@example.com", password: passwordHash, children: [IDS.children[7], IDS.children[8], IDS.children[9]] }
    ]

    // מגדיר ילדים עם גילאים, קטגוריות וסטטוסים המותרים בסכמת Child, ועם טלפונים פיקטיביים בולטים.
    const children = [
        { _id: IDS.children[0], fullName: "חיה מושקא פרידמן", parent: IDS.parents[0], id: "DEV-CHILD-001", phone: "000-000-0001", age: 7, epilepsy: "לא", sensitivity: "רגישות קלה לרעש", medicines: "אין", canBeFilemed: false, detailing: "זקוקה להסבר קצר לפני פעילות חדשה", notes: "מעדיפה משחקי הרכבה", status: "minHelping", category: ["easy"] },
        { _id: IDS.children[1], fullName: "שיינא רוזנברג", parent: IDS.parents[0], id: "DEV-CHILD-002", phone: "000-000-0002", age: 9, epilepsy: "לא", sensitivity: "ללא", medicines: "אין", canBeFilemed: true, detailing: "מתקשרת היטב בקבוצה קטנה", notes: "אוהבת יצירה", status: "undependent", category: ["easy", "ASD"] },
        { _id: IDS.children[2], fullName: "דבורה לאה שפירא", parent: IDS.parents[0], id: "DEV-CHILD-003", phone: "000-000-0003", age: 11, epilepsy: "מטופלת ומאוזנת", sensitivity: "רגישות לבשמים", medicines: "לפי הנחיית ההורה", canBeFilemed: false, detailing: "יש לוודא נוכחות מבוגר אחראי", notes: "נהנית ממוזיקה שקטה", status: "needChangig", category: ["med", "ASD"] },
        { _id: IDS.children[3], fullName: "נחמה בלוי", parent: IDS.parents[0], id: "DEV-CHILD-004", phone: "000-000-0004", age: 6, epilepsy: "לא", sensitivity: "ללא", medicines: "אין", canBeFilemed: true, detailing: "נדרשת עזרה במעברים בין פעילויות", notes: "מתחברת לסיפורים", status: "minHelping", category: ["easy"] },
        { _id: IDS.children[4], fullName: "אסתר גולדברג", parent: IDS.parents[1], id: "DEV-CHILD-005", phone: "000-000-0005", age: 10, epilepsy: "לא", sensitivity: "רגישות למזון מסוים", medicines: "אין", canBeFilemed: false, detailing: "יש לבדוק רכיבי כיבוד מול ההורה", notes: "אוהבת משחקי קופסה", status: "undependent", category: ["med"] },
        { _id: IDS.children[5], fullName: "רבקה קפלן", parent: IDS.parents[1], id: "DEV-CHILD-006", phone: "000-000-0006", age: 8, epilepsy: "לא", sensitivity: "ללא", medicines: "אין", canBeFilemed: true, detailing: "עשויה להזדקק לתזכורת במהלך הפעילות", notes: "אוהבת ציור", status: "minHelping", category: ["easy", "down"] },
        { _id: IDS.children[6], fullName: "שרה ברמן", parent: IDS.parents[1], id: "DEV-CHILD-007", phone: "000-000-0007", age: 13, epilepsy: "לא", sensitivity: "רגישות לרעש חזק", medicines: "אין", canBeFilemed: false, detailing: "עדיף לשבץ בקבוצה רגועה", notes: "מתעניינת בבישול", status: "needChangig", category: ["med", "mr"] },
        { _id: IDS.children[7], fullName: "לאה וינברג", parent: IDS.parents[2], id: "DEV-CHILD-008", phone: "000-000-0008", age: 5, epilepsy: "לא", sensitivity: "ללא", medicines: "אין", canBeFilemed: true, detailing: "זקוקה לליווי צמוד בחצר", notes: "אוהבת בועות סבון", status: "needChangig", category: ["chalenged"] },
        { _id: IDS.children[8], fullName: "מרים הלוי", parent: IDS.parents[2], id: "DEV-CHILD-009", phone: "000-000-0009", age: 12, epilepsy: "לא", sensitivity: "ללא", medicines: "אין", canBeFilemed: false, detailing: "עצמאית ברוב הפעילויות", notes: "מעדיפה משימות מסודרות", status: "undependent", category: ["easy", "ASD"] },
        { _id: IDS.children[9], fullName: "ציפורה רוט", parent: IDS.parents[2], id: "DEV-CHILD-010", phone: "000-000-0010", age: 9, epilepsy: "לא", sensitivity: "רגישות עונתית", medicines: "אין", canBeFilemed: true, detailing: "כדאי לעדכן לפני שינוי בתוכנית", notes: "אוהבת פעילות בחוץ", status: "minHelping", category: ["med", "down"] }
    ]

    // מגדיר מתנדבות בלבד, עם שמות, גילאים ופרטים מגוונים; הדוא"ל בדומיין שמיועד לדוגמאות.
    const volunteers = [
        { _id: IDS.volunteers[0], fullName: "אילה כהן", password: passwordHash, email: "ayala.volunteer@example.com", id: "DEV-VOL-001", phone: "000-100-0001", age: 22, seminar: "סמינר בית יעקב", detaling: "ניסיון בהדרכת יצירה" },
        { _id: IDS.volunteers[1], fullName: "ברכה לנדאו", password: passwordHash, email: "bracha.volunteer@example.com", id: "DEV-VOL-002", phone: "000-100-0002", age: 24, seminar: "סמינר החדש", detaling: "פנויה בעיקר בשעות אחר הצהריים" },
        { _id: IDS.volunteers[2], fullName: "גיטי רוזנפלד", password: passwordHash, email: "giti.volunteer@example.com", id: "DEV-VOL-003", phone: "000-100-0003", age: 20, seminar: "סמינר וולף", detaling: "אוהבת משחקי חברה ויצירה" },
        { _id: IDS.volunteers[3], fullName: "חני אייזנברג", password: passwordHash, email: "chani.volunteer@example.com", id: "DEV-VOL-004", phone: "000-100-0004", age: 26, seminar: "סמינר בית יעקב", detaling: "ניסיון בליווי ילדים צעירים" },
        { _id: IDS.volunteers[4], fullName: "טובה שפירא", password: passwordHash, email: "tova.volunteer@example.com", id: "DEV-VOL-005", phone: "000-100-0005", age: 23, seminar: "סמינר גור", detaling: "מתעניינת במוזיקה ובפעילות רגועה" },
        { _id: IDS.volunteers[5], fullName: "יוכבד פרל", password: passwordHash, email: "yocheved.volunteer@example.com", id: "DEV-VOL-006", phone: "000-100-0006", age: 21, seminar: "סמינר החדש", detaling: "זמינה בימי חול" },
        { _id: IDS.volunteers[6], fullName: "מנוחה דייטש", password: passwordHash, email: "menucha.volunteer@example.com", id: "DEV-VOL-007", phone: "000-100-0007", age: 25, seminar: "סמינר בית יעקב", detaling: "ניסיון במשחקי קופסה" },
        { _id: IDS.volunteers[7], fullName: "נחמי פריד", password: passwordHash, email: "nachmi.volunteer@example.com", id: "DEV-VOL-008", phone: "000-100-0008", age: 19, seminar: "סמינר וולף", detaling: "שמחה להשתלב בפעילויות קבוצתיות" }
    ]

    // מגדיר עובדת הדגמה אחת עם הרשאת matching הקיימת; לא נוצרת הרשאת admin ולא נשתנות הרשאות קיימות.
    const employees = [
        { _id: IDS.employee, fullName: "רחל מלכה", id: "DEV-EMPLOYEE-001", phone: "0000000001", userName: "demo.employee", password: passwordHash, permission: permissionId, workingTime: 0, currentWorkingTime: 0 }
    ]

    // מגדיר שישה אירועים בעלי קיבולות, מחירים וחלונות הרשמה שונים.
    // בשדות Children ו-Volunteers יוזנו בהמשך מזהי מסמכי ההרשמה שנוצרים בפועל.
    const eventRows = [
        { name: "סדנת יצירה לקראת החורף", dateOffset: 10, registration: registrationWindow(-7, 3), hour: "16:30", price: 0, detailingForParent: "מפגש יצירה מותאם לילדים בקבוצה קטנה.", detailingForVolun: "יש להגיע כרבע שעה לפני תחילת הפעילות.", sumOfChilds: 5, SavedPlaces: 1, isActive: true },
        { name: "מפגש משחקי חברה", dateOffset: 21, registration: registrationWindow(-5, 10), hour: "17:00", price: 25, detailingForParent: "משחקים משותפים באווירה נעימה ומותאמת.", detailingForVolun: "נדרשת עזרה בהנחיית משחקים ובקבלת הילדים.", sumOfChilds: 7, SavedPlaces: 1, isActive: true },
        { name: "יום פעילות וצלילים", dateOffset: 35, registration: registrationWindow(-12, 4), hour: "16:00", price: 40, detailingForParent: "פעילות מוזיקלית בקבוצות קטנות.", detailingForVolun: "הפעילות מתקיימת בחדר שקט; יש לעדכן על צורך בהנגשה.", sumOfChilds: 4, SavedPlaces: 1, isActive: true },
        { name: "מפגש סיפורים ויצירה", dateOffset: 60, registration: registrationWindow(2, 20), hour: "16:45", price: 20, detailingForParent: "מפגש המשלב סיפור ויצירה.", detailingForVolun: "ההרשמה תיפתח בהמשך; אפשר לעיין בפרטי הפעילות.", sumOfChilds: 4, SavedPlaces: 0, isActive: true },
        { name: "פעילות קיץ קהילתית", dateOffset: -20, registration: registrationWindow(-45, -25), hour: "17:30", price: 30, detailingForParent: "פעילות קהילתית שהתקיימה בקיץ.", detailingForVolun: "האירוע הסתיים ומשמש להצגת היסטוריית פעילות.", sumOfChilds: 6, SavedPlaces: 1, isActive: false },
        { name: "בוקר תנועה ומשחק", dateOffset: 5, registration: registrationWindow(-15, -2), hour: "10:00", price: 15, detailingForParent: "מפגש תנועה מותאם בשעות הבוקר.", detailingForVolun: "חלון ההרשמה הסתיים; האירוע הקרוב יוצג כלא זמין להרשמה.", sumOfChilds: 5, SavedPlaces: 1, isActive: true }
    ]
    // מוסיף לכל אירוע מזהה עסקי ייחודי ואת התאריכים המחושבים, בלי להסתמך על המונה האוטומטי.
    const events = eventRows.map((row, index) => ({
        _id: IDS.events[index],
        name: row.name,
        id: 990001 + index,
        Children: [],
        Volunteers: [],
        sumOfChilds: row.sumOfChilds,
        SavedPlaces: row.SavedPlaces,
        isActive: row.isActive,
        date: daysFromNow(row.dateOffset),
        startReg: row.registration.startReg,
        endReg: row.registration.endReg,
        hour: row.hour,
        price: row.price,
        detailingForParent: row.detailingForParent,
        detailingForVolun: row.detailingForVolun
    }))

    // מתאר כמה ילדים וכמה מתנדבות נרשמות לכל אירוע; המספרים השונים מדגימים חוסר התאמה בין הקבוצות.
    const eventParticipation = [
        { children: [0, 1, 2], volunteers: [0, 1, 2], matches: 2 },
        { children: [3, 4], volunteers: [3, 4, 5, 6], matches: 2 },
        { children: [5, 6, 7], volunteers: [7], matches: 1 },
        { children: [8], volunteers: [], matches: 0 },
        { children: [0, 4, 9], volunteers: [0, 5], matches: 2 },
        { children: [2, 6], volunteers: [1, 7], matches: 1 }
    ]

    // יוצר מסמכי ChildEvent, שהם רשומות ההשתתפות בפועל של ילדים באירועים.
    const childEvents = []
    // יוצר מסמכי VolunteerEvent, שהם רשומות ההשתתפות של מתנדבות, ובהמשך גם צד אחד של כל שיבוץ.
    const volunteerEvents = []
    // מחזיק את הזוגות שנבחרו לשיבוץ, כדי ששתי הרשומות יקבלו הפניה הדדית לאותם מזהים.
    const assignments = []
    // מתחיל את מוני ההרשמות באפס, כדי לחלק מזהים קבועים ורציפים לפי הסדר.
    let childEventIndex = 0
    let volunteerEventIndex = 0

    // עובר על האירועים ומקשר בכל פעם את מזהי הילדים והמתנדבות המתאימים לאירוע הנוכחי.
    eventParticipation.forEach((participation, eventIndex) => {
        // שומר את מזהי השתתפות הילדים של האירוע המקומי לצורך יצירת השיבוצים.
        const eventChildRegistrations = []
        // שומר את מזהי השתתפות המתנדבות של האירוע המקומי לצורך יצירת השיבוצים.
        const eventVolunteerRegistrations = []

        // יוצר הרשמת ילד אחת לכל אינדקס שנבחר ברשימת המשתתפים.
        participation.children.forEach((childIndex, localIndex) => {
            // בוחר מזהה ייחודי וקבוע לרשומת ההשתתפות הנוכחית.
            const registrationId = IDS.childEvents[childEventIndex]
            // מוסיף את מסמך ההשתתפות, כשהילד והאירוע כבר קיימים או נוצרים בסדר שנקבע.
            childEvents.push({
                _id: registrationId,
                child: IDS.children[childIndex],
                event: IDS.events[eventIndex],
                favoriteVolun: localIndex === 0 ? "עדיפות למתנדבת עם ניסיון ביצירה" : ""
            })
            // שומר את מזהה הרשמת הילד באותו סדר שבו נוצרה.
            eventChildRegistrations.push(registrationId)
            // מקדם את המונה כדי שההרשמה הבאה תקבל מזהה אחר.
            childEventIndex += 1
        })

        // יוצר הרשמת מתנדבת לכל מתנדבת שנבחרה לאירוע הנוכחי.
        participation.volunteers.forEach((volunteerIndex, localIndex) => {
            // בוחר מזהה ייחודי וקבוע לרשומת ההשתתפות הנוכחית.
            const registrationId = IDS.volunteerEvents[volunteerEventIndex]
            // מוסיף מסמך השתתפות עם קשרים למתנדבת ולאירוע קיימים.
            volunteerEvents.push({
                _id: registrationId,
                volunteer: IDS.volunteers[volunteerIndex],
                event: IDS.events[eventIndex],
                notes: localIndex === 0 ? "אפשר לשאול את ההורה לגבי העדפות הפעילות." : "",
                favouredChild: ""
            })
            // שומר את מזהה הרשמת המתנדבת באותו סדר שבו נוצרה.
            eventVolunteerRegistrations.push(registrationId)
            // מקדם את המונה כדי למנוע שימוש חוזר במזהה.
            volunteerEventIndex += 1
        })

        // משבץ רק את מספר הזוגות שהוגדר לאירוע, ובכך משאיר גם רשומות שאינן משובצות.
        for (let matchIndex = 0; matchIndex < participation.matches; matchIndex += 1) {
            // בוחר את שתי רשומות ההשתתפות באותו מיקום; שתיהן שייכות לאותו אירוע.
            const childRegistrationId = eventChildRegistrations[matchIndex]
            const volunteerRegistrationId = eventVolunteerRegistrations[matchIndex]
            // מפסיק אם הגדרת נתונים אינה מאפשרת זוג מלא, במקום ליצור קשר לא תקין.
            if (!childRegistrationId || !volunteerRegistrationId) {
                throw new Error(`הגדרת השיבוץ באירוע ${eventIndex + 1} אינה כוללת ילד ומתנדבת מתאימים`)
            }
            // שומר זוג מזהים יחיד שממנו תיבנה ההפניה הדו-צדדית בהמשך.
            assignments.push({ childRegistrationId, volunteerRegistrationId })
            // רושם בצד הילד את מזהה השתתפות המתנדבת.
            childEvents.find(registration => registration._id === childRegistrationId).volunteer = volunteerRegistrationId
            // רושם בצד המתנדבת את מזהה השתתפות הילד.
            volunteerEvents.find(registration => registration._id === volunteerRegistrationId).child = childRegistrationId
        }
    })

    // מגדיר תשלומי דוגמה במצבי pending, succeeded ו-failed, רק לאירועים בתשלום.
    const payments = [
        { _id: IDS.payments[0], payerId: IDS.parents[0], event: IDS.events[1], amount: 25, status: "succeeded", transactionId: "DEV-SEED-TXN-001" },
        { _id: IDS.payments[1], payerId: IDS.parents[1], event: IDS.events[1], amount: 25, status: "pending", transactionId: "DEV-SEED-TXN-002" },
        { _id: IDS.payments[2], payerId: IDS.parents[2], event: IDS.events[2], amount: 40, status: "failed", transactionId: "DEV-SEED-TXN-003" },
        { _id: IDS.payments[3], payerId: IDS.parents[0], event: IDS.events[4], amount: 30, status: "succeeded", transactionId: "DEV-SEED-TXN-004" },
        { _id: IDS.payments[4], payerId: IDS.parents[1], event: IDS.events[5], amount: 15, status: "pending", transactionId: "DEV-SEED-TXN-005" }
    ]

    // מחזיר תוכנית יצירה מפורשת; התוכנית אינה מבצעת פעולות מסד נתונים בעצמה.
    return { parents, children, volunteers, employees, events, childEvents, volunteerEvents, payments, assignments }
}

// בודק שערך קישור באירוע אינו נמחק; החיפוש אינו משנה מסמכים קיימים.
const containsAllReferences = (storedIds, expectedIds) => {
    // ממיר ObjectId למחרוזת כדי להשוות גם ערכים שנשלפו כמזהים וגם מחרוזות מקוריות.
    const normalizedStoredIds = new Set((storedIds || []).map(id => String(id)))
    // מחזיר אמת רק כאשר כל הפניה שהתוכנית דורשת קיימת במסמך.
    return expectedIds.every(id => normalizedStoredIds.has(String(id)))
}

// יוצר מסמך חדש בלבד; מסמך קיים לעולם אינו מקבל עדכון או החלפת שדות.
// model הוא מודל Mongoose, document הוא הנתונים ליצירה, ו-description משמש הודעת שגיאה.
const createIfMissing = async (model, document, description) => {
    // מפעיל את כללי הסכמה ואת ה-hooks של validate לפני שנשלחת כתיבה למסד.
    await new model(document).validate()
    // מחפש לפי המזהה הקבוע כדי לדלג על רשומה שכבר נוצרה בהרצה קודמת.
    const existing = await model.findById(document._id).select("_id").lean()
    // מסמך קיים נשאר ללא שינוי; כך נתונים ידניים אינם נדרסים בהרצה חוזרת.
    if (existing) return false

    try {
        // create מפעיל את שמירת Mongoose ואת בדיקת האינדקסים הייחודיים של MongoDB.
        await model.create(document)
        // אמת מציינת שהמסמך נוסף בהרצה הנוכחית.
        return true
    } catch (error) {
        // אם תהליך אחר יצר את אותו _id במקביל, מתייחסים לכך כאל רשומה קיימת ולא משנים אותה.
        if (error.code === 11000) {
            const createdElsewhere = await model.findById(document._id).select("_id").lean()
            // מתעלמים רק מהתנגשות שהמסמך שלה אכן קיים באותו _id; התנגשות בשדה אחר תישאר שגיאה.
            if (createdElsewhere) return false
        }
        // מעביר שגיאות ולידציה, מסד או התנגשות אחרת לשכבת האתחול.
        throw new Error(`יצירת ${description} נכשלה: ${error.message}`, { cause: error })
    }
}

// מוסיף הפניות למסמך seed קיים בלי להסיר הפניות אחרות ובלי לגעת במסמך שאינו מזוהה כשייך ל-seed.
// model הוא מודל היעד, id הוא מזהה המסמך, identity הוא שדה ושווי ייחודי, field הוא מערך ההפניות.
const addReferencesToSeedDocument = async (model, id, identity, field, references, description) => {
    // קורא את המסמך כדי לוודא שהמזהה הקבוע אינו מצביע על רשומה ידנית אחרת.
    const existing = await model.findById(id).select(`${identity.field} ${field}`).lean()
    // עצירה מונעת הוספת הפניות למסמך זר במקרה של התנגשות מזהים או שינוי ידני.
    if (!existing || existing[identity.field] !== identity.value) {
        throw new Error(`לא ניתן לאמת את רשומת ${description} הקבועה; לא בוצע עדכון של קשרים`)
    }

    // בודק שכל מסמך יעד קיים לפני שמוסיפים אליו הפניה.
    const missingReferences = []
    for (const reference of references) {
        // exists מחזירה אם המסמך קיים בלי לשלוף את כל תוכנו.
        const targetExists = await identity.targetModel.exists({ _id: reference })
        // שומר מזהי יעד חסרים כדי להחזיר שגיאה מסבירה לפני כתיבת הקשר.
        if (!targetExists) missingReferences.push(String(reference))
    }
    // לא מאפשר להוסיף קשרים המצביעים למסמכים שלא נוצרו בהצלחה.
    if (missingReferences.length > 0) {
        throw new Error(`חסרות רשומות יעד עבור ${description}: ${missingReferences.join(", ")}`)
    }

    // $addToSet עם $each מוסיף רק הפניות חדשות ומשאיר הפניות ידניות קיימות ללא שינוי.
    await model.updateOne(
        { _id: id, [identity.field]: identity.value },
        { $addToSet: { [field]: { $each: references } } },
        { runValidators: true }
    )
}

// מאמת שכל האירועים ורשומות ההשתתפות מחוברים בשני הכיוונים לפני דיווח הצלחה.
const verifySeedRelationships = async (plan) => {
    // בודק שילד והורה קיימים ושמערך ההורה מכיל את מזהה הילד.
    for (const child of plan.children) {
        // טוען את ההורה עם רשימת הילדים בלבד לצורך בדיקת הקשר.
        const parent = await Parent.findById(child.parent).select("children").lean()
        // שגיאה ברורה מונעת דיווח הצלחה אם אחד הצדדים חסר.
        if (!parent || !containsAllReferences(parent.children, [child._id])) {
            throw new Error(`הקשר בין הילד ${child.id} להורה שלו אינו תקין`)
        }
    }

    // בודק שכל מסמך הרשמת ילד מפנה לילד ולאירוע קיימים ומופיע במערך האירוע.
    for (const registration of plan.childEvents) {
        // טוען את האירוע כדי לבדוק שמזהה ההרשמה נכלל ברשימת הילדים שלו.
        const event = await Event.findById(registration.event).select("Children").lean()
        // מאמת גם את מסמך הילד וגם את ההפניה מהאירוע לרשומת ההשתתפות.
        const childExists = await Child.exists({ _id: registration.child })
        if (!childExists || !event || !containsAllReferences(event.Children, [registration._id])) {
            throw new Error(`הקשר של הרשמת ילד ${registration._id} אינו תקין`)
        }
    }

    // בודק את הקשרים בין הרשמת מתנדבת, מתנדבת כללית ואירוע.
    for (const registration of plan.volunteerEvents) {
        // טוען את האירוע כדי לוודא שהוא מפנה למסמך ההרשמה של המתנדבת.
        const event = await Event.findById(registration.event).select("Volunteers").lean()
        // מאמת שקיים חשבון מתנדבת ומסמך הרשמה באירוע.
        const volunteerExists = await Volunteer.exists({ _id: registration.volunteer })
        if (!volunteerExists || !event || !containsAllReferences(event.Volunteers, [registration._id])) {
            throw new Error(`הקשר של הרשמת מתנדבת ${registration._id} אינו תקין`)
        }
    }

    // בודק ששני צדי כל שיבוץ מפנים זה לזה ושייכים לאותו אירוע.
    for (const assignment of plan.assignments) {
        // מוצא את מסמכי הקשר לפי המזהים הקבועים שבתוכנית.
        const childRegistration = await ChildEvent.findById(assignment.childRegistrationId).lean()
        const volunteerRegistration = await VolunteerEvent.findById(assignment.volunteerRegistrationId).lean()
        // שגיאה אם אחד המסמכים חסר, אם ההפניות אינן הדדיות או אם האירוע שונה.
        if (
            !childRegistration
            || !volunteerRegistration
            || String(childRegistration.volunteer) !== String(volunteerRegistration._id)
            || String(volunteerRegistration.child) !== String(childRegistration._id)
            || String(childRegistration.event) !== String(volunteerRegistration.event)
        ) {
            throw new Error(`השיבוץ בין ${assignment.childRegistrationId} ל-${assignment.volunteerRegistrationId} אינו תקין`)
        }
    }

    // בודק שכל תשלום מפנה להורה ולאירוע קיימים.
    for (const payment of plan.payments) {
        // exists מאמת כל צד של ההפניה בלי לשנות את מסמכי המשתתפים או האירוע.
        const payerExists = await Parent.exists({ _id: payment.payerId })
        const eventExists = await Event.exists({ _id: payment.event })
        // תשלום יתום נחשב כשל seed ולא הצלחה חלקית.
        if (!payerExists || !eventExists) {
            throw new Error(`הקשר של תשלום ${payment._id} אינו תקין`)
        }
    }
}

// מבצע את כל תהליך ההזנה לאחר שהשרת התחבר למסד ואתחל הרשאות.
// options מכיל את שם המסד המחובר, השם הצפוי ומחרוזת סיסמת חשבון ההדגמה.
const seedDevelopmentData = async ({ databaseName, expectedDatabaseName, password }) => {
    // דורש שם מסד צפוי, אותו שם מחובר וסיומת שמסמנת מסד פיתוח ייעודי.
    if (
        typeof expectedDatabaseName !== "string"
        || !expectedDatabaseName.endsWith("_dev")
        || databaseName !== expectedDatabaseName
    ) {
        throw new Error("ה-Seed נעצר: שם מסד MongoDB חייב להתאים בדיוק ל-DEV_DATABASE_NAME ולהסתיים ב-_dev")
    }

    // בודק סיסמה שמסוגלת לעבוד עם bcrypt ועומדת גם בכללי סיסמת עובד.
    if (
        !isValidPassword(password)
        || password.length < 8
        || !/[A-Za-zא-ת]/u.test(password)
        || !/\d/u.test(password)
    ) {
        throw new Error("ה-Seed נעצר: DEV_SEED_PASSWORD חייבת לכלול לפחות 8 תווים, אות וספרה")
    }

    // מחשב מפתח חיפוש זהה לזה של הרשאת medium, בלי לשלוף או להשוות שם גלוי או סיסמה.
    const mediumNameLookup = createHmac("sha256", getJwtSecret())
        .update("medium-")
        .digest("hex")
    // מאתר את הרשאת medium לפי מזהה החיפוש הפרטי וגם לפי רשימת הפעולות הצפויה.
    const demoPermission = await Permission.findOne({
        nameLookup: mediumNameLookup,
        validActions: ["registation", "events", "matching"]
    }).select("_id").lean()
    // עובד ההדגמה אינו מקבל הרשאת admin; בלי הרשאת medium אין ליצור חשבון חסר הרשאות.
    if (!demoPermission) {
        throw new Error("ה-Seed נעצר: לא נמצאה הרשאת medium קיימת עבור עובדת ההדגמה")
    }

    // מצפין פעם אחת את הסיסמה שתשותף בין חשבונות ההדגמה, כדי שלא לשמור סיסמה גלויה.
    const passwordHash = await hashPassword(password)
    // בונה את הרשומות אחרי קבלת Permission כדי ששדה ObjectId החובה של עובד יהיה תקין.
    const plan = createSeedPlan(passwordHash, demoPermission._id)
    // מונה כמה מסמכים חדשים נוצרו הפעם; מסמכים קיימים אינם נספרים ואינם מתעדכנים.
    const created = {
        parents: 0,
        children: 0,
        volunteers: 0,
        employees: 0,
        events: 0,
        childEvents: 0,
        volunteerEvents: 0,
        payments: 0
    }

    // יוצר תחילה הורים ללא הפניות לילדים, כדי לא לשמור קשרים למסמכים שטרם נוצרו.
    for (const document of plan.parents) {
        // מעתיק את תיאור ההורה ומתחיל רשימת ילדים ריקה עד ליצירת מסמכי הילדים.
        const parentWithoutChildren = { ...document, children: [] }
        if (await createIfMissing(Parent, parentWithoutChildren, `הורה ${document.id}`)) created.parents += 1
    }
    // יוצר ילדים אחרי ההורים, בהתאם לכיוון ההפניה Child.parent.
    for (const document of plan.children) {
        if (await createIfMissing(Child, document, `ילד ${document.id}`)) created.children += 1
    }
    // משלים את הכיוון ההפוך Parent.children לאחר שכל הילדים קיימים.
    for (const parent of plan.parents) {
        await addReferencesToSeedDocument(
            Parent,
            parent._id,
            { field: "id", value: parent.id, targetModel: Child },
            "children",
            parent.children,
            `הורה ${parent.id}`
        )
    }

    // יוצר מתנדבות ועובדת לאחר שתשתית ההורים והילדים הושלמה.
    for (const document of plan.volunteers) {
        if (await createIfMissing(Volunteer, document, `מתנדבת ${document.id}`)) created.volunteers += 1
    }
    for (const document of plan.employees) {
        if (await createIfMissing(Employee, document, `עובדת ${document.id}`)) created.employees += 1
    }

    // יוצר אירועים עם מערכי קשר ריקים, כי מסמכי ההשתתפות עדיין לא נוצרו.
    for (const document of plan.events) {
        if (await createIfMissing(Event, document, `אירוע ${document.id}`)) created.events += 1
    }
    // יוצר הרשמות ילדים רק לאחר שהילדים והאירועים קיימים.
    for (const document of plan.childEvents) {
        if (await createIfMissing(ChildEvent, document, `הרשמת ילד ${document._id}`)) created.childEvents += 1
    }
    // יוצר הרשמות מתנדבות אחרי שהמתנדבות והאירועים קיימים וגם אחרי רשומות הילדים לצורך שיבוץ הדדי.
    for (const document of plan.volunteerEvents) {
        if (await createIfMissing(VolunteerEvent, document, `הרשמת מתנדבת ${document._id}`)) created.volunteerEvents += 1
    }

    // מקשר כל אירוע למסמכי ההשתתפות הקיימים שלו, מבלי להסיר הפניות אחרות או להוסיף כפילויות.
    for (const event of plan.events) {
        // בוחר רק רשומות ילדים ששייכות לאירוע זה.
        const childRegistrationIds = plan.childEvents
            .filter(registration => String(registration.event) === String(event._id))
            .map(registration => registration._id)
        // בוחר רק רשומות מתנדבות ששייכות לאירוע זה.
        const volunteerRegistrationIds = plan.volunteerEvents
            .filter(registration => String(registration.event) === String(event._id))
            .map(registration => registration._id)
        // מאמת את המזהה העסקי של האירוע ומוסיף אליו את ההשתתפויות המתאימות.
        await addReferencesToSeedDocument(
            Event,
            event._id,
            { field: "id", value: event.id, targetModel: ChildEvent },
            "Children",
            childRegistrationIds,
            `אירוע ${event.id}`
        )
        // מאמת גם את היעדים מסוג VolunteerEvent ומוסיף את רישומי המתנדבות.
        await addReferencesToSeedDocument(
            Event,
            event._id,
            { field: "id", value: event.id, targetModel: VolunteerEvent },
            "Volunteers",
            volunteerRegistrationIds,
            `אירוע ${event.id}`
        )
    }

    // יוצר תשלומים רק אחרי שההורה והאירוע שאליהם הם מפנים קיימים.
    for (const document of plan.payments) {
        if (await createIfMissing(Payment, document, `תשלום ${document._id}`)) created.payments += 1
    }

    // בודק את כל יחסי הגומלין לפני שמחזירים הצלחה למאתחל השרת.
    await verifySeedRelationships(plan)
    // מחזיר מונה יצירות מפורט ללוג האתחול; אין בו סיסמאות או מידע סודי.
    return created
}

// מייצא פונקציית ההפעלה ותוכנית הנתונים כדי לאפשר בדיקות ולידציה ללא חיבור למסד.
module.exports = { seedDevelopmentData, createSeedPlan, IDS }