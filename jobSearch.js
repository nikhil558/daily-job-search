import cron from "node-cron";
import axios from "axios";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

// --- Environment Variables ---
const SERP_API_KEY = process.env.SERP_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL = process.env.EMAIL;

// --- Initialize Resend client ---
const resend = new Resend(RESEND_API_KEY);

async function searchJobs() {
  console.log("🔍 Searching jobs...");

  try {
    const query = "React OR MERN stack developer 4 years experience job India";
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
      query
    )}&engine=google_jobs&api_key=${SERP_API_KEY}`;

    const { data } = await axios.get(url);
    const jobs = data.jobs_results || [];

    if (jobs.length === 0) {
      console.log("⚠️ No jobs found today.");
      return "<p>No jobs found today.</p>";
    }

    console.log(`✅ Found ${jobs.length} jobs`);

    const htmlList = jobs
      .slice(0, 10)
      .map((job, index) => {
        const title = job.title || "No title";
        const company = job.company_name || "Unknown company";
        const link = job.share_link || "#";

        return `
          <div style="margin-bottom: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
            <b>${index + 1}. ${title}</b><br>
            <i>${company}</i><br>
            <a href="${link}" target="_blank">🔗 View Job</a>
          </div>
        `;
      })
      .join("");

    return htmlList;
  } catch (err) {
    console.error("❌ Error fetching jobs:", err.message);
    return `<p>Error fetching jobs: ${err.message}</p>`;
  }
}

async function sendEmail(htmlBody) {
  try {
    await resend.emails.send({
      from: "Daily Jobs <onboarding@resend.dev>", // Or use your verified domain later
      to: EMAIL,
      subject: "🧑‍💻 Daily React/MERN Job Updates",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>🔥 Today's Job Results</h2>
          ${htmlBody}
          <p style="margin-top: 20px; font-size: 12px; color: gray;">
            — Automated job search powered by SerpAPI + Resend
          </p>
        </div>
      `,
    });

    console.log("📧 Email sent successfully via Resend!");
  } catch (err) {
    console.error("❌ Error sending email:", err.message);
  }
}

// 🕒 Schedule to run every day at 12 PM (IST)
cron.schedule(
  "0 12 * * *",
  async () => {
    console.log("⏰ Running daily job search...");
    const results = await searchJobs();
    await sendEmail(results);
    console.log("✅ Task done for the day");
  },
  { timezone: "Asia/Kolkata" }
);

// 🔥 Run immediately for testing (you can remove later)
(async () => {
  const results = await searchJobs();
  await sendEmail(results);
})();
