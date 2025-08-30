"use client";

import React, { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const getBearer = () =>
  (typeof window !== "undefined" && localStorage.getItem("token")) || "";

async function authed(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const t = getBearer();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  return fetch(`${API}${path}`, { ...init, headers });
}

type Session = {
  id: string;
  createdAt: string;
  ip?: string | null;
  ua?: string | null;
  revokedAt?: string | null;
};

export default function SecurityPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const t = (s: string) => s; // simple stub for i18n

  async function refresh() {
    try {
      const r = await authed("/api/sessions");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as Session[];
      setSessions(data || []);
      setMsg(null);
    } catch {
      setMsg("Failed to load sessions");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function revoke(id: string) {
    await authed("/api/sessions/revoke", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    refresh();
  }

  async function revokeAll() {
    await authed("/api/sessions/revoke_all", { method: "POST" });
    refresh();
  }

  return (
    <main className="p-6 space-y-6" aria-labelledby="securityHeading">
      <h1 className="text-2xl font-semibold" id="securityHeading">
        {t("Security")}
      </h1>

      <section className="space-y-2">
        <h3 className="text-lg font-medium">{t("Active Sessions")}</h3>

        <button
          className="btn"
          onClick={revokeAll}
          aria-label="sign out everywhere"
        >
          {t("Sign out everywhere")}
        </button>

        {msg && <div className="muted mt-2">{msg}</div>}

        <ul className="divide-y divide-gray-700 mt-2" role="list">
          {sessions.map((s) => (
            <li key={s.id} className="flex justify-between py-2" role="listitem">
              <span>
                {new Date(s.createdAt).toLocaleString()} — {s.ip || "ip?"} —{" "}
                {(s.ua || "").slice(0, 80)}
              </span>
              {!s.revokedAt ? (
                <button
                  className="btn"
                  onClick={() => revoke(s.id)}
                  aria-label={`revoke session ${s.id}`}
                >
                  Revoke
                </button>
              ) : (
                <i>revoked</i>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
