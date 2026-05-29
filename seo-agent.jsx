import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are an elite SEO Analyst Agent. When given a website URL or domain, you perform a comprehensive SEO analysis covering ALL of the following areas in one structured report:

1. **TECHNICAL AUDIT** — Site structure assumptions, common crawl issues (broken links, page speed, meta tags, canonical tags, mobile-friendliness, HTTPS, structured data)
2. **ON-PAGE AUDIT** — Title tags, meta descriptions, heading hierarchy (H1-H6), keyword usage, content quality signals, internal linking patterns
3. **COMPETITOR ANALYSIS** — Identify 3-5 likely competitors based on the niche, compare probable keyword positioning, content strategy differences, backlink profile differences
4. **BACKLINK INTELLIGENCE** — Backlink profile health assessment, toxic link risks, anchor text diversity, link building opportunities
5. **KEYWORD STRATEGY** — Primary keyword clusters, search intent mapping (informational/transactional/navigational), quick wins vs long-term targets, content gap opportunities
6. **PLAN OF ACTION** — A prioritized 30/60/90-day SEO roadmap with specific tasks, expected impact (High/Medium/Low), and effort level (Easy/Medium/Hard)

Format your response in clean markdown with clear sections, emoji icons per section, and actionable bullet points. Be specific and practical. If you cannot crawl the actual site, provide a thorough analysis based on the domain/niche with clearly labeled assumptions.

At the end, provide a concise SEO Health Score from 0-100 with a brief justification.

Always end with: "**Feedback Loop:** [2-3 specific follow-up actions the user should take next]"`;

const TypingIndicator = () => (
  <div style={{ display: "flex", gap: "6px", alignItems: "center", padding: "14px 18px" }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 8, height: 8, borderRadius: "50%", background: "#00ff88",
        animation: "bounce 1.2s ease-in-out infinite",
        animationDelay: `${i * 0.2}s`
      }} />
    ))}
  </div>
);

const ScoreBadge = ({ score }) => {
  const color = score >= 75 ? "#00ff88" : score >= 50 ? "#ffcc00" : "#ff4444";
  const label = score >= 75 ? "Healthy" : score >= 50 ? "Needs Work" : "Critical";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      background: `${color}15`, border: `1px solid ${color}40`,
      borderRadius: 12, padding: "8px 16px", marginTop: 12
    }}>
      <div style={{ position: "relative", width: 48, height: 48 }}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#ffffff10" strokeWidth="4"/>
          <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${(score / 100) * 125.6} 125.6`}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
          />
        </svg>
        <span style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 11, fontWeight: 700, color
        }}>{score}</span>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 11, color: "#888" }}>SEO Health Score</div>
      </div>
    </div>
  );
};

const parseScore = (text) => {
  const match = text.match(/SEO Health Score[:\s]+(\d+)/i) || text.match(/Score[:\s]+(\d+)\/100/i);
  return match ? parseInt(match[1]) : null;
};

const MessageContent = ({ content }) => {
  const score = parseScore(content);
  const lines = content.split('\n');
  return (
    <div style={{ lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ') || line.startsWith('# ')) {
          return <div key={i} style={{ fontSize: 16, fontWeight: 700, color: "#00ff88", marginTop: 20, marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>{line.replace(/^#+\s/, '')}</div>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <div key={i} style={{ fontWeight: 700, color: "#e8e8e8", marginTop: 14, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 8 }}>
              <span style={{ color: "#00ff88", flexShrink: 0, marginTop: 2 }}>▸</span>
              <span style={{ color: "#c8c8c8", fontSize: 14 }} dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8e8e8">$1</strong>') }} />
            </div>
          );
        }
        if (/^\d+\./.test(line)) {
          return <div key={i} style={{ color: "#c8c8c8", fontSize: 14, marginBottom: 4, paddingLeft: 8 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8e8e8">$1</strong>') }} />;
        }
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
        return <div key={i} style={{ color: "#c8c8c8", fontSize: 14, marginBottom: 3 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8e8e8">$1</strong>') }} />;
      })}
      {score && <ScoreBadge score={score} />}
    </div>
  );
};

export default function SEOAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const quickPrompts = [
    "Audit: shopify.com",
    "Analyse a SaaS startup: notion.so",
    "SEO review: fitpro.com (fitness coaching)",
  ];

  const saveKey = () => {
    if (tempKey.trim()) {
      setApiKey(tempKey.trim());
      setApiKeySaved(true);
      setShowKeyInput(false);
    }
  };

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    if (!apiKey) { setShowKeyInput(true); return; }
    setInput("");
    setStarted(true);

    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const geminiContents = newMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: geminiContents,
            generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
          }),
        }
      );

      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "API Error");
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: `Error: ${e.message}. Check your Gemini API key and try again.` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#080c10",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      display: "flex", flexDirection: "column", color: "#e0e0e0"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: #0d1117 }
        ::-webkit-scrollbar-thumb { background: #00ff8840; border-radius: 2px }
        textarea:focus, input:focus { outline: none }
        textarea { resize: none }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.015) 2px, rgba(0,255,136,0.015) 4px)"
      }} />

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #00ff8820", padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#0a0f14", position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #00ff88, #00cc6a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 0 20px #00ff8840"
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>SEO ANALYST AGENT</div>
            <div style={{ fontSize: 10, color: "#4488ff", letterSpacing: 2 }}>POWERED BY GOOGLE GEMINI · FREE</div>
          </div>
        </div>
        <button
          onClick={() => { setShowKeyInput(!showKeyInput); setTempKey(apiKey); }}
          style={{
            background: apiKeySaved ? "#00ff8815" : "#ff880015",
            border: `1px solid ${apiKeySaved ? "#00ff8840" : "#ff880040"}`,
            borderRadius: 8, padding: "6px 12px",
            color: apiKeySaved ? "#00ff88" : "#ff8844",
            fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5
          }}
        >{apiKeySaved ? "🔑 KEY SET" : "🔑 ADD KEY"}</button>
      </div>

      {/* API Key Panel */}
      {showKeyInput && (
        <div style={{
          background: "#0d1117", borderBottom: "1px solid #1e2833",
          padding: "16px 20px", animation: "slideDown 0.2s ease", zIndex: 9
        }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 8, letterSpacing: 0.5 }}>
              Get your free key → <span style={{ color: "#4488ff" }}>aistudio.google.com</span> → Get API Key → Create API Key
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                value={tempKey}
                onChange={e => setTempKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveKey()}
                placeholder="Paste your Gemini API key here (AIza...)"
                style={{
                  flex: 1, background: "#080c10", border: "1px solid #1e2833",
                  borderRadius: 8, padding: "10px 14px", color: "#e0e0e0",
                  fontSize: 13, fontFamily: "inherit"
                }}
              />
              <button onClick={saveKey} style={{
                background: "linear-gradient(135deg, #00ff88, #00cc6a)",
                border: "none", borderRadius: 8, padding: "10px 20px",
                color: "#000", fontWeight: 700, fontSize: 12,
                cursor: "pointer", fontFamily: "inherit"
              }}>SAVE</button>
            </div>
            <div style={{ fontSize: 10, color: "#333", marginTop: 8 }}>
              Key stays in your browser only — never stored on any server
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", maxWidth: 800, width: "100%", margin: "0 auto", position: "relative", zIndex: 1 }}>

        {!started && (
          <div style={{ animation: "fadeIn 0.6s ease" }}>
            <div style={{ textAlign: "center", padding: "32px 20px 28px" }}>
              <div style={{ fontSize: 48, marginBottom: 16, filter: "drop-shadow(0 0 20px #00ff8880)" }}>🔍</div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", fontFamily: "'Space Mono', monospace", margin: "0 0 8px" }}>
                Full-Stack <span style={{ color: "#00ff88" }}>SEO Analyst</span>
              </h1>
              <p style={{ color: "#555", fontSize: 12, maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.8 }}>
                One agent. Complete audit. Powered by Google Gemini — 100% free.
              </p>

              {!apiKeySaved && (
                <div style={{
                  background: "#0d1008", border: "1px solid #4488ff30",
                  borderRadius: 12, padding: "16px 20px", marginBottom: 28,
                  maxWidth: 460, margin: "0 auto 28px", textAlign: "left"
                }}>
                  <div style={{ fontSize: 12, color: "#4488ff", marginBottom: 10, fontWeight: 700 }}>Quick Setup (2 mins)</div>
                  {[
                    ["01", "Go to", "aistudio.google.com"],
                    ["02", "Click", "Get API Key → Create API Key"],
                    ["03", "Tap", "🔑 ADD KEY button above & paste"],
                  ].map(([num, label, action]) => (
                    <div key={num} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: "#4488ff", fontWeight: 700, width: 20 }}>{num}</span>
                      <span style={{ fontSize: 12, color: "#666" }}>{label} <span style={{ color: "#88aaff" }}>{action}</span></span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 28 }}>
                {["🕷️ Technical Audit","📄 On-Page SEO","🏆 Competitors","🔗 Backlinks","🎯 Keywords","📅 90-Day Plan"].map(c => (
                  <span key={c} style={{
                    fontSize: 11, padding: "5px 12px", borderRadius: 20,
                    border: "1px solid #00ff8830", color: "#00ff8890", background: "#00ff8808"
                  }}>{c}</span>
                ))}
              </div>

              <div style={{ fontSize: 10, color: "#333", marginBottom: 10, letterSpacing: 1 }}>TRY AN EXAMPLE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 440, margin: "0 auto" }}>
                {quickPrompts.map(p => (
                  <button key={p} onClick={() => sendMessage(p)} style={{
                    background: "#0d1117", border: "1px solid #1e2a1e",
                    borderRadius: 10, padding: "11px 16px", color: "#7aaa7a",
                    fontSize: 12, cursor: "pointer", textAlign: "left",
                    transition: "all 0.2s", fontFamily: "inherit"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#00ff8850"; e.currentTarget.style.color = "#00ff88"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2a1e"; e.currentTarget.style.color = "#7aaa7a"; }}
                  >▶ {p}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: 20, animation: "fadeIn 0.4s ease",
            display: "flex", flexDirection: "column",
            alignItems: msg.role === "user" ? "flex-end" : "flex-start"
          }}>
            {msg.role === "user" ? (
              <div style={{
                background: "linear-gradient(135deg, #003320, #001a10)",
                border: "1px solid #00ff8830", borderRadius: "16px 16px 4px 16px",
                padding: "12px 16px", maxWidth: "80%", fontSize: 13, color: "#00ff88"
              }}>{msg.content}</div>
            ) : (
              <div style={{
                background: "#0d1117", border: "1px solid #1e2833",
                borderRadius: "4px 16px 16px 16px", padding: "16px 20px", width: "100%"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #1e2833" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #00ff88, #00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚡</div>
                  <span style={{ fontSize: 11, color: "#00ff88", letterSpacing: 1 }}>SEO AGENT REPORT</span>
                  <span style={{ fontSize: 10, color: "#333", marginLeft: "auto" }}>Gemini 1.5 Flash</span>
                </div>
                <MessageContent content={msg.content} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ animation: "fadeIn 0.3s ease", background: "#0d1117", border: "1px solid #1e2833", borderRadius: "4px 16px 16px 16px", display: "inline-block", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #00ff88, #00cc6a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚡</div>
              <span style={{ fontSize: 11, color: "#00ff88", letterSpacing: 1, animation: "pulse 1.5s infinite" }}>RUNNING SEO ANALYSIS...</span>
            </div>
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid #00ff8815", padding: "14px 20px", background: "#0a0f14", position: "sticky", bottom: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1, background: "#0d1117", border: "1px solid #1e2833", borderRadius: 14, padding: "12px 16px" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={apiKeySaved ? "Enter a URL or domain to audit..." : "Add your free Gemini API key first (tap 🔑 above)"}
              rows={1}
              style={{ width: "100%", background: "transparent", border: "none", color: "#e0e0e0", fontSize: 13, fontFamily: "inherit", lineHeight: 1.6 }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44, borderRadius: 12, border: "none",
              background: input.trim() && !loading ? "linear-gradient(135deg, #00ff88, #00cc6a)" : "#1a2a1a",
              color: input.trim() && !loading ? "#000" : "#334433",
              fontSize: 18, cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", flexShrink: 0,
              boxShadow: input.trim() && !loading ? "0 0 20px #00ff8840" : "none"
            }}
          >⚡</button>
        </div>
      </div>
    </div>
  );
}
