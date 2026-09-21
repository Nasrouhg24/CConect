"use client";
// TEMPORAIRE — QA du système de logos. À supprimer après vérification.
import { useState } from "react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { domainFromWebsite } from "@/lib/company-domain";
import { LOGO_CASES } from "../../../tests/logo-corpus";

export function QaLogos() {
  const [domain, setDomain] = useState("cconnect-unknown-company-4x7q.com");
  return (
    <div className="p-6">
      <div id="grid" className="grid grid-cols-6 gap-4">
        {LOGO_CASES.map((c) => (
          <div key={c.name} data-case={c.name} data-expect={c.expect} className="flex items-center gap-2">
            <CompanyLogo name={c.name} domain={domainFromWebsite(c.website)} />
            <span className="text-meta">{c.name}</span>
          </div>
        ))}
      </div>
      <div data-case="switch" className="mt-6 flex items-center gap-2">
        <CompanyLogo name="Switch" domain={domain} size="lg" />
        <button id="switch" onClick={() => setDomain("microsoft.com")}>switch</button>
      </div>
      <div data-case="manual-broken" className="mt-6 flex items-center gap-2">
        <CompanyLogo name="Manual" domain="google.com" logoUrl="https://img.logo.dev/cconnect-unknown-company-4x7q.com?fallback=404" size="lg" />
      </div>
    </div>
  );
}
