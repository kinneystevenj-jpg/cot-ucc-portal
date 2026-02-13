import "./globals.css";
import React from "react";

export const metadata = {
  title: "COT UCC Portal",
  description: "Order UCC searches and filings through Circle of Trust (COT) with live status tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <div className="topbar">
            <div>
              <div style={{fontSize:18,fontWeight:700}}>COT UCC Portal</div>
              <div className="muted" style={{fontSize:13}}>Create an order → submit to COT → track status in real time</div>
            </div>
            <a className="badge" href="/">New order</a>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
