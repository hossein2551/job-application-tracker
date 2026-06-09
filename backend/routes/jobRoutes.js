const express = require("express");
const multer = require("multer");
const path = require("path");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.get("/", authMiddleware, async (req, res) => {
  try {
    const jobs = await pool.query(
      `SELECT *
       FROM jobs
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(jobs.rows);
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({ message: "Server error while getting jobs" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      company,
      position,
      status,
      application_date,
      follow_up_date,
      company_rating,
      interview_date,
      interview_time,
      interview_type,
      contact_person,
      interview_notes,
      notes,
    } = req.body;

    if (!company || !position) {
      return res.status(400).json({
        message: "Company and position are required",
      });
    }

    const newJob = await pool.query(
      `INSERT INTO jobs 
       (
        user_id,
        company,
        position,
        status,
        application_date,
        follow_up_date,
        company_rating,
        interview_date,
        interview_time,
        interview_type,
        contact_person,
        interview_notes,
        notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        req.user.id,
        company,
        position,
        status || "Applied",
        application_date || new Date(),
        follow_up_date || null,
        company_rating || 0,
        interview_date || null,
        interview_time || null,
        interview_type || "",
        contact_person || "",
        interview_notes || "",
        notes || "",
      ]
    );

    res.status(201).json(newJob.rows[0]);
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({ message: "Server error while creating job" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      company,
      position,
      status,
      application_date,
      follow_up_date,
      company_rating,
      interview_date,
      interview_time,
      interview_type,
      contact_person,
      interview_notes,
      notes,
    } = req.body;

    const updatedJob = await pool.query(
      `UPDATE jobs
       SET company = $1,
           position = $2,
           status = $3,
           application_date = $4,
           follow_up_date = $5,
           company_rating = $6,
           interview_date = $7,
           interview_time = $8,
           interview_type = $9,
           contact_person = $10,
           interview_notes = $11,
           notes = $12
       WHERE id = $13 AND user_id = $14
       RETURNING *`,
      [
        company,
        position,
        status,
        application_date,
        follow_up_date || null,
        company_rating || 0,
        interview_date || null,
        interview_time || null,
        interview_type || "",
        contact_person || "",
        interview_notes || "",
        notes || "",
        id,
        req.user.id,
      ]
    );

    if (updatedJob.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(updatedJob.rows[0]);
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({ message: "Server error while updating job" });
  }
});

router.post(
  "/:id/upload",
  authMiddleware,
  upload.fields([
    { name: "cv_file", maxCount: 1 },
    { name: "cover_letter_file", maxCount: 1 },
    { name: "portfolio_file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const cvFile = req.files.cv_file ? req.files.cv_file[0].filename : null;
      const coverLetterFile = req.files.cover_letter_file
        ? req.files.cover_letter_file[0].filename
        : null;
      const portfolioFile = req.files.portfolio_file
        ? req.files.portfolio_file[0].filename
        : null;

      const currentJob = await pool.query(
        `SELECT * FROM jobs WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );

      if (currentJob.rows.length === 0) {
        return res.status(404).json({ message: "Job not found" });
      }

      const updatedJob = await pool.query(
        `UPDATE jobs
         SET cv_file = COALESCE($1, cv_file),
             cover_letter_file = COALESCE($2, cover_letter_file),
             portfolio_file = COALESCE($3, portfolio_file)
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [cvFile, coverLetterFile, portfolioFile, id, req.user.id]
      );

      res.json(updatedJob.rows[0]);
    } catch (error) {
      console.error("Upload file error:", error);
      res.status(500).json({ message: "Server error while uploading files" });
    }
  }
);

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedJob = await pool.query(
      `DELETE FROM jobs
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (deletedJob.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ message: "Server error while deleting job" });
  }
});

module.exports = router;