/**
 * מציגה חלונית משותפת לאישור ביטול שיבוץ בין ילד למתנדבת.
 *
 * @param {Object} props - שמות הזוג, מצב השליחה, שגיאה ופעולות החלונית.
 * @param {string} props.childName - שם הילד שהשיבוץ שלו יבוטל.
 * @param {string} props.volunteerName - שם המתנדבת שהשיבוץ שלה יבוטל.
 * @param {boolean} props.isSaving - האם בקשת הביטול מתבצעת כרגע.
 * @param {string} props.error - הודעת שגיאה להצגה, או מחרוזת ריקה.
 * @param {Function} props.onCancel - פעולה לסגירה ללא שינוי בנתונים.
 * @param {Function} props.onConfirm - פעולה לאישור ושליחת הביטול.
 * @returns {JSX.Element} תוכן חלונית האישור.
 */
function CancelAssignmentModal({
    childName,
    volunteerName,
    isSaving,
    error,
    onCancel,
    onConfirm,
}) {
    return (
        <div className="dialog-backdrop" role="presentation">
            <section
                className="dialog-card matching-confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-assignment-heading"
                dir="rtl"
            >
                <h2 id="cancel-assignment-heading">אישור ביטול שיבוץ</h2>
                <p><strong>הילד:</strong> {childName}</p>
                <p><strong>המתנדבת:</strong> {volunteerName}</p>
                <p>
                    האם את בטוחה שברצונך לבטל את השיבוץ בין {childName} לבין {volunteerName}?
                </p>
                {error && <p className="form-message error-message" role="alert">{error}</p>}
                <div className="matching-confirm-actions">
                    <button
                        className="secondary-button"
                        type="button"
                        disabled={isSaving}
                        onClick={onCancel}
                    >
                        חזרה
                    </button>
                    <button
                        className="primary-button"
                        type="button"
                        disabled={isSaving}
                        onClick={onConfirm}
                    >
                        {isSaving ? "מבטלת..." : "אישור ביטול שיבוץ"}
                    </button>
                </div>
            </section>
        </div>
    )
}

export default CancelAssignmentModal
