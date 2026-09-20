import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

function environment() {
  const analytics = [];
  const emails = [];
  return {
    analytics,
    emails,
    env: {
      ASSETS: { fetch: () => new Response("asset") },
      CONVERSIONS: { writeDataPoint: (point) => analytics.push(point) },
      QUOTE_EMAIL: { send: async (message) => emails.push(message) },
    },
  };
}

test("serves static assets for non-API routes", async () => {
  const { env } = environment();
  const response = await worker.fetch(new Request("https://101detailers.com/"), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "asset");
});

test("records only allow-listed conversion events", async () => {
  const { env, analytics } = environment();
  const response = await worker.fetch(
    new Request("https://101detailers.com/api/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://101detailers.com" },
      body: JSON.stringify({ event: "call_click", path: "/", source: "direct" }),
    }),
    env,
  );
  assert.equal(response.status, 200);
  assert.equal(analytics.length, 1);
  assert.equal(analytics[0].blobs[0], "call_click");

  const rejected = await worker.fetch(
    new Request("https://101detailers.com/api/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "visitor_email", value: "private@example.com" }),
    }),
    env,
  );
  assert.equal(rejected.status, 400);
  assert.equal(analytics.length, 1);
});

test("sends a valid quote and records one server-side success", async () => {
  const { env, analytics, emails } = environment();
  const form = new FormData();
  form.set("name", "Test Customer");
  form.set("phone", "541-555-0100");
  form.set("vehicle", "2024 Test Vehicle");
  form.set("service", "Complete detail");
  form.set("location", "97439");
  form.set("submitted_at", String(Date.now() - 1_000));
  form.set("utm_source", "test");

  const response = await worker.fetch(
    new Request("https://101detailers.com/api/quote", {
      method: "POST",
      headers: { Origin: "https://101detailers.com" },
      body: form,
    }),
    env,
  );

  assert.equal(response.status, 200);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, "rebsquared@gmail.com");
  assert.equal(analytics.length, 1);
  assert.equal(analytics[0].blobs[0], "quote_submit_success");
});


test("injects Blake Sardella’s verified Google review on the homepage", async () => {
  const { env } = environment();
  env.ASSETS.fetch = () =>
    new Response(
      '<main><section class="reviews-shell section-tight" id="reviews">Placeholder</section></main>',
      { headers: { "Content-Type": "text/html" } },
    );

  const response = await worker.fetch(new Request("https://101detailers.com/"), env);
  const html = await response.text();

  assert.match(html, /Blake Sardella · Google Review/);
  assert.match(html, /This guy gets it done right!/);
  assert.ok(
    html.indexOf("Blake Sardella · Google Review") < html.indexOf("Show-ready shine"),
    "Blake’s verified review should be the first carousel card",
  );
  assert.doesNotMatch(html, /A complete reset inside and out/);
});
