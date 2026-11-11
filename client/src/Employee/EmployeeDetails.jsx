/**
 * מציגה רשימת עובדים עם שמם ומספר הטלפון שלהם, אם הוא קיים.
 *
 * @param {Object} props - מאפייני הקומפוננטה.
 * @param {Array<Object>} props.employees - העובדים להצגה; כל עובד כולל _id,
 * fullName, ומספר phone אופציונלי.
 * @returns {JSX.Element} רשימת פריטי עובד בתוך רכיב div.
 */
const EmployeeDetails = ({ employees }) => {
    return (
        <div>
            {/* יוצרים פריט רשימה נפרד לכל עובד ומשתמשים במזהה שלו כמפתח React. */}
            {employees.map((employee) => (
                <li key={employee._id}>
                    {/* מציגים את שם העובד; מספר הטלפון מתווסף רק כאשר הוגדר. */}
                    {employee.fullName}
                    {employee.phone && ` — ${employee.phone}`}
                </li>
            ))}    </div>
    );
};

export default EmployeeDetails