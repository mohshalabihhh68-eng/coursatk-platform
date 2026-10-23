const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ 1. مسار تسجيل الدخول (بيقبل أي كود 7 أرقام)
app.post("/api/auth/login", (req, res) => {
  const { code } = req.body || {};
  
  if (!code || !/^\d{7}$/.test(code)) {
    return res.status(400).json({ success: false, message: "الكود لازم يكون 7 أرقام." });
  }

  res.json({
    success: true,
    data: {
      token: "fake_token_" + Date.now(),
      user: { name: "طالب ثانوية", code: code }
    }
  });
});

// ✅ 2. مسار البروفايل
app.get("/api/profile", (req, res) => {
  res.json({
    success: true,
    data: { name: "طالب ثانوية", code: "1234567" }
  });
});

// ✅ 3. مسار المواد
app.get("/api/subjects/:id", (req, res) => {
  const subjects = [
    { id: 1, name: "اللغة العربية", image_url: "" },
    { id: 2, name: "الرياضيات", image_url: "" },
    { id: 3, name: "الفيزياء", image_url: "" },
    { id: 4, name: "الكيمياء", image_url: "" },
    { id: 5, name: "الأحياء", image_url: "" },
    { id: 6, name: "اللغة الإنجليزية", image_url: "" },
    { id: 7, name: "التاريخ", image_url: "" },
    { id: 8, name: "الجغرافيا", image_url: "" },
  ];
  res.json({ success: true, data: subjects });
});

// ✅ 4. مسار المدرسين
app.get("/api/subjects/:id/teachers", (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: "أ. محمد", subject_id: req.params.id },
      { id: 2, name: "أ. أحمد", subject_id: req.params.id }
    ]
  });
});

// أي طلب تاني يروح لملف index.html
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, function () {
  console.log("Running on port " + PORT);
});
