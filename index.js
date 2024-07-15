const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 8000;

const app = express();

app.use(cors());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello CashEasy");
});

app.listen(PORT, () => {
  console.log(`CashEasy Server is running in port :${PORT}`);
});
