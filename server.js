
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const contentRoutes = require("./routes/contentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const connectDb = require("./config/db");

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());


app.use("/", authRoutes);
app.use("/", subscriptionRoutes);
app.use("/content", contentRoutes);
app.use("/admin", adminRoutes);



const PORT = process.env.PORT || 3200;

app.listen(PORT,()=>{
  connectDb()
  console.log(`Server is running on port ${PORT}`)
})