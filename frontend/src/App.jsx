
function getTimeline(job) {
  const timeline = [];

  if (job.application_date) {
    timeline.push({
      label: "Application sent",
      date: formatDate(job.application_date),
    });
  }

  if (job.follow_up_date) {
    timeline.push({
      label: "Follow-up scheduled",
      date: formatDate(job.follow_up_date),
    });
  }

  if (job.interview_date) {
    timeline.push({
      label: `Interview booked${
        job.interview_time ? ` at ${job.interview_time}` : ""
      }`,
      date: formatDate(job.interview_date),
    });
  }

  if (job.status === "Offer") {
    timeline.push({
      label: "Offer received",
      date: "Current status",
    });
  }

  if (job.status === "Rejected") {
    timeline.push({
      label: "Application rejected",
      date: "Current status",
    });
  }

  return timeline;
}

import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = "http://localhost:5000/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [search, setSearch] = useState("");
  const [editingJobId, setEditingJobId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: "application_date",
    direction: "desc",
  });

  const [loginForm, setLoginForm] = useState({
    email: "hossain@test.com",
    password: "123456",
  });

  const [jobForm, setJobForm] = useState({
  company: "",
  position: "",
  status: "Applied",
  application_date: new Date().toISOString().split("T")[0],
  follow_up_date: "",
  company_rating: 0,

  interview_date: "",
  interview_time: "",
  interview_type: "",
  contact_person: "",
  interview_notes: "",

  notes: "",
});

  const [jobs, setJobs] = useState([]);

  async function login(e) {
    e.preventDefault();
    const response = await axios.post(`${API_URL}/auth/login`, loginForm);
    localStorage.setItem("token", response.data.token);
    setToken(response.data.token);
  }

  async function getJobs() {
    const response = await axios.get(`${API_URL}/jobs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setJobs(response.data);
  }

  async function addJob(e) {
    e.preventDefault();

    await axios.post(`${API_URL}/jobs`, jobForm, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setJobForm({
      company: "",
      position: "",
      status: "Applied",
      application_date: new Date().toISOString().split("T")[0],
      follow_up_date: "",
      company_rating: 0,
      notes: "",
    });

    getJobs();
  }

  function startEdit(job) {
    setEditingJobId(job.id);
    setEditForm({
      company: job.company,
      position: job.position,
      status: job.status,
      application_date: job.application_date?.split("T")[0] || "",
      follow_up_date: job.follow_up_date?.split("T")[0] || "",
      company_rating: job.company_rating || 0,
      notes: job.notes || "",
    });
  }

  function cancelEdit() {
    setEditingJobId(null);
    setEditForm({});
  }

  async function saveEdit(id) {
    await axios.put(`${API_URL}/jobs/${id}`, editForm, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setEditingJobId(null);
    setEditForm({});
    getJobs();
  }

  async function updateStatus(job, newStatus) {
    await axios.put(
      `${API_URL}/jobs/${job.id}`,
      {
        company: job.company,
        position: job.position,
        status: newStatus,
        application_date: job.application_date,
        follow_up_date: job.follow_up_date,
        company_rating: job.company_rating || 0,
        notes: job.notes,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    getJobs();
  }

  async function updateRating(job, rating) {
    await axios.put(
      `${API_URL}/jobs/${job.id}`,
      {
        company: job.company,
        position: job.position,
        status: job.status,
        application_date: job.application_date,
        follow_up_date: job.follow_up_date,
        company_rating: rating,
        notes: job.notes,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    getJobs();
  }

  async function deleteJob(id) {
    await axios.delete(`${API_URL}/jobs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    getJobs();
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setJobs([]);
  }

  function formatDate(dateValue) {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleDateString("sv-SE");
  }

  function renderStars(rating, onClick) {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => onClick && onClick(star)}
            className={star <= rating ? "star active-star" : "star"}
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  function getFollowUpStatus(dateValue) {
    if (!dateValue) return { text: "No follow-up", className: "neutral" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followUpDate = new Date(dateValue);
    followUpDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((followUpDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Overdue", className: "overdue" };
    if (diffDays <= 3) return { text: "Due soon", className: "due-soon" };

    return { text: "OK", className: "ok" };
  }

  function getFollowUpSuggestion(job) {
    const applicationDate = new Date(job.application_date);
    const today = new Date();

    const diffDays = Math.floor(
      (today - applicationDate) / (1000 * 60 * 60 * 24)
    );

    if (job.status === "Rejected") return "❌ Closed";
    if (job.status === "Offer") return "🎉 Respond to offer";
    if (diffDays < 5) return "⏳ Too early";
    if (diffDays >= 5 && diffDays < 10) return "📧 Follow up soon";
    if (diffDays >= 10 && diffDays < 20) return "⚠ Follow up now";

    return "🚨 High priority";
  }

  function handleSort(key) {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: "asc" };
    });
  }

  function sortIcon(key) {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  }
async function uploadFiles(jobId, files) {
  const formData = new FormData();

  if (files.cv_file) {
    formData.append("cv_file", files.cv_file);
  }

  if (files.cover_letter_file) {
    formData.append("cover_letter_file", files.cover_letter_file);
  }

  if (files.portfolio_file) {
    formData.append("portfolio_file", files.portfolio_file);
  }

  await axios.post(`${API_URL}/jobs/${jobId}/upload`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  getJobs();

}
function FileUploadBox({ job }) {
  const [files, setFiles] = useState({});

  return (
    <div className="file-upload-box">
      <label>CV</label>
      <input
        type="file"
        onChange={(e) =>
          setFiles({ ...files, cv_file: e.target.files[0] })
        }
      />

      <label>Cover Letter</label>
      <input
        type="file"
        onChange={(e) =>
          setFiles({ ...files, cover_letter_file: e.target.files[0] })
        }
      />

      <label>Portfolio</label>
      <input
        type="file"
        onChange={(e) =>
          setFiles({ ...files, portfolio_file: e.target.files[0] })
        }
      />

      <button onClick={() => uploadFiles(job.id, files)}>
        Upload Documents
      </button>

      <div className="document-links">
        {job.cv_file && (
          <a href={`http://localhost:5000/uploads/${job.cv_file}`} target="_blank">
            View CV
          </a>
        )}

        {job.cover_letter_file && (
          <a
            href={`http://localhost:5000/uploads/${job.cover_letter_file}`}
            target="_blank"
          >
            View Cover Letter
          </a>
        )}

        {job.portfolio_file && (
          <a
            href={`http://localhost:5000/uploads/${job.portfolio_file}`}
            target="_blank"
          >
            View Portfolio
          </a>
        )}
      </div>
    </div>
  );
}
  function exportCSV() {
    const headers = [
      "Company",
      "Position",
      "Application Date",
      "Follow Up Date",
      "Status",
      "Rating",
      "Suggestion",
      "Notes",
    ];

    const rows = sortedJobs.map((job) => [
      job.company,
      job.position,
      formatDate(job.application_date),
      formatDate(job.follow_up_date),
      job.status,
      job.company_rating || 0,
      getFollowUpSuggestion(job),
      job.notes,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value || "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "job-applications.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  const stats = {
    Applied: jobs.filter((job) => job.status === "Applied").length,
    Interview: jobs.filter((job) => job.status === "Interview").length,
    Offer: jobs.filter((job) => job.status === "Offer").length,
    Rejected: jobs.filter((job) => job.status === "Rejected").length,
  };

  const weeklyGoal = 10;

  const currentWeekApplications = jobs.filter((job) => {
    const jobDate = new Date(job.application_date);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    return jobDate >= startOfWeek;
  }).length;

  const goalPercentage = Math.min(
    (currentWeekApplications / weeklyGoal) * 100,
    100
  );

  const followUpStats = {
    overdue: jobs.filter(
      (job) => getFollowUpStatus(job.follow_up_date).className === "overdue"
    ).length,
    dueSoon: jobs.filter(
      (job) => getFollowUpStatus(job.follow_up_date).className === "due-soon"
    ).length,
    ok: jobs.filter(
      (job) => getFollowUpStatus(job.follow_up_date).className === "ok"
    ).length,
    none: jobs.filter(
      (job) => getFollowUpStatus(job.follow_up_date).className === "neutral"
    ).length,
  };

  const totalApplications = jobs.length;

  const mostCommonStatus =
    Object.entries(stats).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
      ? Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0]
      : "No data";

  const latestApplication = [...jobs].sort(
    (a, b) => new Date(b.application_date) - new Date(a.application_date)
  )[0];

  const offerRate =
    totalApplications === 0
      ? 0
      : Math.round((stats.Offer / totalApplications) * 100);

  const averageRating =
    jobs.length === 0
      ? 0
      : (
          jobs.reduce((sum, job) => sum + Number(job.company_rating || 0), 0) /
          jobs.length
        ).toFixed(1);

  const chartData = [
    { name: "Applied", total: stats.Applied },
    { name: "Interview", total: stats.Interview },
    { name: "Offer", total: stats.Offer },
    { name: "Rejected", total: stats.Rejected },
  ];

  const filteredJobs = jobs.filter((job) => {
    const text = `${job.company} ${job.position} ${job.status} ${job.notes} ${job.application_date} ${job.follow_up_date}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const key = sortConfig.key;

    let valueA = a[key] || "";
    let valueB = b[key] || "";

    if (key === "application_date" || key === "follow_up_date") {
      valueA = valueA ? new Date(valueA) : new Date(0);
      valueB = valueB ? new Date(valueB) : new Date(0);
    } else {
      valueA = valueA.toString().toLowerCase();
      valueB = valueB.toString().toLowerCase();
    }

    if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;

    return 0;
  });

  useEffect(() => {
    if (token) {
      getJobs();
    }
  }, [token]);

  if (!token) {
    return (
      <div className="container">
        <h1>Job Application Tracker</h1>
        <p>Log in to manage your job applications.</p>

        <form onSubmit={login} className="card">
          <input
            type="email"
            placeholder="Email"
            value={loginForm.email}
            onChange={(e) =>
              setLoginForm({ ...loginForm, email: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) =>
              setLoginForm({ ...loginForm, password: e.target.value })
            }
          />

          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Job Application Tracker</h1>
          <p>Track all your job applications in one place.</p>
        </div>

        <button onClick={logout}>Logout</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.Applied}</h3>
          <p>Applied</p>
        </div>

        <div className="stat-card">
          <h3>{stats.Interview}</h3>
          <p>Interview</p>
        </div>

        <div className="stat-card">
          <h3>{stats.Offer}</h3>
          <p>Offer</p>
        </div>

        <div className="stat-card">
          <h3>{stats.Rejected}</h3>
          <p>Rejected</p>
        </div>
      </div>

      <div className="insights-grid">
  <div className="insight-card">
    <p>Total Applications</p>
    <h3>{totalApplications}</h3>
  </div>

  <div className="insight-card">
    <p>Most Common Status</p>
    <h3>{mostCommonStatus}</h3>
  </div>

  <div className="insight-card">
    <p>Latest Application</p>
    <h3>
      {latestApplication
        ? `${latestApplication.company} - ${latestApplication.position}`
        : "No applications yet"}
    </h3>
  </div>

  <div className="insight-card">
    <p>Average Rating</p>
    <h3>{averageRating} / 5</h3>
  </div>

  <div className="insight-card">
    <p>Upcoming Interviews</p>
    <h3>
      {
        jobs.filter(
          (job) =>
            job.interview_date &&
            new Date(job.interview_date) >= new Date()
        ).length
      }
    </h3>
  </div>
</div>

      <div className="followup-summary">
        <div className="followup-card overdue-card">
          <span>{followUpStats.overdue}</span>
          <p>Overdue</p>
        </div>

        <div className="followup-card due-card">
          <span>{followUpStats.dueSoon}</span>
          <p>Due soon</p>
        </div>

        <div className="followup-card ok-card">
          <span>{followUpStats.ok}</span>
          <p>OK</p>
        </div>

        <div className="followup-card none-card">
          <span>{followUpStats.none}</span>
          <p>No follow-up</p>
        </div>
      </div>
      
      <div className="kanban-board">
        {["Applied", "Interview", "Offer", "Rejected"].map((status) => (
          <div className="kanban-column" key={status}>
            <h3>
              {status} ({jobs.filter((job) => job.status === status).length})
            </h3>

            {jobs
              .filter((job) => job.status === status)
              .map((job) => {
                const reminder = getFollowUpStatus(job.follow_up_date);
                function getTimeline(job) {
  const timeline = [];

  if (job.application_date) {
    timeline.push({
      label: "Application sent",
      date: formatDate(job.application_date),
    });
  }

  if (job.follow_up_date) {
    timeline.push({
      label: "Follow-up scheduled",
      date: formatDate(job.follow_up_date),
    });
  }

  if (job.interview_date) {
    timeline.push({
      label: `Interview booked${job.interview_time ? ` at ${job.interview_time}` : ""}`,
      date: formatDate(job.interview_date),
    });
  }

  if (job.status === "Offer") {
    timeline.push({
      label: "Offer received",
      date: "Current status",
    });
  }

  if (job.status === "Rejected") {
    timeline.push({
      label: "Application rejected",
      date: "Current status",
    });
  }

  return timeline;
}
                return (
                  <div className="kanban-card" key={job.id}>
                    <h4>{job.company}</h4>
                    <p>{job.position}</p>
                    <small>Applied: {formatDate(job.application_date)}</small>
                    <br />
                    <small>Follow-up: {formatDate(job.follow_up_date)}</small>

                    <div style={{ marginTop: "10px" }}>
                      <span className={`reminder-badge ${reminder.className}`}>
                        {reminder.text}
                      </span>
                    </div>

                    <p className="suggestion-text">
                      {getFollowUpSuggestion(job)}
                    </p>

                    {renderStars(job.company_rating || 0, null)}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Application Statistics</h2>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#d1d5db" />
              <YAxis allowDecimals={false} stroke="#d1d5db" />
              <Tooltip />
              <Bar dataKey="total" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <form onSubmit={addJob} className="card">
        <h2>Add New Application</h2>

        <label>Company</label>
        <input
          type="text"
          placeholder="Company"
          value={jobForm.company}
          onChange={(e) =>
            setJobForm({ ...jobForm, company: e.target.value })
          }
          required
        />

        <label>Position</label>
        <input
          type="text"
          placeholder="Position"
          value={jobForm.position}
          onChange={(e) =>
            setJobForm({ ...jobForm, position: e.target.value })
          }
          required
        />

        <label>Application date</label>
        <input
          type="date"
          value={jobForm.application_date}
          onChange={(e) =>
            setJobForm({ ...jobForm, application_date: e.target.value })
          }
        />

        <label>Follow-up date</label>
        <input
          type="date"
          value={jobForm.follow_up_date}
          onChange={(e) =>
            setJobForm({ ...jobForm, follow_up_date: e.target.value })
          }
        />

        <label>Company rating</label>
        {renderStars(jobForm.company_rating, (rating) =>
          setJobForm({ ...jobForm, company_rating: rating })
        )}

        <label>Status</label>
        <select
          value={jobForm.status}
          onChange={(e) =>
            setJobForm({ ...jobForm, status: e.target.value })
          }
        >
          <option>Applied</option>
          <option>Interview</option>
          <option>Offer</option>
          <option>Rejected</option>
        </select>
        <label>Interview date</label>
<input
  type="date"
  value={jobForm.interview_date}
  onChange={(e) =>
    setJobForm({ ...jobForm, interview_date: e.target.value })
  }
/>

<label>Interview time</label>
<input
  type="time"
  value={jobForm.interview_time}
  onChange={(e) =>
    setJobForm({ ...jobForm, interview_time: e.target.value })
  }
/>

<label>Interview type</label>
<select
  value={jobForm.interview_type}
  onChange={(e) =>
    setJobForm({ ...jobForm, interview_type: e.target.value })
  }
>
  <option value="">Select</option>
  <option>Teams</option>
  <option>Zoom</option>
  <option>Phone</option>
  <option>Onsite</option>
</select>

<label>Contact person</label>
<input
  type="text"
  value={jobForm.contact_person}
  onChange={(e) =>
    setJobForm({ ...jobForm, contact_person: e.target.value })
  }
/>

<label>Interview notes</label>
<textarea
  value={jobForm.interview_notes}
  onChange={(e) =>
    setJobForm({ ...jobForm, interview_notes: e.target.value })
  }
/>
        <label>Notes</label>
        <textarea
          placeholder="Notes"
          value={jobForm.notes}
          onChange={(e) =>
            setJobForm({ ...jobForm, notes: e.target.value })
          }
        />

        <button type="submit">Save Application</button>
      </form>

      <div className="card">
        <h2>Weekly Goal</h2>

        <p>
          {currentWeekApplications} / {weeklyGoal} Applications
        </p>

        <div className="goal-bar">
          <div
            className="goal-progress"
            style={{ width: `${goalPercentage}%` }}
          ></div>
        </div>

        {currentWeekApplications >= weeklyGoal && <p>🎉 Goal Achieved!</p>}
      </div>

      <div className="section-header">
        <h2>My Applications</h2>

        <button onClick={exportCSV} className="export-btn">
          Export CSV
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by company, position, status, date or notes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("company")}>
                Company {sortIcon("company")}
              </th>
              <th onClick={() => handleSort("position")}>
                Position {sortIcon("position")}
              </th>
              <th onClick={() => handleSort("application_date")}>
                Date {sortIcon("application_date")}
              </th>
              <th onClick={() => handleSort("follow_up_date")}>
                Follow Up {sortIcon("follow_up_date")}
              </th>
              <th>Status</th>
              <th>Rating</th>
              <th>Reminder</th>
              <th>Suggestion</th>
              <th>Notes</th>
              <th>Documents</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {sortedJobs.map((job) => {
              const reminder = getFollowUpStatus(job.follow_up_date);

              return (
                <tr key={job.id}>
                  {editingJobId === job.id ? (
                    <>
                      <td>
                        <input
                          className="table-input"
                          value={editForm.company}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              company: e.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="table-input"
                          value={editForm.position}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              position: e.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="table-input"
                          type="date"
                          value={editForm.application_date}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              application_date: e.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="table-input"
                          type="date"
                          value={editForm.follow_up_date}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              follow_up_date: e.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <select
                          className="table-select"
                          value={editForm.status}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              status: e.target.value,
                            })
                          }
                        >
                          <option>Applied</option>
                          <option>Interview</option>
                          <option>Offer</option>
                          <option>Rejected</option>
                        </select>
                      </td>

                      <td>
                        {renderStars(editForm.company_rating || 0, (rating) =>
                          setEditForm({
                            ...editForm,
                            company_rating: rating,
                          })
                        )}
                      </td>

                      <td>
                        <span
                          className={`reminder-badge ${reminder.className}`}
                        >
                          {reminder.text}
                        </span>
                      </td>

                      <td>{getFollowUpSuggestion(editForm)}</td>

                      <td>
                        <input
                          className="table-input"
                          value={editForm.notes}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              notes: e.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="save-btn"
                            onClick={() => saveEdit(job.id)}
                          >
                            Save
                          </button>

                          <button className="cancel-btn" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{job.company}</td>
                      <td>{job.position}</td>
                      <td>{formatDate(job.application_date)}</td>
                      <td>{formatDate(job.follow_up_date)}</td>

                      <td>
                        <select
                          className="table-select"
                          value={job.status}
                          onChange={(e) => updateStatus(job, e.target.value)}
                        >
                          <option>Applied</option>
                          <option>Interview</option>
                          <option>Offer</option>
                          <option>Rejected</option>
                        </select>
                      </td>

                      <td>
                        {renderStars(job.company_rating || 0, (rating) =>
                          updateRating(job, rating)
                        )}
                      </td>

                      <td>
                        <span
                          className={`reminder-badge ${reminder.className}`}
                        >
                          {reminder.text}
                        </span>
                      </td>

                      <td>{getFollowUpSuggestion(job)}</td>

                      <td>{job.notes}</td>
                      <td>{job.notes}</td>

                      <td>
                       <FileUploadBox job={job} />
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-btn"
                            onClick={() => startEdit(job)}
                          >
                            Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() => deleteJob(job.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;