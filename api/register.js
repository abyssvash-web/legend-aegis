// Vercel Serverless Function
// File: /api/register.js
// Handles both ASTRAL registration and MIR4 AEGIS (send_code + register)

const REGISTER_PAGE =
  "https://api.astymir.com/passport/register?promo=AYC4255C0FD3FC";

const REGISTER_API = "https://api.astymir.com/auth/register";
const TURNSTILE_VERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const AEGIS_MAIL_API = "https://aegismir.com/api/v1/web/mail";
const AEGIS_REGISTER_API = "https://aegismir.com/api/v1/web/register";
const AEGIS_REFERRAL_CODE = "36";

const PROMO = new URL(REGISTER_PAGE).searchParams.get("promo") || "";

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function field(res, message) {
  return send(res, 400, { ok: false, kind: "field", message });
}

function system(res) {
  return send(res, 500, { ok: false, kind: "system" });
}

function extractErrorMessage(data) {
  const pick = (value) => {
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = pick(item);
        if (found) return found;
      }
    }
    if (value && typeof value === "object") {
      for (const item of Object.values(value)) {
        const found = pick(item);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    pick(data && data.error) ||
    pick(data && data.errors) ||
    pick(data && data.message) ||
    pick(data && data.msg)
  );
}

function getCookieHeader(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0].trim())
      .filter(Boolean)
      .join("; ");
  }

  const single = response.headers.get("set-cookie");
  return single ? single.split(";")[0].trim() : "";
}

async function handleAegis(req, res, body) {
  const action = typeof body.action === "string" ? body.action.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  const allowedDomains = ["@gmail.com", "@outlook.com", "@qq.com"];
  const isValidDomain = email && allowedDomains.some((d) => email.endsWith(d));

  if (!isValidDomain) {
    return field(
      res,
      "Invalid email domain. Only @gmail.com, @outlook.com, and @qq.com are allowed."
    );
  }

  // 1) Send Email Verification Code
  if (action === "send_code") {
    try {
      const mailRes = await fetch(AEGIS_MAIL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/plain, */*",
          Origin: "https://aegismir.com",
          Referer: "https://aegismir.com/",
        },
        body: new URLSearchParams({
          type: "REGISTER",
          email,
        }),
      });

      // Read raw text first so we can log what Aegis really returned (JSON, HTML block page, etc.)
      const rawText = await mailRes.text().catch(() => "");
      let data = null;
      try { data = JSON.parse(rawText); } catch (_) { data = null; }

      // Keep Aegis session cookie so the code can be matched at register time
      const sess = getCookieHeader(mailRes);
      console.log(
        "Aegis send_code → HTTP", mailRes.status,
        "| json:", data ? "yes" : "no",
        "| cookie:", sess ? "yes" : "none",
        "| body:", rawText.slice(0, 300).replace(/\s+/g, " ")
      );

      if (
        mailRes.ok &&
        data &&
        (data.code === 0 || data.code === 200 || data.status === 1 || data.ok === true || data.success === true)
      ) {
        return send(res, 200, {
          ok: true,
          message: "Code sent. Please check your inbox",
          sess,
        });
      }

      const errMsg = extractErrorMessage(data);
      if (errMsg) {
        return field(res, errMsg);
      }

      if (mailRes.ok && data) {
        return send(res, 200, { ok: true, message: "Code sent. Please check your inbox", sess });
      }

      if (mailRes.status === 429) {
        return field(res, "Too many requests. Please wait a few minutes before sending another code.");
      }
      return field(res, `Failed to send verification code (HTTP ${mailRes.status}). Please try again.`);
    } catch (err) {
      console.error("Aegis mail API error:", err);
      return field(res, "Unable to reach Aegis mail server.");
    }
  }

  // 2) Submit MIR4 AEGIS Account Registration
  if (action === "register") {
    const account = typeof body.account === "string" ? body.account.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const password2 = typeof body.password2 === "string" ? body.password2 : "";
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    const ecode = typeof body.ecode === "string" ? body.ecode.trim() : "";
    const d = typeof body.d === "string" && body.d.trim() ? body.d.trim() : AEGIS_REFERRAL_CODE;

    if (!/^[A-Za-z0-9]{6,10}$/.test(account)) {
      return field(res, "Account must be 6-10 letters or numbers.");
    }
    if (password.length < 6 || password.length > 14) {
      return field(res, "Password must be 6-14 characters.");
    }
    if (password !== password2) {
      return field(res, "Passwords do not match.");
    }
    if (!question || !answer) {
      return field(res, "Security question and answer are required.");
    }
    if (!ecode) {
      return field(res, "Email verification code is required.");
    }

    // Turnstile token is validated by aegismir.com (their site key + secret)
    const tsToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
    if (!tsToken) {
      return field(res, "Captcha verification is required.");
    }

    // Session cookie from send_code (needed for Aegis to match the email code)
    const sess = typeof body.sess === "string" ? body.sess.trim() : "";

    try {
      const regRes = await fetch(AEGIS_REGISTER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/plain, */*",
          Origin: "https://aegismir.com",
          Referer: "https://aegismir.com/",
          ...(sess ? { Cookie: sess } : {}),
        },
        body: new URLSearchParams({
          account,
          password,
          password2,
          question,
          answer,
          ecode,
          "cf-turnstile-response": tsToken,
          "g-recaptcha-response": tsToken,
          d,
          email,
        }),
      });

      const data = await regRes.json().catch(() => null);

      if (
        regRes.ok &&
        data &&
        (data.code === 0 || data.code === 200 || data.status === 1 || data.ok === true || data.success === true)
      ) {
        return send(res, 200, {
          ok: true,
          message: "Account registered successfully! You can now log in to Legend Aegis.",
        });
      }

      const errMsg = extractErrorMessage(data);
      if (errMsg) {
        return field(res, errMsg);
      }

      return field(res, "Registration failed. Please verify your details and verification code.");
    } catch (err) {
      console.error("Aegis register API error:", err);
      return field(res, "Unable to reach Aegis registration server.");
    }
  }

  return field(res, "Invalid action.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { ok: false, kind: "system" });
  }

  const body = req.body || {};

  // Route MIR4 AEGIS requests
  if (body.game === "AEGIS") {
    return handleAegis(req, res, body);
  }

  // Existing ASTRAL registration flow
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim() : "";
  const password =
    typeof body.password === "string" ? body.password : "";
  const turnstileToken =
    typeof body.turnstileToken === "string" ? body.turnstileToken : "";

  if (!username || !email || !password) {
    return field(res, "Missing required fields.");
  }

  if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
    return field(
      res,
      "Username must be 3–32 characters: letters, numbers, underscore."
    );
  }

  if (password.length < 6) {
    return field(res, "Password must be at least 6 characters.");
  }

  if (!turnstileToken) {
    return field(res, "Captcha verification is required.");
  }

  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    console.error("TURNSTILE_SECRET is not configured in Vercel.");
    return system(res);
  }

  try {
    const tsRes = await fetch(TURNSTILE_VERIFY, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret,
        response: turnstileToken,
      }),
    });

    const tsData = await tsRes.json().catch(() => null);

    if (!tsRes.ok || !tsData || !tsData.success) {
      return field(
        res,
        "Captcha verification failed. Please try again."
      );
    }

    const stepA = await fetch(REGISTER_PAGE, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });

    const location = stepA.headers.get("location");
    if (!location) {
      console.error("Astral referral page did not return a redirect location.");
      return system(res);
    }

    const ssid = new URL(location, REGISTER_PAGE).searchParams.get("ssid");
    if (!ssid) {
      console.error("Astral referral redirect did not contain ssid.");
      return system(res);
    }

    const cookieHeader = getCookieHeader(stepA);

    const headers = {
      "content-type": "application/json",
    };

    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }

    const stepB = await fetch(REGISTER_API, {
      method: "POST",
      headers,
      body: JSON.stringify({
        username,
        email,
        password,
        ssid,
        promo: PROMO,
      }),
      cache: "no-store",
    });

    if (!stepB.ok) {
      console.error("Astral auth API returned HTTP", stepB.status);
      return system(res);
    }

    const data = await stepB.json().catch(() => null);

    if (
      data &&
      data.status === 1 &&
      data.error == null
    ) {
      return send(res, 200, { ok: true });
    }

    const message = extractErrorMessage(data);

    if (message) {
      return field(res, message);
    }

    return system(res);
  } catch (error) {
    console.error("Astral registration error:", error);
    return system(res);
  }
}
