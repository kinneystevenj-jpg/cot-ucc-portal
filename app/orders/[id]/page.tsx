'use client';
import React, { useEffect, useMemo, useState } from "react";

type EventRow = { id: string; at: string; status: string; message: string };

export default function OrderDetail({ params }: { params: { id: string } }) {
  const orderId = params.id;
  const [order, setOrder] = useState<any>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  async function refresh() {
    const [o, e, d] = await Promise.all([
      fetch(`/api/orders/${orderId}`, { cache: "no-store" }).then(r => r.json()),
      fetch(`/api/orders/${orderId}/events`, { cache: "no-store" }).then(r => r.json()),
      fetch(`/api/orders/${orderId}/deliverables`, { cache: "no-store" }).then(r => r.json()),
    ]);
    setOrder(o);
    setEvents(e);
    setDeliverables(d);
  }

  useEffect(() => { refresh(); }, [orderId]);

  useEffect(() => {
    const es = new EventSource(`/api/orders/${orderId}/stream`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener("order_event", (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        setEvents(prev => [data, ...prev]);
        setOrder((prev: any) => prev ? { ...prev, status: data.status, updatedAt: new Date().toISOString() } : prev);
      } catch {}
    });
    return () => es.close();
  }, [orderId]);

  const statusBadge = useMemo(() => {
    const s = order?.status ?? "…";
    return <span className="badge">{s}</span>;
  }, [order]);

  return (
    <div className="card">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap"}}>
        <div>
          <h2 style={{margin:"0 0 6px"}}>Order {orderId}</h2>
          <div className="muted" style={{fontSize:13}}>
            State: <b>{order?.stateCode ?? "…"}</b> • Deadline: <b>{order?.deadlineAt ? new Date(order.deadlineAt).toLocaleString() : "…"}</b> • Provider: <b>COT</b>
          </div>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          {statusBadge}
          <span className="badge" title="SSE connection">
            Live: {connected ? "connected" : "disconnected"}
          </span>
          <button className="secondary" onClick={refresh}>Refresh</button>
        </div>
      </div>

      <div className="hr" />

      <h3 style={{margin:"0 0 8px"}}>Deliverables</h3>
      {deliverables.length === 0 ? (
        <div className="muted">No deliverables yet.</div>
      ) : (
        <div className="row">
          {deliverables.map((d) => (
            <a key={d.id} className="badge" href={d.storageUrl} target="_blank" rel="noreferrer">
              {d.kind}
            </a>
          ))}
        </div>
      )}

      <div className="hr" />

      <h3 style={{margin:"0 0 8px"}}>Timeline</h3>
      <div className="timeline">
        {events.map(ev => (
          <div className="event" key={ev.id}>
            <div style={{display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap"}}>
              <span className="badge">{ev.status}</span>
              <span className="muted" style={{fontSize:12}}>{new Date(ev.at).toLocaleString()}</span>
            </div>
            <div style={{marginTop:8}}>{ev.message}</div>
          </div>
        ))}
        {events.length === 0 && <div className="muted">No events yet.</div>}
      </div>
    </div>
  );
}
