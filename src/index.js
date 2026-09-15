const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function clean(value, maxLength) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function quoteText(fields) {
  return [
    "New quote request from 101detailers.com",
    "",
    `Name: ${fields.name}`,
    `Mobile number: ${fields.phone}`,
    `Vehicle: ${fields.vehicle}`,
    `Service: ${fields.service}`,
    `ZIP / service location: ${fields.location}`,
    `Preferred date: ${fields.date || "Not specified"}`,
    "",
    "Follow up with this customer by phone or text.",
  ].join("\n");
}

const CONVERSION_EVENTS = new Set([
  "call_click",
  "sms_click",
  "email_click",
  "quote_start",
  "quote_submit_success",
  "quote_submit_error",
  "install_click",
]);

function recordConversion(request, env, event, metadata = {}) {
  if (!env.CONVERSIONS || !CONVERSION_EVENTS.has(event)) return;

  const url = new URL(request.url);
  env.CONVERSIONS.writeDataPoint({
    blobs: [
      event,
      clean(metadata.path, 160) || "/",
      clean(metadata.source, 100) || "direct",
      clean(metadata.medium, 100) || "none",
      clean(metadata.campaign, 100) || "none",
      request.cf?.country || "unknown",
      request.cf?.region || "unknown",
      request.headers.get("User-Agent")?.includes("Mobile") ? "mobile" : "desktop",
    ],
    doubles: [1],
    indexes: [url.hostname],
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/conversion") {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed." }, 405, { Allow: "POST" });
      }

      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) {
        return json({ ok: false, error: "Invalid request origin." }, 403);
      }

      const length = Number(request.headers.get("Content-Length") || 0);
      if (length > 2_000) {
        return json({ ok: false, error: "Request is too large." }, 413);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid event." }, 400);
      }

      const event = clean(payload.event, 50);
      if (!CONVERSION_EVENTS.has(event)) {
        return json({ ok: false, error: "Unknown event." }, 400);
      }

      recordConversion(request, env, event, payload);
      return json({ ok: true });
    }

    if (url.pathname !== "/api/quote") {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed." }, 405, {
        Allow: "POST",
      });
    }

    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) {
      return json({ ok: false, error: "Invalid request origin." }, 403);
    }

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 12_000) {
      return json({ ok: false, error: "Request is too large." }, 413);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ ok: false, error: "Please check the form and try again." }, 400);
    }

    if (clean(form.get("website"), 200)) {
      return json({ ok: true, message: "Your request was received." });
    }

    const submittedAt = Number(form.get("submitted_at"));
    const age = Date.now() - submittedAt;
    if (!Number.isFinite(submittedAt) || age < 500 || age > 86_400_000) {
      return json({ ok: false, error: "Please refresh the page and try again." }, 400);
    }

    const fields = {
      name: clean(form.get("name"), 100),
      phone: clean(form.get("phone"), 40),
      vehicle: clean(form.get("vehicle"), 140),
      service: clean(form.get("service"), 80),
      location: clean(form.get("location"), 120),
      date: clean(form.get("date"), 30),
    };

    if (!fields.name || !fields.phone || !fields.vehicle || !fields.location) {
      return json({ ok: false, error: "Please complete all required fields." }, 400);
    }

    const phoneDigits = fields.phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return json({ ok: false, error: "Please enter a valid mobile number." }, 400);
    }

    try {
      await env.QUOTE_EMAIL.send({
        to: "rebsquared@gmail.com",
        from: { email: "info@101detailers.com", name: "101 Detailers Website" },
        subject: `New quote request: ${fields.vehicle}`,
        text: quoteText(fields),
      });
      recordConversion(request, env, "quote_submit_success", {
        path: url.pathname,
        source: clean(form.get("utm_source"), 100),
        medium: clean(form.get("utm_medium"), 100),
        campaign: clean(form.get("utm_campaign"), 100),
      });
    } catch (error) {
      console.error("Quote email failed", error);
      recordConversion(request, env, "quote_submit_error", { path: url.pathname });
      return json(
        { ok: false, error: "We could not send your request. Please call or text 541-992-1237." },
        502,
      );
    }

    return json({
      ok: true,
      message: "Thank you. We’ll contact you to confirm your quote.",
    });
  },
};
