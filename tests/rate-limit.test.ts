import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRateLimit, rateLimitMessage } from "../src/lib/rate-limit.ts";

const RULE = { limit: 3, windowMs: 1000 };

test("les premières écritures passent, la suivante est refusée", () => {
  const key = `k-${Math.random()}`;
  const now = 1_000_000;

  for (let i = 0; i < RULE.limit; i += 1) {
    assert.equal(checkRateLimit(key, RULE, now).ok, true, `écriture ${i + 1}`);
  }

  const blocked = checkRateLimit(key, RULE, now);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
});

test("la fenêtre glisse : après expiration, on repasse", () => {
  const key = `k-${Math.random()}`;
  const now = 2_000_000;

  for (let i = 0; i < RULE.limit; i += 1) checkRateLimit(key, RULE, now);
  assert.equal(checkRateLimit(key, RULE, now).ok, false);

  // Juste après la fin de la fenêtre, les anciens coups ne comptent plus.
  assert.equal(checkRateLimit(key, RULE, now + RULE.windowMs + 1).ok, true);
});

test("les compteurs sont indépendants d'une clé à l'autre", () => {
  const a = `a-${Math.random()}`;
  const b = `b-${Math.random()}`;
  const now = 3_000_000;

  for (let i = 0; i < RULE.limit; i += 1) checkRateLimit(a, RULE, now);
  assert.equal(checkRateLimit(a, RULE, now).ok, false);
  assert.equal(checkRateLimit(b, RULE, now).ok, true, "b ne doit pas être puni pour a");
});

test("le message indique un délai lisible", () => {
  assert.match(rateLimitMessage(1), /1 seconde\./);
  assert.match(rateLimitMessage(42), /42 secondes\./);
});
