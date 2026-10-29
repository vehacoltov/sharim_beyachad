/*
 * express.static מפרסם את תיקיית uploads לפי relative URL השמור ב-MongoDB.
 * הנתיב אינו מכיל absolute filesystem path כדי לשמור הפרדת שכבות ושימוש עתידי ב-CDN.
 */
require("dotenv").config()
const mongoose = require("mongoose")
const connectDB=require("./config/dbConn")
const express = require("express")
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
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
    } catch (error) {
        // כשל ב-seed הוא כשל אתחול: יציאה מונעת מצב שבו חלק מהמערכת זמין
        // וחלק מתהליכי ההרשאה אינם יכולים לפעול כראוי.
        console.error("Failed to ensure initial admin permission:", error)
        process.exit(1)
    }
})
mongoose.connection.on('error', err => {
    console.log(err)
})
