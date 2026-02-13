'use client';
import React, { useMemo, useState } from "react";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

type ItemType = "debtor_name_search" | "filing_number_search" | "copies" | "certified_search";

export default function HomePage() {
  const [stateCode, setStateCode] = useState("IL");
  const [deadlineAt, setDeadlineAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d.toISOString().slice(0,16);
  });
  const [rushLevel, setRushLevel] = useState<"standard"|"rush">("standard");
  const [types, setTypes] = useState<Record<ItemType, boolean>>({
    debtor_name_search: true,
    filing_number_search: false,
    copies: false,
    certified_search: false,
  });

  const [debtorName, setDebtorName] = useState("");
  const [filingNumber, setFilingNumber] = useState("");
  const [email, setEmail] = useState("user@example.com");

  const selectedItems = useMemo(() => {
    const items: any[] = [];
    if (types.debtor_name_search) items.push({ type: "debtor_name_search", payload: { debtorName } });
    if (types.filing_number_search) items.push({ type: "filing_number_search", payload: { filingNumber } });
    if (types.copies) items.push({ type: "copies", payload: { includeCopies: true } });
    if (types.certified_search) items.push({ type: "certified_search", payload: { certified: true } });
    return items;
  }, [types, debtorName, filingNumber]);

  async function createAndSubmit() {
    const body = {
      userId: email, // MVP: userId is email string
      stateCode,
      deadlineAt: new Date(deadlineAt).toISOString(),
      rushLevel,
      items: selectedItems,
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      alert("Create order failed: " + (await res.text()));
      return;
    }
    const created = await res.json();

    const res2 = await fetch(`/api/orders/${created.id}/submit`, { method: "POST" });
    if (!res2.ok) {
      alert("Submit failed: " + (await res2.text()));
      return;
    }
    window.location.href = `/orders/${created.id}`;
  }

  return (
    <div className="card">
      <h2 style={{marginTop:0}}>Create an order</h2>
      <p className="muted" style={{marginTop:-6}}>
        Select the state, deadline, and UCC search types. Submitting will send the job to COT and start status tracking.
      </p>

      <div className="row">
        <div className="field">
          <label>State</label>
          <select value={stateCode} onChange={(e)=>setStateCode(e.target.value)}>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Needed by</label>
          <input
            type="datetime-local"
            value={deadlineAt}
            onChange={(e)=>setDeadlineAt(e.target.value)}
          />
          <div className="muted" style={{fontSize:12}}>Stored as ISO timestamp (with timezone) on submit.</div>
        </div>

        <div className="field">
          <label>Rush</label>
          <select value={rushLevel} onChange={(e)=>setRushLevel(e.target.value as any)}>
            <option value="standard">Standard</option>
            <option value="rush">Rush</option>
          </select>
        </div>

        <div className="field">
          <label>User email (MVP identity)</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
      </div>

      <div className="hr" />

      <h3 style={{margin:"0 0 8px"}}>Search types</h3>
      <div className="row">
        {(["debtor_name_search","filing_number_search","copies","certified_search"] as ItemType[]).map(t => (
          <label key={t} className="badge" style={{cursor:"pointer", userSelect:"none"}}>
            <input
              type="checkbox"
              checked={types[t]}
              onChange={(e)=>setTypes(prev => ({...prev, [t]: e.target.checked}))}
              style={{marginRight:8}}
            />
            {t.replaceAll("_"," ")}
          </label>
        ))}
      </div>

      <div className="hr" />

      <h3 style={{margin:"0 0 8px"}}>Inputs</h3>
      <div className="row">
        {types.debtor_name_search && (
          <div className="field">
            <label>Debtor name</label>
            <input value={debtorName} onChange={(e)=>setDebtorName(e.target.value)} placeholder="ACME, Inc." />
          </div>
        )}
        {types.filing_number_search && (
          <div className="field">
            <label>Filing number</label>
            <input value={filingNumber} onChange={(e)=>setFilingNumber(e.target.value)} placeholder="UCC-1234567" />
          </div>
        )}
        {(types.copies || types.certified_search) && (
          <div className="field">
            <label>Options</label>
            <textarea readOnly value={JSON.stringify({ copies: types.copies, certified: types.certified_search }, null, 2)} />
          </div>
        )}
      </div>

      <div className="hr" />

      <h3 style={{margin:"0 0 8px"}}>Review</h3>
      <pre style={{whiteSpace:"pre-wrap", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:12, padding:12, fontSize:13}}>
{JSON.stringify({
  stateCode,
  deadlineAt,
  rushLevel,
  items: selectedItems
}, null, 2)}
      </pre>

      <div className="row" style={{justifyContent:"flex-end"}}>
        <button onClick={createAndSubmit}>Submit to COT</button>
      </div>
    </div>
  );
}
