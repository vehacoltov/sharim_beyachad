/*
 * express.static מפרסם את תיקיית uploads לפי relative URL השמור ב-MongoDB.
 * הנתיב אינו מכיל absolute filesystem path כדי לשמור הפרדת שכבות ושימוש עתידי ב-CDN.
 */
require("dotenv").config()
const mongoose = require("mongoose")
const connectDB=require("./config/dbConn")
const express = require("express")
const fs = require("fs")
const path = require("path")
const cors = require("cors")
const corsOptions = require("./config/corsOptions")
const { getJwtSecret } = require("./config/jwt")
const { ensurePermissionSeeds } = require("./utils/seedAdminPermission")
const PORT = Number(process.env.PORT) || 7001
const app = express()

// בדיקת סוד JWT לפני התחברות למסד או פתיחת השרת, כדי לא לפעול עם תצורת חתימה חסרה.
getJwtSecret()

connectDB()
//middlewares
app.use(express.json())
app.use(cors(corsOptions))
app.use("/uploads", express.static(path.join(__dirname, "uploads")))



app.use("/event", require("./routes/eventRoute"))
app.use("/payment", require("./routes/paymentRoute"))
app.use("/auth", require("./routes/authRoute"))
app.use("/child", require("./routes/childRoute"))
app.use("/child-event", require("./routes/childEventRoute"))
app.use("/employee", require("./routes/employeeRoute"))
app.use("/parent", require("./routes/parentRoute"))
app.use("/permission", require("./routes/permissionRoute"))
app.use("/volunteer", require("./routes/volunRoute"))
app.use("/volunteer-event", require("./routes/volunEventRoute"))

//routes
app.get("/", (req, res) => {
    res.send("this is the home page")
})



mongoose.connection.once('open', async () => {
    console.log('Connected to MongoDB')
    try {
        // משלימים את הרשאת admin לאחר שהמסד זמין ולפני קבלת בקשות.
        // אם ה-seed נכשל, לא פותחים שרת שחסר בו חשבון האתחול הנדרש.
        await ensurePermissionSeeds()

        // הפעלת נתוני ההדגמה אפשרית רק כשהמשתמש ביקש זאת במפורש ובמצב development.
        // הטעינה המותנית מאפשרת להסיר את קובץ ה-seed בלי לפגוע באתחול הרגיל.
        if (process.env.SEED_DEV_DATA === "true") {
            if (process.env.NODE_ENV === "development") {
                // בדיקת קיום מאפשרת למחוק את קובץ ה-seed בלי להפוך אותו לתלות חובה של השרת.
                const seedFilePath = path.join(__dirname, "dev", "seedDevelopmentData.js")
                if (fs.existsSync(seedFilePath)) {
                    // require מתבצע רק עבור מצב פיתוח מפורש ורק לאחר פתיחת חיבור MongoDB.
                    const { seedDevelopmentData } = require(seedFilePath)
                    // העברת שם המסד המחובר והשם המאושר מאפשרת ל-seed לוודא התאמה וסיומת _dev.
                    console.log(mongoose.connection.name);
                    
                    const created = await seedDevelopmentData({
                        databaseName: mongoose.connection.name,
                        expectedDatabaseName: process.env.DEV_DATABASE_NAME,
                        password: process.env.DEV_SEED_PASSWORD
                    })
                    // דיווח הצלחה מופיע רק לאחר שכל הרשומות והקשרים נוצרו ונבדקו.
                    console.log("Development seed completed:", created)
                } else {
                    // ממשיכים בהפעלת ה-API אם מנגנון ההדגמה הוסר או הקובץ אינו זמין.
                    console.warn("Development seed file is missing; starting the server without demo data")
                }
            } else {
                // Production וכל מצב אחר אינם טוענים את קובץ ה-seed ואינם נוגעים בנתונים.
                console.warn("Development seed was requested but ignored because NODE_ENV is not development")
            }
        }

        app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
    } catch (error) {
        // כשל ב-seed הוא כשל אתחול: יציאה מונעת מצב שבו חלק מהמערכת זמין
        // וחלק מתהליכי ההרשאה אינם יכולים לפעול כראוי.
        console.error("Failed to initialize the server:", error)
        process.exit(1)
    }
})
mongoose.connection.on('error', err => {
    console.log(err)
})
