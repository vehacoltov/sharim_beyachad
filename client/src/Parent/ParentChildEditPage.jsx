import { useOutletContext, useNavigate, useParams } from "react-router-dom"
import UpdateChild from "./UpdateChild"

// מחבר את הילד שנבחר בכתובת לנתוני ההורה שב־ParentPA.
function ParentChildEditPage() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const {
    childrenForRegistration,
    childrenLoading,
    childrenError,
    onChildUpdated,
  } = useOutletContext()

  if (childrenLoading) {
    return <p role="status">טוען פרטי ילד...</p>
  }

  const child = childrenForRegistration.find((item) => item._id === childId)
  if (!child) {
    return (
      <section role="alert">
        <p>{childrenError || "הילד לא נמצא או שאינו משויך לחשבון הזה."}</p>
        <button className="secondary-button" type="button" onClick={() => navigate("/personal")}>
          חזרה לאזור האישי
        </button>
      </section>
    )
  }

  return (
    <UpdateChild
      key={child._id}
      child={child}
      onCancel={() => navigate("/personal")}
      onSuccess={(updatedChild) => {
        onChildUpdated(updatedChild)
        navigate("/personal", {
          replace: true,
          state: {
            successMessage: "פרטי הילד עודכנו בהצלחה.",
            refreshChildren: true,
          },
        })
      }}
    />
  )
}

export default ParentChildEditPage
