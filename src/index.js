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

const REVIEW_SECTION = `
<section class="reviews-shell section-tight" id="reviews" aria-labelledby="reviews-title">
  <style>
    #reviews { display:block; overflow:hidden; padding:56px; }
    #reviews .review-head { display:flex; gap:24px; align-items:end; justify-content:space-between; margin-bottom:24px; }
    #reviews .review-head p:not(.eyebrow) { margin-bottom:0; }
    #reviews .review-rail { display:flex; gap:16px; overflow-x:auto; scroll-snap-type:x mandatory; padding:4px 2px 14px; scrollbar-width:thin; -webkit-overflow-scrolling:touch; }
    #reviews .review-card { flex:0 0 min(78vw, 430px); scroll-snap-align:start; padding:24px; border:1px solid rgba(255,255,255,.14); border-radius:22px; background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025)); box-shadow:0 16px 42px rgba(0,0,0,.22); }
    #reviews .review-stars { margin:0 0 12px; color:#f4ad27; font-size:1.08rem; letter-spacing:.14em; }
    #reviews .review-card h3 { margin:0 0 10px; font-size:1.15rem; color:#fff; }
    #reviews .review-summary { margin:0; color:#d6e0e8; line-height:1.65; }
    #reviews details { margin-top:14px; }
    #reviews summary { color:#ffd77a; font-weight:850; cursor:pointer; list-style:none; }
    #reviews summary::-webkit-details-marker { display:none; }
    #reviews details p { margin:12px 0 0; color:#b8c6d1; line-height:1.65; }
    #reviews .review-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:20px; }
    @media (max-width:700px) {
      #reviews { padding:30px 20px; }
      #reviews .review-head { display:block; }
      #reviews .review-card { flex-basis:88vw; }
    }
  </style>
  <div class="review-head">
    <div>
      <p class="eyebrow">Customer reviews</p>
      <h2 id="reviews-title">Five-star feedback from 101 Detailers customers.</h2>
      <p>Swipe through customer feedback, then tap a card to read the full review.</p>
    </div>
  </div>
  <div class="review-rail" aria-label="Customer review carousel">
    <article class="review-card">
      <p class="review-stars" aria-label="5 out of 5 stars">★★★★★</p>
      <h3>101 Detailers Customer</h3>
      <p class="review-summary">Show-ready shine, compliments all night, and a finish worth showing off.</p>
      <details><summary>Read full review</summary><p>101 Detailers absolutely knocked it out of the park. My car looked incredible when they were finished. I went cruising that evening, got compliments everywhere I stopped, and ended up taking it to a local show looking better than it ever has. The attention to detail was unreal.</p></details>
    </article>
    <article class="review-card">
      <p class="review-stars" aria-label="5 out of 5 stars">★★★★★</p>
      <h3>101 Detailers Customer</h3>
      <p class="review-summary">Deep shine, a refreshed interior, and careful attention to the small details.</p>
      <details><summary>Read full review</summary><p>I’ve had my vehicle detailed before, but this was on another level. The paint had a deep shine, the interior looked brand new, and they caught little areas I didn’t even realize needed attention. You can tell they take pride in the work.</p></details>
    </article>
    <article class="review-card">
      <p class="review-stars" aria-label="5 out of 5 stars">★★★★★</p>
      <h3>Blake Sardella · Google Review</h3>
      <p class="review-summary">Made my car look like I just bought it.</p>
      <details><summary>Read full review</summary><p>This guy gets it done right! He’s made my baby look like I just bought it! Highly would get your details in with 101 detailers!!</p></details>
    </article>
    <article class="review-card">
      <p class="review-stars" aria-label="5 out of 5 stars">★★★★★</p>
      <h3>101 Detailers Customer</h3>
      <p class="review-summary">A hard-used truck brought back to a near-showroom look.</p>
      <details><summary>Read full review</summary><p>My truck gets used hard and was overdue for a serious detail. When 101 Detailers finished, it looked almost showroom new. They took their time, communicated well, and the final result was way beyond what I expected. Five stars all day.</p></details>
    </article>
  </div>
  <div class="review-actions">
    <a class="outline-button" href="/reviews.html">See more reviews</a>
    <a class="text-button" href="sms:+15419921237">Text for a quote</a>
  </div>
</section>`;

async function homepageWithReviewCarousel(request, env) {
  const assetResponse = await env.ASSETS.fetch(request);
  if (!assetResponse.ok) return assetResponse;
  const html = await assetResponse.text();
  const pattern = /<section\s+class="reviews-shell section-tight"\s+id="reviews"[\s\S]*?<\/section>/;
  const body = pattern.test(html) ? html.replace(pattern, REVIEW_SECTION) : html;
  const headers = new Headers(assetResponse.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(body, { status: assetResponse.status, headers });
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
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        return homepageWithReviewCarousel(request, env);
      }
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
