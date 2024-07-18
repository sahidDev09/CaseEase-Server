require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Authentication Middleware
const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// MongoDB connection URI
const uri = process.env.DB_URI;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectDB() {
  // All collections
  const allusers = client.db("CashEase").collection("Users");

  // Routes
  app.get("/", (req, res) => {
    res.send("Hello CashEasy");
  });

  app.post("/register", async (req, res, next) => {
    try {
      const { email, pin, image, name, role, status, mobile } = req.body;

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
        image,
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

      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      res.json({ message: "Login successful", token, user });
    } catch (error) {
      next(error);
    }
  });

  // Example of a protected route
  app.get("/profile", authenticate, async (req, res) => {
    const user = await allusers.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  });

  app.get("/users", async (req, res) => {
    const result = await allusers.find().toArray();
    res.json(result);
  });

  try {
    await client.connect();
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
}

connectDB();

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start server
app.listen(PORT, () => {
  console.log(`CashEasy Server is running on port: ${PORT}`);
});
