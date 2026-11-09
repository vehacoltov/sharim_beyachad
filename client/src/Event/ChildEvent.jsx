/**
 * מציגה ילד אחד ומעבירה בחירה ופתיחת פרטים אל Matching, שמחזיק את ה-state המשותף.
 * @param {Object} props - פרטי הילד, מצב בחירתו וה-callbacks שמספק ההורה.
 */
function ChildEvent({ child, selected, assignedTo, disabled, onSelect, onOpenDetails }) {
    // כפתורי הפעולה משתמשים באירוע כדי למסור ל-Matching את אלמנט העוגן למיקום הפרטים.
    const handleDetailsClick = (event) => {
        // השורה כולה משמשת עוגן, כך שכרטיס הפרטים יופיע מחוץ לרשימה ככל שהחלון מאפשר.
        const row = event.currentTarget.closest(".matching-participant")
        onOpenDetails(child, row || event.currentTarget)
    }

    // שם ילד מקושר מוצג במקום פעולה נוספת, כדי לא לאפשר דריסת שיבוץ קיים.
    const assignmentLabel = assignedTo
        ? `משובץ עם ${assignedTo}`
        : child.assignedRegistrationId
            ? "קיים שיבוץ; שינויו אינו זמין"
            : ""

    return (
        <li className={`matching-participant ${selected ? "is-selected" : ""}`}>
            <div className="matching-participant-main">
                <span className="matching-participant-name">
                    {child.fullName || "שם הילד אינו זמין"}
                </span>
                {assignmentLabel && <small className="matching-assignment-label">{assignmentLabel}</small>}
            </div>
            <div className="matching-participant-actions">
                <button
                    className="matching-icon-button matching-assign-button"
                    type="button"
                    aria-label={`בחירת ${child.fullName || "הילד"} לשיבוץ`}
                    title={assignmentLabel || "בחירת הילד לשיבוץ"}
                    disabled={disabled || Boolean(child.assignedRegistrationId)}
                    onClick={() => onSelect(child)}
                >
                    <span aria-hidden="true">⇄</span>
                </button>
                <button
                    className="matching-icon-button matching-details-button"
                    type="button"
                    aria-label={`פרטי ${child.fullName || "הילד"}`}
                    title="פרטי הילד"
                    onClick={handleDetailsClick}
                >
                    <span aria-hidden="true">⋯</span>
                </button>
            </div>
        </li>
    )
}

export default ChildEvent