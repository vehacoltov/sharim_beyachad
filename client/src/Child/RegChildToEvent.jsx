import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import UpdateChild from "../Parent/UpdateChild"
import FormChildReg from "./FormChildReg"

const RegChildToEvent = ({
    event,
    childrenForRegistration,
    registrationStep = "details",
    onCancel,
    onChildUpdated,
    onRegistrationSuccess,
}) => {
    const [child, setChild] = useState(childrenForRegistration[0] ?? null)
    const location = useLocation()
    const navigate = useNavigate()
    const [detailsIsUpdated, setDetailsIsUpdated] = useState(
        () => Boolean(location.state?.registrationDetailsConfirmed)
    )
    // ה-URL הוא מקור האמת למזהי האירוע/ילד ולשלב edit. location.state רק
    // מציין שבניווט הנוכחי ההורה כבר אישר את הפרטים; הוא אינו נתון קבוע בשרת.
    const registrationPath = `/personal/events/${event._id}/register/${child?._id}`

    const handleSuccess = (updatedChild) => {
        onChildUpdated?.(updatedChild)
        setChild(updatedChild)
        setDetailsIsUpdated(true)
        // replace מונע מחזרה בדפדפן להציג שוב את טופס עדכון הפרטים שכבר אושר.
        navigate(registrationPath, {
            replace: true,
            state: { registrationDetailsConfirmed: true },
        })
    }

    return <>
        {!detailsIsUpdated && childrenForRegistration.length > 1 &&
            <>
                <h4>בחר ילד להירשם לאירוע</h4>
                <select
                    id="child-selection"
                    value={child?._id ?? ""}
                    onChange={(event) => setChild(childrenForRegistration.find((c) => c._id === event.target.value) ?? null)}
                >
                    {/* <option value="" disabled>בחרו ילד</option> */}
                    {childrenForRegistration.map((child) => (
                        <option key={child._id} value={child._id}>
                            {child.fullName}
                        </option>
                    ))}
                </select>
            </>
        }

        {detailsIsUpdated &&
            <FormChildReg
                child={child}
                event={event}
                onSuccess={() => {
                    onRegistrationSuccess?.(child.fullName, event.name)
                    onCancel()
                }}
            />
        }

        {child && !detailsIsUpdated && registrationStep !== "edit" &&
            <UpdateChild
                key={child._id}
                child={child}
                onCancel={onCancel}
                onSuccess={handleSuccess}
                read={true}
                setToEdit={() => navigate(`${registrationPath}/edit`)}
            />
        }

        {child && !detailsIsUpdated && registrationStep === "edit" &&
          <UpdateChild
                key={child._id}
                child={child}
                onCancel={() => navigate(registrationPath, { replace: true })}
                onSuccess={handleSuccess}
            />
        }
    </>
}

export default RegChildToEvent