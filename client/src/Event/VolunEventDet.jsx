/**
 * מציג כרטיס פרטים מצומצם למתנדבת שנבחרה מתוך רשימת Matching.
 *
 * @param {Object} props - המתנדבת, מיקום הכרטיס ו-callback לסגירתו.
 * פרטי קשר, מזהה אישי וסיסמה אינם מוצגים; מידע זה אינו נחוץ לבחירת התאמה.
 */
function VolunEventDet({ volunteer, position, onClose }) {
    // בוחרים מידע תפקידי שיכול לסייע בשיבוץ ולא מידע קשר אישי.
    const details = [
        ["גיל", volunteer.age],
        ["סמינר", volunteer.seminar],
        ["מידע נוסף", volunteer.detaling],
    ]

    // מסירים פרטים ריקים כדי לשמור על כרטיס קטן וברור.
    const availableDetails = details.filter(([, value]) => (
        value !== undefined && value !== null && value !== ""
    ))

    return (
        <aside
            className="matching-details-popup"
            style={{ left: position.left, top: position.top }}
            role="dialog"
            aria-label={`פרטי ${volunteer.fullName || "המתנדבת"}`}
            dir="rtl"
        >
            <div className="matching-details-heading">
                <h3>{volunteer.fullName || "פרטי המתנדבת"}</h3>
                <button
                    className="matching-details-close"
                    type="button"
                    aria-label="סגירת פרטי המתנדבת"
                    onClick={onClose}
                >
                    ×
                </button>
            </div>
            {availableDetails.length > 0 ? (
                <dl>
                    {/* רשימה מצומצמת של תוויות וערכים זמינים בלבד. */}
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

export default VolunEventDet
