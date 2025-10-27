import axios from "axios";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const SERP_API_KEY = process.env.SERP_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL = process.env.EMAIL;

const resend = new Resend(RESEND_API_KEY);

async function searchJobs() {
  console.log("🔍 Searching jobs...");

  const query = "React OR MERN stack developer 4 years experience job India";
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
    query
  )}&engine=google_jobs&api_key=${SERP_API_KEY}`;

  const { data } = await axios.get(url);

  if (!data.jobs_results || data.jobs_results.length === 0) {
    console.log("⚠️ No jobs found today.");
    return "<p>No jobs found today.</p>";
  }

  console.log(`✅ Found ${data.jobs_results.length} jobs`);

  const jobs = data.jobs_results.slice(0, 10);
  const htmlList = jobs
    .map(
      (job) => `
        <div style="margin-bottom:16px;">
          <b>${job.title}</b><br>
          ${job.company_name}<br>
          <a href="${job.share_link}" target="_blank">🔗 View Job</a>
        </div>
      `
    )
    .join("");

  return htmlList;
}

async function sendEmail(htmlBody) {
  await resend.emails.send({
    from: "Daily Jobs <onboarding@resend.dev>",
    to: EMAIL,
    subject: "🧑‍💻 Daily React/MERN Job Updates",
    html: `<h2>Today's Job Results</h2>${htmlBody}`,
  });

  console.log("📧 Email sent successfully via Resend!");
}

// 👇 Run once and exit
(async () => {
  try {
    const results = await searchJobs();
    await sendEmail(results);
    console.log("✅ Task done for the day");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    process.exit(0); // force exit so GitHub marks job as "completed"
  }
})();
