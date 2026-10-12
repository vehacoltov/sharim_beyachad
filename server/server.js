require("dotenv").config()
const mongoose = require("mongoose")
const connectDB=require("./config/dbConn")
const express = require("express")
const cors = require("cors")
const corsOptions = require("./config/corsOptions")
const PORT = process.env.PORT || 7001
const app = express()



connectDB()
//middlewares
app.use(express.json())
app.use(cors(corsOptions))



app.use("/event", require("./routes/eventRoute"))
app.use("/child", require("./routes/childRoute"))
app.use("/child-event", require("./routes/childEventRoute"))
app.use("/employee", require("./routes/employeeRoute"))
app.use("/parent", require("./routes/parentRoute"))
app.use("/volunteer", require("./routes/volunRoute"))
app.use("/volunteer-event", require("./routes/volunEventRoute"))

//routes
app.get("/", (req, res) => {
    res.send("this is the home page")
})



mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB')
    app.listen(PORT, () => console.log(`Server running on port
${PORT}`))
})
mongoose.connection.on('error', err => {
    console.log(err)
})


