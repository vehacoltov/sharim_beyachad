import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { api, getErrorMessage } from "../api"
import { saveMatchingAssignment } from "./matchingService"
import ChildEvent from "./ChildEvent"
import ChildEventDet from "./ChildEventDet"
import CancelAssignmentModal from "./CancelAssignmentModal"
import { cancelMatchingAssignment } from "./matchingService"
import VolunEvent from "./VolunEvent"
import VolunEventDet from "./VolunEventDet"

// ממיר הפניה ממסד הנתונים למזהה אחיד; היא עשויה להגיע כמחרוזת או כמסמך מאוכלס.
const getReferenceId = (reference) =>
    typeof reference === "string" ? reference : reference?._id

// רשומת האירוע מחזיקה מזהה מסמך השתתפות, ומסמך ההשתתפות מחזיק מזהה משתתף.
// הפונקציה טוענת גם את מזהה הרשומה וגם את הקישור הקיים, הדרושים לממשק ולשמירה.
const loadParticipants = async (
    registrationReferences,
    registrationEndpoint,
    participantEndpoint,
    participantField,
    counterpartField,
) => {
    // Promise.all מחזיר את כל המשתתפים רק לאחר שכל שליפות ההשתתפות והפרטים הסתיימו.
    return Promise.all(
        // כל הפניה באירוע נשלפת, ואז מזהה המשתתף שלה משמש לשליפת הפרטים הגלויים.
        registrationReferences.map(async (registrationReference) => {
            // ההפניה יכולה להיות מזהה גולמי או מסמך מאוכלס; בשני המקרים מפיקים מזהה.
            const registrationId = getReferenceId(registrationReference)
            // הפניה חסרה אינה גורמת לבקשת API שגויה ולכן תוסר מהתוצאה בהמשך.
            if (!registrationId) return null

            // מבקשים את מסמך ההשתתפות, שבו נשמר קשר השיבוץ ברמת האירוע.
            const registrationResponse = await api.get(`${registrationEndpoint}/${registrationId}`)
            // מחלצים את מזהה המשתתף ואת מזהה המשתתף מהצד השני של השיבוץ.
            const participantId = getReferenceId(registrationResponse.data[participantField])
            const counterpartId = getReferenceId(registrationResponse.data[counterpartField])
            // רשומת השתתפות ללא המשתתף המקושר אינה יכולה להופיע כרשומה תקינה.
            if (!participantId) return null

            // פרטי המשתתף נשלפים מהנתיב הקיים; השדות הפרטיים נשארים באחריות השרת.
            const participantResponse = await api.get(`${participantEndpoint}/${participantId}`)
            // מוסיפים לפרטי המשתתף מזהי השתתפות בלבד, הדרושים לשיבוץ בתוך האירוע.
            return {
                ...participantResponse.data,
                registrationId,
                assignedRegistrationId: counterpartId,
            }
        }),
    ).then((participants) => {
        // מסירים הפניות חסרות, כך שרינדור הרשימות לא יקבל ערכי null.
        const validParticipants = participants.filter(Boolean)
        // מפיקים מפה לפי מזהה רישום כדי שהפניה כפולה באירוע לא תציג משתתף פעמיים.
        const uniqueParticipants = new Map(
            validParticipants.map((participant) => [participant.registrationId, participant]),
        )
        // מחזירים את הרשומות הייחודיות בסדר שבו הופיעו לראשונה בנתוני האירוע.
        return Array.from(uniqueParticipants.values())
    })
}

// מציג את המשתתפים ומרכז את הבחירה, אישור השיבוץ, השמירה וחלוניות הפרטים.
function Matching() {
    // מזהה האירוע מגיע מפרמטר הנתיב שהוגדר ב-React Router.
    const { eventId } = useParams()

    // שומרת את התוצאה האחרונה יחד עם מזהה האירוע כדי לא להציג נתונים מאירוע קודם.
    const [result, setResult] = useState(null)
    // שומר את הילד שנבחר; null מציין שעדיין לא נבחר ילד.
    const [selectedChild, setSelectedChild] = useState(null)
    // שומרת את המתנדבת שנבחרה; null מציין שעדיין לא נבחרה מתנדבת.
    const [selectedVolunteer, setSelectedVolunteer] = useState(null)
    // קובעת אם חלונית האישור פתוחה; הבחירות נשמרות גם כשהחלונית נסגרת בביטול.
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    // שומרת את הלשונית הפעילה: רשימות פנויות או זוגות שכבר שובצו.
    const [activeTab, setActiveTab] = useState("available")
    // שומרת זוג שאושר לפתיחת חלונית ביטול, כולל האירוע שאליו הוא שייך.
    const [pendingCancellation, setPendingCancellation] = useState(null)
    // מסמנת שהשרת עדיין מבצע שיבוץ או ביטול, כדי למנוע בקשות כפולות.
    const [isSaving, setIsSaving] = useState(false)
    // נועלת מיד את פעולות השיבוץ והביטול, לפני ש-React מציג כפתורים מושבתים.
    const saveInProgress = useRef(false)
    // שומרת הודעת כשל מהשרת להצגה בחלונית הפעולה המתאימה.
    const [saveError, setSaveError] = useState("")
    // שומרת את כרטיס הפרטים הפתוח ואת מיקומו בתוך חלון הדפדפן.
    const [openDetails, setOpenDetails] = useState(null)

    // טוען מחדש אירוע ורשימות כאשר מזהה האירוע בנתיב משתנה.
    useEffect(() => {
        // דגל זה מבטל עדכון state אם המשתמש יצא מהמסך בזמן שהבקשות עדיין פעילות.
        let isCurrentRequest = true

        // קודם טוענים את האירוע, ואז את שתי הרשימות במקביל כדי להימנע מהמתנה מיותרת ביניהן.
        const loadEventMatchingLists = async () => {
            try {
                // בקשת האירוע מחזירה מזהי ChildEvent ו-VolunteerEvent הרשומים אליו.
                const eventResponse = await api.get(`/event/${eventId}`)
                const currentEvent = eventResponse.data
                // שליפות שתי הקבוצות מתחילות יחד, וכל אחת משמרת את קישור השיבוץ שלה.
                const [eventChildren, eventVolunteers] = await Promise.all([
                    loadParticipants(currentEvent.Children || [], "/child-event", "/child", "child", "volunteer"),
                    loadParticipants(currentEvent.Volunteers || [], "/volunteer-event", "/volunteer", "volunteer", "child"),
                ])

                // מתעלמים מתשובה מאוחרת של בקשה שכבר אינה שייכת למסך הנוכחי.
                if (!isCurrentRequest) return
                // שומרים את האירוע ואת שתי הרשימות יחד כדי להציג נתונים מאותה טעינה.
                setResult({
                    eventId,
                    event: currentEvent,
                    children: eventChildren,
                    volunteers: eventVolunteers,
                    error: "",
                })
            } catch (requestError) {
                // שגיאה באחת מהשליפות מוצגת במקום רשימות חלקיות, כדי שלא להציג תמונת מצב מטעה.
                if (isCurrentRequest) {
                    // מאפסים את הרשימות בתוצאה השגויה כדי לא לערבב נתונים קודמים עם הודעת השגיאה.
                    setResult({
                        eventId,
                        event: null,
                        children: [],
                        volunteers: [],
                        error: getErrorMessage(requestError),
                    })
                }
            }
        }

        // רק נתיב הכולל מזהה אירוע מפעיל את בקשות הרשת.
        if (eventId) {
            void loadEventMatchingLists()
        }

        // מונע מתשובה מאוחרת של אירוע קודם לדרוס מצב לאחר מעבר לאירוע אחר או יציאה מהמסך.
        return () => {
            isCurrentRequest = false
        }
    }, [eventId])

    // מאזין לגלילת כל חלון או אזור גלילה, כדי לסגור פרטים שאינם מיושרים יותר לשורה.
    useEffect(() => {
        // בלי כרטיס פרטים פתוח אין צורך להשאיר מאזיני גלילה או שינוי גודל.
        if (!openDetails) return undefined

        // סוגר את הכרטיס בכל גלילה, לרבות גלילה בתוך אלמנט פנימי בדף.
        const closeDetails = () => setOpenDetails(null)
        window.addEventListener("scroll", closeDetails, true)
        window.addEventListener("resize", closeDetails)

        // מסיר מאזינים כאשר הכרטיס נסגר או מוחלף, כדי למנוע מאזינים כפולים.
        return () => {
            window.removeEventListener("scroll", closeDetails, true)
            window.removeEventListener("resize", closeDetails)
        }
    }, [openDetails])

    // תוצאה ששייכת למזהה אחר אינה מוצגת בזמן טעינת אירוע חדש; כך אין צורך לאפס state באפקט.
    const currentResult = result?.eventId === eventId ? result : null
    // נגזר מצב הטעינה מכך שעדיין אין תוצאה למזהה הנוכחי, בלי עדכון state נוסף באפקט.
    const loading = Boolean(eventId) && !currentResult
    // אירוע חסר הוא שגיאת נתיב; אחרת מוצגת שגיאה ששמרה בקשת הטעינה.
    const error = eventId ? currentResult?.error : "מזהה האירוע חסר."
    // שולפים את הערכים מהתוצאה הנוכחית או משתמשים בערכי ברירת מחדל בטוחים.
    const event = currentResult?.event
    const children = currentResult?.children || []
    const volunteers = currentResult?.volunteers || []
    // בחירה נשמרת רק עבור האירוע שבו נעשתה, כדי שמעבר לנתיב אחר לא ימחזר מזהים ישנים.
    const activeSelectedChild = selectedChild?.selectionEventId === eventId ? selectedChild : null
    const activeSelectedVolunteer = selectedVolunteer?.selectionEventId === eventId
        ? selectedVolunteer
        : null
    // ביטול ממתין מוצג רק כל עוד הוא שייך לאירוע הנוכחי בנתיב.
    const activePendingCancellation = pendingCancellation?.selectionEventId === eventId
        ? pendingCancellation
        : null
    // מציגים ברשימה הראשונה רק ילדים שאין להם קישור שיבוץ שמור.
    const availableChildren = children.filter((child) => !child.assignedRegistrationId)
    // מציגים ברשימה הראשונה רק מתנדבות שאין להן קישור שיבוץ שמור.
    const availableVolunteers = volunteers.filter((volunteer) => !volunteer.assignedRegistrationId)
    // בונים זוגות רק כאשר הקישורים בשני מסמכי ההשתתפות תואמים זה לזה.
    const assignedPairs = children.flatMap((child) => {
        // ללא מזהה מתנדבת ברשומת הילד אין זוג שניתן להציג כרשומה תקינה.
        if (!child.assignedRegistrationId) return []

        // מאתר את רשומת המתנדבת שאליה הילד מפנה.
        const volunteer = volunteers.find((participant) => (
            participant.registrationId === child.assignedRegistrationId
        ))

        // מסתיר קשר לא הדדי כדי לא להציג זוג שונה מהנתונים שנשמרו במסד.
        if (!volunteer || volunteer.assignedRegistrationId !== child.registrationId) return []

        // מחזיר את זוג ההשתתפות לצורך הצגת שמותיו ופקדי הביטול שלו.
        return [{ child, volunteer }]
    })

    /**
     * מטפלת בבחירת ילד מתוך שורת ChildEvent.
     *
     * @param {Object} child - הילד, כולל מזהה רשומת ההשתתפות באירוע.
     * בחירה חדשה מחליפה את הילד הקודם. אם כבר נבחרה מתנדבת, נפתחת חלונית האישור.
     */
    const handleChildSelect = (child) => {
        // שיבוץ קיים אינו ניתן להחלפה מהממשק, ולכן אין לשמור אותו כבחירה חדשה.
        if (child.assignedRegistrationId || isSaving) return
        // כל בחירת ילד חדשה מחליפה את הבחירה הקודמת ומנקה שגיאה מניסיון קודם.
        setSelectedChild({ ...child, selectionEventId: eventId })
        setSaveError("")
        // אם מתנדבת כבר נבחרה, שני הצדדים מוכנים ולכן אפשר לבקש אישור מפורש.
        if (activeSelectedVolunteer) setIsConfirmOpen(true)
    }

    /**
     * מטפלת בבחירת מתנדבת מתוך שורת VolunEvent.
     *
     * @param {Object} volunteer - המתנדבת, כולל מזהה רשומת ההשתתפות באירוע.
     * בחירה חדשה מחליפה את המתנדבת הקודמת. אם כבר נבחר ילד, נפתחת חלונית האישור.
     */
    const handleVolunteerSelect = (volunteer) => {
        // מתנדבת שכבר מקושרת לילד נשארת ללא שינוי עד לקבלת הנחיה מפורשת להחלפה.
        if (volunteer.assignedRegistrationId || isSaving) return
        // בחירה חדשה מחליפה את הבחירה הקודמת ומאפסת הודעת שגיאה קודמת.
        setSelectedVolunteer({ ...volunteer, selectionEventId: eventId })
        setSaveError("")
        // אם ילד כבר נבחר, פותחים את אותו אישור ללא תלות בסדר הבחירה.
        if (activeSelectedChild) setIsConfirmOpen(true)
    }

    /**
     * פותחת חלונית פרטים צמודה לשורה, תוך התאמת המיקום לגבולות חלון הדפדפן.
     *
     * @param {string} type - סוג החלונית, ילד או מתנדבת.
     * @param {Object} participant - נתוני המשתתף להצגה.
     * @param {HTMLElement} anchor - אלמנט השורה שממנו מחשבים את המיקום.
     */
    const showParticipantDetails = (type, participant, anchor) => {
        // getBoundingClientRect מחזיר מיקום יחסי לחלון ומתעדכן גם במסכים צרים.
        const rectangle = anchor.getBoundingClientRect()
        const popupWidth = Math.min(320, window.innerWidth - 24)
        const popupHeight = Math.min(360, window.innerHeight - 24)
        const spaceOnRight = window.innerWidth - rectangle.right
        // מעדיפים להציב מימין לשורה; כשאין מספיק מקום, מציבים משמאלה כדי למנוע חיתוך.
        const left = spaceOnRight >= popupWidth + 12
            ? rectangle.right + 8
            : Math.max(12, rectangle.left - popupWidth - 8)
        // מגבילים את הגובה העליון כך שכרטיס הפרטים יישאר בתוך חלון הדפדפן.
        const top = Math.max(12, Math.min(rectangle.top, window.innerHeight - popupHeight - 12))

        // שומרים את סוג המשתתף, הנתונים והמיקום; רכיב הפרטים המתאים יוצג לאחר מכן.
        setOpenDetails({ type, participant, position: { left, top } })
    }

    /**
     * פותחת פרטי ילד בעקבות callback שהועבר לשורת ChildEvent.
     * @param {Object} child - נתוני הילד שנלחץ.
     * @param {HTMLElement} anchor - כפתור הפרטים ששימש כנקודת ייחוס למיקום.
     */
    const handleOpenChildDetails = (child, anchor) => {
        showParticipantDetails("child", child, anchor)
    }

    /**
     * פותחת פרטי מתנדבת בעקבות callback שהועבר לשורת VolunEvent.
     * @param {Object} volunteer - נתוני המתנדבת שנלחצה.
     * @param {HTMLElement} anchor - כפתור הפרטים ששימש כנקודת ייחוס למיקום.
     */
    const handleOpenVolunteerDetails = (volunteer, anchor) => {
        showParticipantDetails("volunteer", volunteer, anchor)
    }

    /**
     * פותחת את חלונית הביטול עבור ילד או מתנדבת שנלחצו ברשימת הזוגות.
     *
     * @param {Object} participant - רשומת הילד או המתנדבת שעל הכפתור שלה נלחץ.
     * @param {string} participantType - הצד שנלחץ: "child" או "volunteer".
     * מזהה את הצד השני מתוך נתוני האירוע, מוודאת שהקישור הדדי, ואז שומרת
     * את שני המשתתפים ואת מזהה האירוע כדי להציג שמות ולשלוח את המזהים לשרת.
     */
    const handleRequestCancelAssignment = (participant, participantType) => {
        // אין לפתוח בקשת ביטול חדשה בזמן ששמירה או ביטול אחר כבר מתבצעים.
        if (saveInProgress.current || isSaving) return

        // מזהה את רשומת הילד לפי הצד שממנו המשתמש הפעיל את הביטול.
        const child = participantType === "child"
            ? participant
            : children.find((item) => item.registrationId === participant.assignedRegistrationId)
        // מזהה באותו אופן את רשומת המתנדבת המתאימה באירוע.
        const volunteer = participantType === "volunteer"
            ? participant
            : volunteers.find((item) => item.registrationId === participant.assignedRegistrationId)

        // דורש ששתי הרשומות קיימות ומצביעות זו לזו לפני פתיחת אישור הביטול.
        if (
            !child
            || !volunteer
            || child.assignedRegistrationId !== volunteer.registrationId
            || volunteer.assignedRegistrationId !== child.registrationId
        ) {
            // מציג שגיאה במקום לשלוח בקשה שעלולה לבטל זוג אחר או קשר חלקי.
            setSaveError("לא ניתן לזהות שיבוץ הדדי תקין. יש לרענן את רשימת האירוע.")
            return
        }

        // שומר את הזוג והאירוע כדי שחלונית האישור לא תסתמך על שורה שכבר השתנתה.
        setPendingCancellation({ child, volunteer, selectionEventId: eventId })
        // מסיר הודעת כשל קודמת לפני הצגת האישור החדש.
        setSaveError("")
    }

    /**
     * סוגרת את חלונית הביטול בלי לשנות את רשימות המשתתפים.
     * בזמן שליחת הבקשה החלונית נשארת פתוחה עד לקבלת תשובת השרת.
     */
    const handleCloseCancellation = () => {
        // מתעלם מסגירה בזמן שליחה, כדי לא לבלבל בין בקשה פעילה לתוצאה סופית.
        if (isSaving) return

        // מסיר את הזוג הממתין וכך חלונית הביטול אינה מוצגת עוד.
        setPendingCancellation(null)
        // מנקה את הודעת הביטול לאחר שהמשתמש בחר לחזור לרשימות.
        setSaveError("")
    }

    /**
     * שולחת לשרת בקשה לביטול השיבוץ ההדדי של הזוג שאושר.
     * הרשימות מתעדכנות רק לאחר הצלחת ה-API; בכשל הן נשארות ללא שינוי.
     */
    const handleConfirmCancellation = async () => {
        // דורש זוג ששייך לאירוע הנוכחי ומונע שליחה כפולה לפני הבקשה.
        if (!activePendingCancellation || saveInProgress.current) return

        // נועל פעולות נוספות ומציג מצב טעינה בחלונית עד לסיום בקשת הרשת.
        saveInProgress.current = true
        setIsSaving(true)
        // מנקה שגיאה קודמת כדי להציג רק את תוצאת ניסיון הביטול הנוכחי.
        setSaveError("")

        try {
            // שולח את מזהה האירוע ואת מזהי שתי רשומות ההשתתפות לשירות הקיים.
            await cancelMatchingAssignment(
                eventId,
                activePendingCancellation.child.registrationId,
                activePendingCancellation.volunteer.registrationId,
            )

            // לאחר הצלחת השרת מסיר את קישור המתנדבת מרשומת הילד בזיכרון הממשק.
            setResult((previousResult) => {
                // לא מעדכן תוצאה של אירוע קודם אם המשתמש עבר לאירוע אחר בזמן הבקשה.
                if (previousResult?.eventId !== eventId) return previousResult

                // מחזיר תוצאה מעודכנת שבה שני הצדדים פנויים, בלי לטעון מחדש את הדף.
                return {
                    ...previousResult,
                    // null מציין שאין שיבוץ, ולכן הילד יחזור לרשימת הילדים הפנויים.
                    children: previousResult.children.map((child) => (
                        child.registrationId === activePendingCancellation.child.registrationId
                            ? { ...child, assignedRegistrationId: null }
                            : child
                    )),
                    // מסיר גם את הקישור ההפוך, ולכן המתנדבת תחזור לרשימת הפנויות.
                    volunteers: previousResult.volunteers.map((volunteer) => (
                        volunteer.registrationId === activePendingCancellation.volunteer.registrationId
                            ? { ...volunteer, assignedRegistrationId: null }
                            : volunteer
                    )),
                }
            })

            // סגירת החלונית לאחר הצלחה תסיר את הזוג מרשימת המשובצים הנגזרת מהנתונים.
            setPendingCancellation(null)
            // מוודא שלא נשארת הודעת שגיאה אחרי ביטול שהסתיים בהצלחה.
            setSaveError("")
        } catch (requestError) {
            // משאיר את הזוג והנתונים ללא שינוי, ומציג את הודעת השרת בתוך החלונית.
            setSaveError(getErrorMessage(requestError))
        } finally {
            // משחרר את הנעילה ומחזיר את הכפתורים למצב פעיל גם לאחר שגיאה.
            saveInProgress.current = false
            setIsSaving(false)
        }
    }

    /**
     * שולחת לשרת את שתי רשומות ההשתתפות לשיבוץ ושומרת את התוצאה רק לאחר אישורו.
     * אין שינוי מקומי לפני הצלחת ה-API; במקרה של כשל נשמרות הבחירות ונשארת חלונית האישור.
     */
    const handleSaveAssignment = async () => {
        // בדיקת הגנה מונעת קריאה ללא זוג מלא או בזמן שמירה קודמת.
        if (!activeSelectedChild || !activeSelectedVolunteer || saveInProgress.current) return

        // מציגים מצב טעינה ומנקים הודעה ישנה לפני שליחת הבקשה.
        saveInProgress.current = true
        setIsSaving(true)
        setSaveError("")

        try {
            // שולחים רק מזהי אירוע ורשומות השתתפות; השרת מאמת הרשאה ושייכות מחדש.
            const { childRegistration, volunteerRegistration } = await saveMatchingAssignment(
                eventId,
                activeSelectedChild.registrationId,
                activeSelectedVolunteer.registrationId,
            )
            const savedVolunteerId = getReferenceId(childRegistration.volunteer)
            const savedChildId = getReferenceId(volunteerRegistration.child)

            // מעדכנים רק תוצאה של אותו אירוע, גם אם המשתמש עבר מסך בזמן שהבקשה המתינה.
            setResult((previousResult) => {
                if (previousResult?.eventId !== eventId) return previousResult

                return {
                    ...previousResult,
                    // סימון הילד מתעדכן לפי מזהה מסמך ההשתתפות שהשרת החזיר.
                    children: previousResult.children.map((child) => (
                        child.registrationId === childRegistration._id
                            ? { ...child, assignedRegistrationId: savedVolunteerId }
                            : child
                    )),
                    // סימון המתנדבת מתעדכן במקביל לפי רשומת ההשתתפות שלה.
                    volunteers: previousResult.volunteers.map((volunteer) => (
                        volunteer.registrationId === volunteerRegistration._id
                            ? { ...volunteer, assignedRegistrationId: savedChildId }
                            : volunteer
                    )),
                }
            })

            // הצלחה בלבד סוגרת את החלונית ומנקה את הבחירות; השגיאה נשארת ריקה.
            setIsConfirmOpen(false)
            setSelectedChild(null)
            setSelectedVolunteer(null)
            setSaveError("")
        } catch (requestError) {
            // מציגים את הודעת השרת ומשאירים בחירות וחלונית פתוחות לצורך תיקון או ניסיון חוזר.
            setSaveError(getErrorMessage(requestError))
        } finally {
            // משחררים את נעילת הכפתור גם אם הבקשה נכשלה.
            saveInProgress.current = false
            setIsSaving(false)
        }
    }

    return (
        <section className="matching-page" dir="rtl" aria-labelledby="matching-heading">
            <h2 id="matching-heading">ילדים ומתנדבות</h2>
            {event && <p className="matching-event-name">{event.name}</p>}
            {loading && <p role="status">טוען משתתפים...</p>}
            {error && <p className="form-message error-message" role="alert">{error}</p>}
            {saveError && !isConfirmOpen && !activePendingCancellation && (
                <p className="form-message error-message" role="alert">{saveError}</p>
            )}
            {!loading && !error && (
                <>
                    {/* מציג שתי לשוניות נגישות לבחירה בין משתתפים פנויים לזוגות משובצים. */}
                    <div className="matching-tabs" role="tablist" aria-label="תצוגת שיבוצים">
                        <button
                            id="matching-available-tab"
                            className={`matching-tab ${activeTab === "available" ? "is-active" : ""}`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "available"}
                            aria-controls="matching-available-panel"
                            onClick={() => {
                                // סוגר פרטים שצפים מעל הלשונית לפני הצגת הרשימות הפנויות.
                                setOpenDetails(null)
                                // מעביר את התצוגה ללשונית הילדים והמתנדבות הפנויות.
                                setActiveTab("available")
                            }}
                        >
                            <span className="matching-tab-icon" aria-hidden="true">⇄</span>
                            <span className="matching-tab-copy">
                                <span>ילדים ומתנדבות</span>
                                <small>שעדיין לא שובצו</small>
                            </span>
                        </button>
                        <button
                            id="matching-assigned-tab"
                            className={`matching-tab ${activeTab === "assigned" ? "is-active" : ""}`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "assigned"}
                            aria-controls="matching-assigned-panel"
                            onClick={() => {
                                // סוגר פרטים שצפים מעל הלשונית לפני הצגת הזוגות המשובצים.
                                setOpenDetails(null)
                                // מעביר את התצוגה ללשונית הזוגות הקיימים.
                                setActiveTab("assigned")
                            }}
                        >
                            <span className="matching-tab-icon" aria-hidden="true">✓</span>
                            <span className="matching-tab-copy">
                                <span>זוגות ששובצו</span>
                                <small>{assignedPairs.length} זוגות</small>
                            </span>
                        </button>
                    </div>

                    {/* מציג את שתי רשימות המשתתפים הפנויים זו לצד זו ואת תהליך השיבוץ הקיים. */}
                    {activeTab === "available" && (
                        <div
                            className="matching-tab-panel"
                            id="matching-available-panel"
                            role="tabpanel"
                            aria-labelledby="matching-available-tab"
                        >
                            <div className="matching-lists">
                                <section className="matching-list" aria-labelledby="matching-children-heading">
                                    <h3 id="matching-children-heading">ילדים ({availableChildren.length})</h3>
                                    {availableChildren.length > 0 ? (
                                        <ul>
                                            {/* כל ילד פנוי מקבל את בחירת השיבוץ ואת פתיחת הפרטים מ-Matching. */}
                                            {availableChildren.map((child) => (
                                                <ChildEvent
                                                    key={child.registrationId}
                                                    child={child}
                                                    selected={activeSelectedChild?.registrationId === child.registrationId}
                                                    disabled={isSaving}
                                                    assignedTo=""
                                                    onSelect={handleChildSelect}
                                                    onCancelAssignment={(participant) => (
                                                        handleRequestCancelAssignment(participant, "child")
                                                    )}
                                                    onOpenDetails={handleOpenChildDetails}
                                                />
                                            ))}
                                        </ul>
                                    ) : <p>אין ילדים פנויים לשיבוץ.</p>}
                                </section>
                                <section className="matching-list" aria-labelledby="matching-volunteers-heading">
                                    <h3 id="matching-volunteers-heading">מתנדבות ({availableVolunteers.length})</h3>
                                    {availableVolunteers.length > 0 ? (
                                        <ul>
                                            {/* כל מתנדבת פנויה מקבלת את הבחירה ואת פתיחת הפרטים מ-Matching. */}
                                            {availableVolunteers.map((volunteer) => (
                                                <VolunEvent
                                                    key={volunteer.registrationId}
                                                    volunteer={volunteer}
                                                    selected={activeSelectedVolunteer?.registrationId === volunteer.registrationId}
                                                    disabled={isSaving}
                                                    assignedTo=""
                                                    onSelect={handleVolunteerSelect}
                                                    onCancelAssignment={(participant) => (
                                                        handleRequestCancelAssignment(participant, "volunteer")
                                                    )}
                                                    onOpenDetails={handleOpenVolunteerDetails}
                                                />
                                            ))}
                                        </ul>
                                    ) : <p>אין מתנדבות פנויות לשיבוץ.</p>}
                                </section>
                            </div>
                        </div>
                    )}

                    {/* מציג זוגות הדדיים בלבד, כאשר כל צד שומר על כפתור הביטול והפרטים שלו. */}
                    {activeTab === "assigned" && (
                        <div
                            className="matching-tab-panel"
                            id="matching-assigned-panel"
                            role="tabpanel"
                            aria-labelledby="matching-assigned-tab"
                        >
                            {assignedPairs.length > 0 ? (
                                <ul className="matching-pairs">
                                    {assignedPairs.map(({ child, volunteer }) => (
                                        // מזהי שתי רשומות ההשתתפות יוצרים מפתח ייחודי לזוג באירוע.
                                        <li
                                            className="matching-pair"
                                            key={`${child.registrationId}-${volunteer.registrationId}`}
                                        >
                                            <ul className="matching-pair-participants">
                                                {/* שורת הילד מציגה את המתנדבת ופותחת את הביטול מאותו callback משותף. */}
                                                <ChildEvent
                                                    child={child}
                                                    selected={false}
                                                    disabled={isSaving}
                                                    assignedTo={volunteer.fullName || "המתנדבת"}
                                                    onSelect={handleChildSelect}
                                                    onCancelAssignment={(participant) => (
                                                        handleRequestCancelAssignment(participant, "child")
                                                    )}
                                                    onOpenDetails={handleOpenChildDetails}
                                                />
                                                {/* שורת המתנדבת מציגה את הילד ומפעילה את אותו מנגנון ביטול. */}
                                                <VolunEvent
                                                    volunteer={volunteer}
                                                    selected={false}
                                                    disabled={isSaving}
                                                    assignedTo={child.fullName || "הילד"}
                                                    onSelect={handleVolunteerSelect}
                                                    onCancelAssignment={(participant) => (
                                                        handleRequestCancelAssignment(participant, "volunteer")
                                                    )}
                                                    onOpenDetails={handleOpenVolunteerDetails}
                                                />
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="matching-empty-state">אין זוגות משובצים באירוע.</p>}
                        </div>
                    )}
                </>
            )}

            {/* כרטיס פרטים הוא צאצא של Matching, ולכן בחירתו אינה מנהלת state עצמאי. */}
            {openDetails?.type === "child" && (
                <ChildEventDet
                    child={openDetails.participant}
                    position={openDetails.position}
                    onClose={() => setOpenDetails(null)}
                />
            )}
            {openDetails?.type === "volunteer" && (
                <VolunEventDet
                    volunteer={openDetails.participant}
                    position={openDetails.position}
                    onClose={() => setOpenDetails(null)}
                />
            )}

            {/* חלונית השיבוץ מופיעה רק לאחר בחירת ילד ומתנדבת ודורשת אישור מפורש. */}
            {isConfirmOpen && activeSelectedChild && activeSelectedVolunteer && (
                <div className="dialog-backdrop" role="presentation">
                    <section
                        className="dialog-card matching-confirm-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="matching-confirm-heading"
                        dir="rtl"
                    >
                        <h2 id="matching-confirm-heading">אישור שיבוץ</h2>
                        <p><strong>ילד:</strong> {activeSelectedChild.fullName}</p>
                        <p><strong>מתנדבת:</strong> {activeSelectedVolunteer.fullName}</p>
                        {saveError && <p className="form-message error-message" role="alert">{saveError}</p>}
                        <div className="matching-confirm-actions">
                            <button
                                className="secondary-button"
                                type="button"
                                disabled={isSaving}
                                onClick={() => setIsConfirmOpen(false)}
                            >
                                ביטול
                            </button>
                            <button
                                className="primary-button"
                                type="button"
                                disabled={isSaving}
                                onClick={handleSaveAssignment}
                            >
                                {isSaving ? "שומר..." : "שמירה"}
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {/* חלונית הביטול מקבלת את שמות הזוג ואת פעולות האישור והחזרה מ-Matching. */}
            {activePendingCancellation && (
                <CancelAssignmentModal
                    childName={activePendingCancellation.child.fullName || "שם הילד אינו זמין"}
                    volunteerName={activePendingCancellation.volunteer.fullName || "שם המתנדבת אינו זמין"}
                    isSaving={isSaving}
                    error={saveError}
                    onCancel={handleCloseCancellation}
                    onConfirm={handleConfirmCancellation}
                />
            )}
        </section>
    )
}

export default Matching