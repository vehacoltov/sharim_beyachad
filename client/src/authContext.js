import { createContext } from "react"

// Context הוא ערוץ משותף להעברת session בין Provider לצרכנים ללא שרשרת Props.
// הערך null מציין שאין Provider מעל הצרכן; useAuth מזהה מצב זה ומחזיר שגיאה ברורה.
const AuthContext = createContext(null)

export default AuthContext
