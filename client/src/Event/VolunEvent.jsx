/**
 * מציגה מתנדבת אחת ומעבירה בחירה ופתיחת פרטים אל Matching, שמחזיק את ה-state המשותף.
 * @param {Object} props - פרטי המתנדבת, מצב בחירתה וה-callbacks שמספק ההורה.
 */
function VolunEvent({
    volunteer,
    selected,
    assignedTo,
    disabled,
    onSelect,
    onCancelAssignment,
    onOpenDetails,
}) {
    // מעביר ל-Matching גם את אלמנט הכפתור, כדי למקם את כרטיס הפרטים ליד השורה.
    const handleDetailsClick = (event) => {
        // השורה כולה משמשת עוגן למיקום כרטיס הפרטים ליד רשימת המתנדבות.
        const row = event.currentTarget.closest(".matching-participant")
        onOpenDetails(volunteer, row || event.currentTarget)
    }

    // שם הילד המשובץ מוצג לצד המתנדבת, וכפתור הפעולה מאפשר לבטל את הקישור.
    const assignmentLabel = assignedTo
        ? `משובצת עם ${assignedTo}`
        : volunteer.assignedRegistrationId
            ? "קיים שיבוץ; שינויו אינו זמין"
            : ""

    return (
        <li className={`matching-participant ${selected ? "is-selected" : ""}`}>
            <div className="matching-participant-main">
                <span className="matching-participant-name">
                    {volunteer.fullName || "שם המתנדבת אינו זמין"}
                </span>
                {assignmentLabel && <small className="matching-assignment-label">{assignmentLabel}</small>}
            </div>
            <div className="matching-participant-actions">
                {assignedTo ? (
                    <button
                        className="matching-icon-button matching-cancel-button"
                        type="button"
                        aria-label={`ביטול השיבוץ של ${volunteer.fullName || "המתנדבת"}`}
                        title="ביטול שיבוץ"
                        disabled={disabled}
                        onClick={() => onCancelAssignment(volunteer)}
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                ) : (
                    <button
                        className="matching-icon-button matching-assign-button"
                        type="button"
                        aria-label={`בחירת ${volunteer.fullName || "המתנדבת"} לשיבוץ`}
                        title={assignmentLabel || "בחירת המתנדבת לשיבוץ"}
                        disabled={disabled || Boolean(volunteer.assignedRegistrationId)}
                        onClick={() => onSelect(volunteer)}
                    >
                        <span aria-hidden="true">⇄</span>
                    </button>
                )}
                <button
                    className="matching-icon-button matching-details-button"
                    type="button"
                    aria-label={`פרטי ${volunteer.fullName || "המתנדבת"}`}
                    title="פרטי המתנדבת"
                    onClick={handleDetailsClick}
                >
                    <span aria-hidden="true">⋯</span>
                </button>
            </div>
        </li>
    )
}

export default VolunEvent