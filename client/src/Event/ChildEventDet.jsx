/**
 * מציג כרטיס פרטים מצומצם לילד שנבחר מתוך רשימת Matching.
 *
 * @param {Object} props - הילד, מיקום הכרטיס ו-callback לסגירתו.
 * מוצגים רק פרטים שהשרת כבר התיר לעובד בעל הרשאת matching לקרוא.
 */
function ChildEventDet({ child, position, onClose }) {
    // מרכזים את השדות הרלוונטיים לפרטי התאמה; לא מציגים מזהה או פרטי קשר של המשפחה.
    const details = [
        ["גיל", child.age],
        ["מצב", child.status],
        ["קטגוריות", Array.isArray(child.category) ? child.category.join(", ") : child.category],
        ["רגישויות", child.sensitivity],
        ["אפילפסיה", child.epilepsy],
        ["תרופות", child.medicines],
        ["מידע נוסף", child.detailing],
        ["הערות", child.notes],
    ]

    // מסירים שדות ריקים כדי שהכרטיס יהיה קצר ולא יציג תוויות ללא ערך.
    const availableDetails = details.filter(([, value]) => (
        value !== undefined && value !== null && value !== ""
    ))

    return (
        <aside
            className="matching-details-popup"
            style={{ left: position.left, top: position.top }}
            role="dialog"
            aria-label={`פרטי ${child.fullName || "הילד"}`}
            dir="rtl"
        >
            <div className="matching-details-heading">
                <h3>{child.fullName || "פרטי הילד"}</h3>
                <button
                    className="matching-details-close"
                    type="button"
                    aria-label="סגירת פרטי הילד"
                    onClick={onClose}
                >
                    ×
                </button>
            </div>
            {availableDetails.length > 0 ? (
                <dl>
                    {/* תווית וערך נשארים צמודים כדי לאפשר סריקה מהירה של פרטי הילד. */}
                    {availableDetails.map(([label, value]) => (
                        <div className="matching-detail-row" key={label}>
                            <dt>{label}</dt>
                            <dd>{String(value)}</dd>
                        </div>
                    ))}
                </dl>
            ) : <p>אין פרטים נוספים להצגה.</p>}
        </aside>
    )
}

export default ChildEventDet
