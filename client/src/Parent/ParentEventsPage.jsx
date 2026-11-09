import { useOutletContext } from "react-router-dom"
import AllEvents from "../Event/AllEvents"

// מקבל את נתוני ההורה שהועברו מה־Outlet ומציג את מסך האירועים כנתיב נפרד.
function ParentEventsPage() {
  const {
    childrenForRegistration,
    childrenLoading,
    childrenError,
  } = useOutletContext()

  return (
    <AllEvents
      childrenForRegistration={childrenForRegistration}
      childrenLoading={childrenLoading}
      childrenError={childrenError}
    />
  )
}

export default ParentEventsPage
