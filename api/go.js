// Vercel Serverless Function
// File: /api/go.js  (public URL: /go, see vercel.json)
// Redirects to the official Aegis signup page with our referral code,
// so the code is not exposed in the HTML of our own pages.

const AEGIS_SIGNUP = "https://aegismir.com/#/signup";
const AEGIS_REFERRAL_CODE = process.env.AEGIS_REFERRAL_CODE || "36";

export default function handler(req, res) {
  res.statusCode = 302;
  res.setHeader("Location", `${AEGIS_SIGNUP}?d=${encodeURIComponent(AEGIS_REFERRAL_CODE)}`);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}
