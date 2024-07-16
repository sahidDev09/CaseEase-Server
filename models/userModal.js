const mongoose = require("mongoose");

const User = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    pin: { type: Number, required: true },
    role: { type: String, required: true },
  },
  { collation: "Users" }
);

const model = mongoose.model("UsersData", User);

module.exports = model;
