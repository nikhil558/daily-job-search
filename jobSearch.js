import cron from "node-cron";
import nodemailer from "nodemailer";
import axios from "axios";

const SERP_API_KEY = "02ba8343cc786ddbd22532fac1e0cbd7ab51a986c1632eee97d754ccb337531c";
const EMAIL = "nikhilnikki558@gmail.com";
const APP_PASSWORD = "rizo rgkr xdky poic";

async function searchJobs() {
  console.log("🔍 Searching jobs...");

  const query = "React OR MERN stack developer 4 years experience job India";
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google_jobs&api_key=${SERP_API_KEY}`;

  const { data } = await axios.get(url);
  console.log(data.jobs_results.length)

  if (!data.jobs_results || data.jobs_results.length === 0) {
    console.log("⚠️ No jobs found today.");
    return "No jobs found today.";
  }

  const jobs = data.jobs_results.slice(0, 10);
  const htmlList = jobs
    .map((job) => {
      return `<p><b>${job.title}</b><br>${job.company_name}<br><a href="${job.share_link}">${job.share_link}</a></p>`;
    })
    .join("");

  return htmlList;
}

async function sendEmail(htmlBody) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL,
      pass: APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: EMAIL,
    to: EMAIL,
    subject: "🧑‍💻 Daily React/MERN Job Updates",
    html: `<h2>Today's Job Results</h2>${htmlBody}`,
  });

  console.log("📧 Email sent successfully!");
}

// Run every day at 12 PM (server time)
cron.schedule("0 12 * * *", async () => {
  const results = await searchJobs();
  await sendEmail(results);
  console.log("✅ Task done for the day");
});

// Optional: run once immediately for testing
(async () => {
  const results = await searchJobs();
  await sendEmail(results);
})();
