const createModelController = require("./modelControllerFactory")
const VolunteerEvent = require("../models/VolunEvent")

// מגדיר CRUD עבור הקישור בין מתנדב לילד באירוע, כולל הערות והעדפת ילד.
const controller = createModelController({
    model: VolunteerEvent,
    editableFields: ["child", "volunteer", "notes", "favouredChild"]
})

// שמירת פונקציית היצירה המקורית כדי לאפשר יצירת השתתפות ללא קשר שיבוץ.
const createVolunteerEvent = controller.create

// יצירת השתתפות אינה רשאית ליצור קשר ילד חד-צדדי; קשרי התאמה נשמרים בטרנזקציה.
controller.create = async (req, res) => {
    // נוכחות child בבקשה מצביעה על ניסיון לכתוב צד אחד של השיבוץ מחוץ ל-Endpoint הייעודי.
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "child")) {
        return res.status(409).json({
            message: "יש ליצור שיבוץ דרך פעולת השיבוץ האטומית"
        })
    }

    // בקשות השתתפות ללא קשר ילד ממשיכות להשתמש בוולידציה ובשמירה הגנריות.
    return createVolunteerEvent(req, res)
}

// שומרים את עדכון ה-CRUD הקיים כדי שעדכון הערות והעדפות יישאר ללא שינוי.
const updateVolunteerEvent = controller.update

// חוסמים שינוי ישיר של הקישור לילד, כדי שלא לעקוף את השיבוץ ההדדי והאטומי.
controller.update = async (req, res) => {
    // שדה child מייצג את צד המתנדבת בשיבוץ ולכן אינו מתעדכן בנפרד.
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "child")) {
        return res.status(409).json({
            message: "יש לעדכן את שיבוץ המתנדבת דרך פעולת השיבוץ האטומית"
        })
    }

    // כל שדה אחר ממשיך לעבור דרך בדיקות העדכון הגנריות.
    return updateVolunteerEvent(req, res)
}

module.exports = controller