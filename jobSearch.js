import axios from "axios";
import { Resend } from "resend";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const SERP_API_KEY = process.env.SERP_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL = process.env.EMAIL;

const resend = new Resend(RESEND_API_KEY);
const CACHE_FILE = "./sentJobs.json"; // file to remember sent jobs

// 🔹 Load cache
function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// 🔹 Save cache
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// 🔍 Fetch jobs from SerpAPI
async function searchJobs() {
  console.log("🔍 Searching jobs...");

  const today = new Date().toISOString().split("T")[0];
  const query = `React OR MERN stack developer 4 years experience job India after:${today}`;
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
    query
  )}&engine=google_jobs&api_key=${SERP_API_KEY}`;

  const { data } = await axios.get(url);
  if (!data.jobs_results || data.jobs_results.length === 0) {
    console.log("⚠️ No jobs found today.");
    return [];
  }

  console.log(`✅ Found ${data.jobs_results.length} jobs`);
  return data.jobs_results.slice(0, 20); // limit to 20 for email readability
}

// 📧 Send email using Resend
async function sendEmail(htmlBody) {
  await resend.emails.send({
    from: "Daily Jobs <onboarding@resend.dev>",
    to: EMAIL,
    subject: "🧑‍💻 Daily React/MERN Job Updates",
    html: `<h2>Today's New Job Results</h2>${htmlBody}`,
  });
  console.log("📧 Email sent successfully via Resend!");
}

// 🧠 Main workflow
(async () => {
  try {
    const jobs = await searchJobs();
    const cache = loadCache();

    // Filter unseen jobs
    const newJobs = jobs.filter(
      (job) => !cache.includes(job.title + job.company_name)
    );

    if (newJobs.length === 0) {
      console.log("🟡 No new jobs found since last run.");
      process.exit(0);
    }

    console.log(`🆕 Found ${newJobs.length} new jobs.`);

    // Format email HTML
    const htmlList = newJobs
      .map(
        (job) => `
        <div style="margin-bottom:16px;">
          <b>${job.title}</b><br>
          ${job.company_name}<br>
          <i>${job.detected_extensions?.posted_at || "Recently posted"}</i><br>
          <a href="${job.share_link}" target="_blank">🔗 View Job</a>
        </div>
      `
      )
      .join("");

    await sendEmail(htmlList);

    // Save new jobs to cache
    const newCache = [
      ...cache,
      ...newJobs.map((job) => job.title + job.company_name),
    ].slice(-200); // keep last 200 to prevent file from growing too big
    saveCache(newCache);

    console.log("✅ Task done for the day");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    process.exit(0);
  }
})();
