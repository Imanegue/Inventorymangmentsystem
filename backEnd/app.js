import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API working 🚀" });
});

export default app;