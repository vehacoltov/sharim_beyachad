# תיעוד השרת

שרת Express ו־MongoDB של פרויקט "שרים ביחד". השרת מספק API לניהול משתמשים,
ילדים, אירועים וקשרים בין מתנדבים לילדים.

## הפעלה והגדרות

דרישות: Node.js, npm ומסד נתונים MongoDB זמין.

מתיקיית `server`:

```powershell
npm ci
npm run dev
```

להרצה ללא Nodemon:

```powershell
npm start
```

יש ליצור קובץ `.env` לפי `.env.example`:

| משתנה | חובה | תיאור |
|---|---|---|
| `DATABASE_URI` | כן | מחרוזת החיבור ל־MongoDB |
| `JWT_SECRET` | כן | סוד אקראי באורך 32 בתים לפחות, המשמש לחתימת JWT וגם ל־HMAC של שם הרשאה |
| `PORT` | לא | פורט השרת; ברירת מחדל `7001` |

השרת בודק את `JWT_SECRET` בזמן האתחול ולא עולה אם הסוד חסר או קצר מדי.
אין להעלות את `.env` למאגר הקוד.

כתובת הבסיס המקומית היא `http://localhost:7001` (או הפורט שהוגדר). כל גוף
בקשה ותגובה הוא JSON; יש לשלוח `Content-Type: application/json`.
ה־CORS מוגדר עבור `localhost:3000`, `localhost:5500` ו־`localhost:5173`,
וכן עבור בקשות ללא Origin.

## נתיבים

### נתיבי CRUD גנריים

המשאבים הבאים משתמשים בנתב CRUD המשותף:

| בסיס נתיב | משאב |
|---|---|
| `/child` | ילד |
| `/child-event` | קשר בין ילד למתנדב באירוע |
| `/employee` | עובד |
| `/parent` | הורה |
| `/permission` | הרשאה |
| `/volunteer` | מתנדב |
| `/volunteer-event` | קשר בין מתנדב לילד באירוע |

לכל אחד מהמשאבים האלה קיימות הפעולות הבאות:

| שיטה ונתיב | פעולה | תשובה מוצלחת |
|---|---|---|
| `GET /resource` | קבלת כל הרשומות | `200` ורשימת JSON |
| `POST /resource` | יצירת רשומה | `201` והרשומה שנוצרה |
| `GET /resource/:id` | קבלת רשומה לפי מזהה MongoDB מסוג ObjectId | `200` והרשומה |
| `PUT /resource/:id` | עדכון חלקי לפי ObjectId | `200` והרשומה המעודכנת |
| `PATCH /resource/:id` | עדכון חלקי לפי ObjectId | `200` והרשומה המעודכנת |
| `DELETE /resource/:id` | מחיקה לפי ObjectId | `200` והודעת הצלחה |

ביצירה ובעדכון מתקבלים רק השדות המותרים לאותו מודל. שליחת שדות אחרים מחזירה
`400`. יצירה בודקת את דרישות המודל; עדכון מפעיל ולידציות של Mongoose.
שדה הסיסמה, כשקיים, נשמר כ־bcrypt hash ואינו מוחזר בתגובת API.

מודלי משתמש שמגדירים סיסמה תומכים גם ב:

| שיטה ונתיב | פעולה |
|---|---|
| `POST /resource/register` | רישום; דורש סיסמה תקינה |
| `POST /resource/login` | התחברות באמצעות מזהה וסיסמה; מחזיר JWT |

נתיבי הרישום נוצרים גם עבור מודלים שאינם מודלי משתמש, אך הם מחזירים שגיאת
`400` כאשר המודל אינו מגדיר שדה סיסמה. יש להשתמש בהם רק עבור `/parent`,
`/employee`, `/volunteer` ו־`/permission`.

שדה הזיהוי בגוף בקשת ההתחברות משתנה לפי המשאב:

| נתיב | שדה זיהוי בבקשה | שדות שבהם מתבצע החיפוש |
|---|---|---|
| `POST /parent/login` | `id` | מזהה ההורה `id` |
| `POST /employee/login` | `userName` | שם המשתמש של העובד `userName` |
| `POST /volunteer/login` | `userName` | `email` או `fullName` של המתנדב |
| `POST /permission/login` | `id` | המזהה המספרי של ההרשאה `id` |

בכל המקרים נדרש גם `password`. שדות הזיהוי והסיסמה חייבים להישלח באותו
אובייקט JSON.

התחברות להורה משתמשת ב־`id` שלו; השדה `UserName` הישן אינו בשימוש.
התחברות למתנדב מקבלת `userName` בבקשה, וערך זה נבדק מול `email` או
`fullName` של המתנדב.

### הגבלת ניסיונות התחברות

לאחר חמש סיסמאות שגויות בתוך חלון של 15 דקות, השרת חוסם ניסיונות נוספים
לאותו סוג פעולה, כתובת IP ומזהה למשך חמש דקות. תגובת החסימה היא `429 Too
Many Requests`, כוללת `retryAfterSeconds` ומגדירה כותרת `Retry-After`.
התחברות מוצלחת מאפסת את מונה הכישלונות של אותו מזהה.

המונה נשמר בזיכרון תהליך השרת; אתחול מחדש מאפס אותו, והוא אינו מסונכרן
בין כמה מופעי שרת. לייצור עם מספר מופעים יש להשתמש באחסון משותף כגון Redis.

### API של הרשאות (`/permission`)

#### יצירה ורישום

`POST /permission/register` או `POST /permission` מקבלים:

```json
{
  "name": "manager",
  "password": "example-password"
}
```

`name` ו־`password` הם שדות חובה. השם מוסר מרווחים בתחילתו ובסופו ומוגבל
ל־72 בתים ב־UTF-8, כמו מגבלת הקלט של bcrypt. הסיסמה גם היא מוגבלת ל־72
בתים. שמות הרשאה ייחודיים לאחר הסרת הרווחים החיצוניים.

ביצירה מוקצה `id` מספרי אוטומטי, החל מ־1 במסד נתונים חדש. אין לשלוח אותו
בגוף הבקשה: השרת מחשב את הערך ושומר אותו. תשובת יצירה לדוגמה:

```json
{
  "_id": "מזהה MongoDB",
  "id": 1,
  "createdAt": "תאריך יצירה",
  "updatedAt": "תאריך עדכון"
}
```

השם והסיסמה אינם מוחזרים בתשובת ה־API.

#### התחברות

`POST /permission/login` מקבל מזהה מספרי וסיסמה:

```json
{
  "id": 1,
  "password": "example-password"
}
```

אפשר להעביר את `id` כמספר או כמחרוזת ספרות חיובית. חיפוש החשבון מתבצע לפי
שדה ה־`id` המספרי של ההרשאה, ולא לפי `_id` של MongoDB או לפי השם.
התחברות מוצלחת מחזירה JWT מסוג Bearer, שתוקפו שעה.

### בדיקת הרשאה לרישום עובד

`POST /permission/verify-employee-access` מקבל `{ "password": "..." }`.
השרת משווה את הסיסמה ל־hash-ים של הרשאות, ומאשר רק אם נמצאה הרשאה יחידה
שתואמת גם לאחד מתפקידי העובד המוגדרים (`manager`, `canMatch`, `Basic`).
בתשובה מוחזר התפקיד המאושר, לא סיסמת ההרשאה או ה־hash.
לכן שם הרשאה המיועדת לאישור עובד חייב להיות אחד משלושת הערכים האלה.

בדיקה זו משמשת את חלונית ההרשמה בממשק, אך אינה תחליף לאימות בעת יצירת עובד:
`POST /employee/register` וגם `POST /employee` בודקים שוב את
`authorizationPassword` בצד השרת. ללא הרשאה תקינה לא נוצר עובד. העובד
מקבל בשדה `permission` את התפקיד שנמצא, והתפקיד משמש גם בתביעת `role` של
ה־JWT שלו. סיסמת ההרשאה מוסרת מגוף הנתונים לפני שמירת העובד.

#### שמירת שם וסיסמה

- `name` נשמר כ־bcrypt hash עם salt, ולא כטקסט גלוי.
- `password` נשמר גם הוא כ־bcrypt hash.
- מאחר ש־bcrypt אינו מאפשר חיפוש לפי שם מקורי, `nameLookup` הוא HMAC-SHA256
  יציב המבוסס על `JWT_SECRET`. הוא משמש לאכיפת ייחודיות השם, מוסתר מהתגובות
  ואינו משמש להתחברות.
- `id` הוא המזהה העסקי המשמש להתחברות. `_id` נשאר המזהה הפנימי של MongoDB
  ומשמש בנתיב הכללי `GET /permission/:id` ובעדכון ובמחיקה.
- אין להחליף את `JWT_SECRET` בלי לתכנן מחדש את ערכי `nameLookup`; החלפה
  עלולה לאפשר שמות כפולים או לגרום להתנגשות עם שמות קיימים.

### API של אירועים (`/event`)

נתיבי האירועים מותאמים אישית, ולכן אינם משתמשים בנתב CRUD הגנרי:

| שיטה ונתיב | פעולה |
|---|---|
| `GET /event` | קבלת כל האירועים |
| `POST /event` | יצירת אירוע |
| `GET /event/:id` | קבלת אירוע לפי `_id` של MongoDB |
| `PUT /event` | עדכון אירוע; `_id` נשלח בגוף הבקשה |
| `DELETE /event` | מחיקת אירוע; `_id` נשלח בגוף הבקשה |

שדות היצירה המוכרים: `name`, `id`, `Children`, `Volunteers`, `date`,
`detailing`, `sumOfChilds`, `SavedPlaces`, `isActive`.

בעדכון יש לשלוח `_id` ושדה אחד או יותר מתוך: `name`, `Children`,
`Volunteers`, `date`, `detailing`, `sumOfChilds`, `SavedPlaces`, `isActive`.
מחיקה מקבלת גוף כמו `{ "_id": "מזהה MongoDB" }`.

### קודי שגיאה נפוצים

- `400` — קלט לא תקין, שדות אסורים או מזהה ObjectId לא תקין.
- `401` — פרטי התחברות שגויים או אסימון חסר/לא תקין, במקומות שבהם מתבצעת
  בדיקת אסימון.
- `404` — הרשומה המבוקשת לא נמצאה.
- `409` — התנגשות ייחודיות, לדוגמה שם הרשאה שכבר קיים.
- `500` — שגיאה פנימית או כשל בגישה למסד הנתונים.

## מודלים ושדות

השדות המפורטים הם שמות השדות של ה־API וה־Mongoose. שדות `createdAt`,
`updatedAt` נוצרים אוטומטית בכל המודלים שמפעילים timestamps. שדות
`password`, `name` ו־`nameLookup` של הרשאה מוגדרים כשדות נסתרים במודל;
ה־API מסיר גם שדות פרטיים מתשובותיו.

| משאב | שדות |
|---|---|
| `Parent` | `email`, `password`, `id`, `children` |
| `Employee` | `fullName`, `id`, `phone`, `userName`, `password`, `permission`, `workingTime`, `currentWorkingTime` |
| `Volunteer` | `fullName`, `password`, `email`, `id`, `phone`, `age`, `seminar`, `detaling` |
| `Child` | `fullName`, `parent`, `id`, `phone`, `anothwrPhone`, `age`, `epilepsy`, `sensitivity`, `medicines`, `canBeFilemed`, `detailing`, `notes`, `img`, `status`, `category` |
| `ChildEvent` | `child`, `volunteer` |
| `VolunteerEvent` | `child`, `volunteer`, `notes`, `favouredChild` |
| `Event` | `name`, `id`, `Children`, `sumOfChilds`, `SavedPlaces`, `isActive`, `Volunteers`, `date`, `detailing` |
| `Permission` | `id`, `name` (hash), `nameLookup` (HMAC), `password` (hash) |
| `Counter` | `_id` — שם המונה; `seq` — המספר האחרון שהוקצה |

במודל `Parent` השדה `id` הוא מזהה חיצוני ייחודי ומחרוזתי ומשמש להתחברות;
השדה הישן `UserName` הוסר. במודל `Permission`, לעומת זאת, `id` הוא מספרי
וממוספר אוטומטית. בשני המקרים `GET /resource/:id` הגנרי עדיין מחפש לפי
ObjectId של MongoDB.

שדות נדרשים, ערכי enum ואילוצי ייחודיות נוספים מוגדרים בסכמות שבספריית
`models`. לדוגמה: `Permission.name` ו־`Permission.id` ייחודיים; לעובד
נדרש `userName` ייחודי; לילד נדרשים `fullName` ייחודי ו־`phone`.

## הרשאות גישה ואסימונים

התחברות מוצלחת מחזירה אסימון JWT עם תוקף של שעה. יש לשלוח אותו כך:

```http
Authorization: Bearer <token>
```

קיימת middleware לאימות JWT בקובץ `middleware/verifyToken.js`, אך היא אינה
מחוברת כרגע לנתיבי המשאבים ב־`server.js`. לכן הנתיבים המתועדים לעיל אינם
מוגנים באמצעותה בשלב זה; קבלת JWT בהתחברות אינה כשלעצמה הגנה על נתיבי CRUD.

## העברות נתונים קיימים

פקודות ההעברה משנות את מסד הנתונים שאליו מצביע `DATABASE_URI`. יש לוודא
שהערך מצביע למסד הנכון ולגבות אותו לפני ההרצה.

### הוספת מזהים והרשאות קיימות

```powershell
npm run migrate:permission-ids
```

הפקודה `scripts/migratePermissionIds.js`:

1. ממלאת `id` מספרי לרשומות הרשאה שחסר להן מזהה ומעדכנת את המונה כך שהערכים
   הבאים ימשיכו אחרי המזהה הגבוה ביותר.
2. ממירה שם גלוי ל־bcrypt hash ומחשבת `nameLookup`.
3. יוצרת אינדקסים ייחודיים ל־`id` ול־`nameLookup`.

הפקודה לא יכולה לשחזר שם מקורי שכבר נשמר כ־bcrypt hash ללא `nameLookup`.
במקרה כזה היא נעצרת עם שגיאה; יש לשחזר או לעדכן את שם ההרשאה ממקור אמין
לפני ניסיון ההעברה. יש להשתמש באותו `JWT_SECRET` בכל ההעברה ולאחריה.

### הסרת שדה שם המשתמש הישן מהורים

```powershell
npm run migrate:parent-username
```

הפקודה `scripts/migrateParentUsername.js` מסירה את אינדקס `UserName` הישן
ואת ערכי `UserName` מרשומות `Parent`. היא אינה משנה את `id` או את פרטי
ההתחברות האחרים.

## מבנה קוד

| נתיב | אחריות |
|---|---|
| `server.js` | טעינת הגדרות, middleware וחיבור נתיבים |
| `config/dbConn.js` | חיבור Mongoose ל־MongoDB |
| `config/jwt.js` | חתימה ואימות של JWT |
| `utils/password.js` | בדיקת מגבלת bcrypt, hashing והשוואת סיסמאות |
| `utils/loginRateLimiter.js` | ספירת ניסיונות שגויים וחסימה זמנית בזיכרון |
| `utils/employeePermission.js` | אימות סיסמת גישה ומיפוי הרשאה לתפקיד עובד |
| `middleware/verifyToken.js` | בדיקת JWT בכותרת Authorization |
| `models/` | סכמות MongoDB |
| `controllers/modelControllerFactory.js` | פעולות CRUD משותפות, ולידציה, hashing והתחברות |
| `controllers/` | הגדרות פעולות לכל מודל |
| `routes/modelRouteFactory.js` | נתיבי CRUD גנריים |
| `routes/` | מיפוי בסיס הנתיב ל־controller |
| `scripts/` | סקריפטים חד־פעמיים להגירת נתונים |
