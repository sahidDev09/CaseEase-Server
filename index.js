require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 8000;

// Middlewares
const middleOption = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(middleOption));
app.use(express.json());
app.use(cookieParser());

// MongoDB connection URI
const uri = process.env.DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectDB() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
}

// Connect to the database
connectDB();

// Routes
app.get("/", (req, res) => {
  res.send("Hello CashEasy");
});

app.post("/register", async (req, res, next) => {
  try {
    const { email, pin, name, role, status, mobile } = req.body;
    const allusers = client.db("CashEase").collection("Users");

    const existUser = await allusers.findOne({ email });
    if (existUser) {
      return res
        .status(409)
        .json({ message: "User already exists in the database" });
    }

    const hashedPassword = await bcrypt.hash(pin, 10);

    const result = await allusers.insertOne({
      name,
      email,
      mobile,
      pin: hashedPassword,
      role,
      status,
    });

    res.status(201).json({
      message: "User registered successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    next(error);
  }
});

// Login
app.post("/login", async (req, res, next) => {
  try {
    const { email, pin } = req.body;
    const allusers = client.db("CashEase").collection("Users");

    // Find user by email or mobile
    const user = await allusers.findOne({
      $or: [{ email }, { mobile: email }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ message: "Login successful" });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start server
app.listen(PORT, () => {
  console.log(`CashEasy Server is running on port: ${PORT}`);
});
