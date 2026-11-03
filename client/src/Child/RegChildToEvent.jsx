import { useState } from "react"
import UpdateChild from "../Parent/UpdateChild"
import FormChildReg from "./FormChildReg"

const RegChildToEvent = ({
    event,
    childrenForRegistration,
    onCancel,
    onChildUpdated,
    onRegistrationSuccess,
}) => {
    const [child, setChild] = useState(childrenForRegistration[0] ?? null)
    const [detailsIsUpdated, setDetailsIsUpdated] = useState(false)
    const handleSuccess = (updatedChild) => {
        onChildUpdated?.(updatedChild)
        setChild(updatedChild)
        setDetailsIsUpdated(true)
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

        {detailsIsUpdated ? (
            <FormChildReg
                child={child}
                event={event}
                onSuccess={() => {
                    onRegistrationSuccess?.(child.fullName, event.name)
                    onCancel()
                }}
            />
        ) : (
            child && (
                <UpdateChild
                    key={child._id}
                    child={child}
                    onCancel={onCancel}
                    onSuccess={handleSuccess}
                />
            )
        )}
    </>
}

export default RegChildToEvent