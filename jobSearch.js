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

// 🧮 Extract real platform from apply link
function extractPlatform(job) {
  const applyLink =
    job.apply_options?.[0]?.link || job.apply_link || job.share_link || "";
  if (!applyLink) return "Unknown Source";

  try {
    const url = new URL(applyLink);
    const domain = url.hostname.replace("www.", "").toLowerCase();

    if (domain.includes("linkedin")) return "LinkedIn";
    if (domain.includes("indeed")) return "Indeed";
    if (domain.includes("naukri")) return "Naukri";
    if (domain.includes("glassdoor")) return "Glassdoor";
    if (domain.includes("foundit")) return "Foundit (Monster)";
    if (domain.includes("hirist")) return "Hirist";
    if (domain.includes("angel")) return "AngelList";
    if (domain.includes("timesjobs")) return "TimesJobs";
    if (domain.includes("instahyre")) return "Instahyre";
    if (domain.includes("google")) return "Google Jobs";
    if (domain.includes("turing")) return "Turing";
    if (domain.includes("remoteok")) return "RemoteOK";
    return domain.split(".")[0]; // fallback (e.g., careers.tcs.com -> "careers")
  } catch {
    return "Unknown Source";
  }
}

// 🔍 Fetch jobs
async function searchJobs() {
  console.log("🔍 Searching jobs...");

  // Fetch jobs from last 3 days
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
  console.log("📧 Email sent successfully via Resend!");
}

// 🚀 Main
(async () => {
  try {
    const cache = loadCache();
    const jobs = await searchJobs();

    let newJobs = jobs.filter(
      (job) => !cache.includes(job.share_link || job.title)
    );

    if (newJobs.length === 0) {
      console.log("🟡 No brand new jobs, sending top 3 recent instead...");
      newJobs = jobs.slice(0, 3);
    } else {
      console.log(`🆕 Found ${newJobs.length} new jobs.`);
    }

    const htmlList = newJobs
      .map((job) => {
        const platform = extractPlatform(job);
        const posted =
          job.detected_extensions?.posted_at || "Recently posted";
        const link =
          job.apply_options?.[0]?.link || job.share_link || "#";

        return `
        <div style="margin-bottom:16px;padding:10px;border-bottom:1px solid #ddd;">
          <h3>${job.title}</h3>
          <p><b>${job.company_name}</b></p>
          <p>🗓️ ${posted}</p>
          <p>📍 Platform: <b>${platform}</b></p>
          <p><a href="${link}" target="_blank">🔗 Apply Now</a></p>
        </div>
      `;
      })
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
