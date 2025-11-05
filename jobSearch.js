import axios from "axios";
import { Resend } from "resend";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const SERP_API_KEY = process.env.SERP_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL = process.env.EMAIL;

const resend = new Resend(RESEND_API_KEY);
const CACHE_FILE = "./sentJobs.json";

// 🧠 Load cache
function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) || [];
  } catch {
    return [];
  }
}

// 💾 Save cache
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache.slice(-300), null, 2));
}

// 🔍 Fetch jobs
async function searchJobs() {
  console.log("🔍 Searching jobs...");

  // fetch jobs from last 3 days (not only today)
  const date = new Date();
  date.setDate(date.getDate() - 3);
  const since = date.toISOString().split("T")[0];

  const query = `React OR MERN stack developer 4 years experience job India after:${since}`;
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
    query
  )}&engine=google_jobs&api_key=${SERP_API_KEY}`;

  const { data } = await axios.get(url);
  const jobs = data.jobs_results || [];
  console.log(`✅ Found ${jobs.length} results`);
  return jobs.slice(0, 20);
}

// 📧 Send email
async function sendEmail(htmlBody) {
  await resend.emails.send({
    from: "Daily Jobs <onboarding@resend.dev>",
    to: EMAIL,
    subject: "🧑‍💻 Fresh React/MERN Job Updates",
    html: `<h2>Latest Job Openings</h2>${htmlBody}`,
  });
  console.log("📧 Email sent successfully!");
}

// 🚀 Main
(async () => {
  try {
    const cache = loadCache();
    const jobs = await searchJobs();

    // Filter out already emailed jobs using share_link (more unique)
    let newJobs = jobs.filter(
      (job) => !cache.includes(job.share_link || job.title)
    );

    // If no new jobs, still send top 3 as a fallback
    if (newJobs.length === 0) {
      console.log("🟡 No brand new jobs, sending top 3 recent instead...");
      newJobs = jobs.slice(0, 3);
    } else {
      console.log(`🆕 Found ${newJobs.length} new jobs.`);
    }

    const htmlList = newJobs
      .map(
        (job) => `
        <div style="margin-bottom:16px;padding:10px;border-bottom:1px solid #ddd;">
          <h3>${job.title}</h3>
          <p><b>${job.company_name}</b></p>
          <p><i>${job.detected_extensions?.posted_at || "Recently posted"}</i></p>
          <p><a href="${job.share_link}" target="_blank">🔗 Apply Now</a></p>
        </div>
      `
      )
      .join("");

    await sendEmail(htmlList);

    // Update cache
    const updatedCache = [
      ...cache,
      ...newJobs.map((job) => job.share_link || job.title),
    ];
    saveCache(updatedCache);

    console.log("✅ Done for today!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    process.exit(0);
  }
})();
