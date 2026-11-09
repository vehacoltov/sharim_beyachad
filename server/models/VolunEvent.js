const mongoose = require('mongoose')
// מסמך קשר (join/association document) בין מתנדבת לאירוע, עם מקום לשדות
// נוספים של ההתאמה: ילד מועדף והערות. Event.Volunteers מחזיק references למסמכים אלה.
const volunteerInEventSchema = mongoose.Schema({
    child:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'ChildInEvent'
    },
    volunteer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Volunteer'
    },
    event: {
        // קישור ישיר תומך בחיפוש ובאינדקס לפי אירוע ומתנדבת בלי לסרוק את Event.Volunteers.
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },
    notes:{
        type:String
    },
    favouredChild: {
        // העדפת המתנדבת היא טקסט חופשי, לא קשר ל-Child, ולכן השדה אינו חובה.
        type: String
    },
}, {
    timestamps: true
})

// אוכף ברמת MongoDB לכל היותר רישום אחד לכל זוג אירוע-מתנדבת, גם אם שתי
// בקשות מגיעות במקביל והבדיקה המקדימה של שתיהן לא מצאה רישום.
// האינדקס החלקי מתעלם ממסמכים ישנים/לא שלמים שחסרים אחד מהמזהים, אך כל
// מסמך הרשמה חדש שמכיל event ו-volunteer כפוף לייחודיות הזו.
volunteerInEventSchema.index(
    { event: 1, volunteer: 1 },
    {
        unique: true,
        partialFilterExpression: {
            event: { $type: 'objectId' },
            volunteer: { $type: 'objectId' }
        }
    }
)

module.exports = mongoose.model('VolunteerInEvent', volunteerInEventSchema)