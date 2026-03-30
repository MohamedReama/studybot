import { useState, useEffect, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const OR_MODEL = "google/gemini-2.0-flash-001"; // gratuit sur OpenRouter

const LEVELS = ["6ème","5ème","4ème","3ème","Seconde","Première","Terminale"];

const SUBJECTS = [
  { id:"physique-chimie", label:"Physique-Chimie", icon:"⚗️", available:true,  color:"#4ade80" },
  { id:"maths",           label:"Mathématiques",   icon:"📐", available:false, color:"#60a5fa" },
  { id:"svt",             label:"SVT",              icon:"🌿", available:false, color:"#34d399" },
  { id:"histoire",        label:"Histoire-Géo",    icon:"🌍", available:false, color:"#f59e0b" },
];

const CHAPTERS = {
  "6ème":      ["Mélanges et corps purs","États de la matière","Mesures et grandeurs","La lumière","L'électricité"],
  "5ème":      ["Atomes et molécules","Les métaux","Signaux lumineux","Courant électrique","L'air"],
  "4ème":      ["Réactions chimiques","Propriétés des matériaux","Optique géométrique","Électricité","Pression"],
  "3ème":      ["Chimie organique","Corps purs et mélanges","Électricité et magnétisme","Ondes","Réactions nucléaires"],
  "Seconde":   ["Chimie des solutions","Mouvements et interactions","Ondes et signaux","Énergie","Structure de la matière"],
  "Première":  ["Chimie organique","Cinétique chimique","Mécanique","Thermodynamique","Optique ondulatoire"],
  "Terminale": ["Chimie des équilibres","Électrochimie","Mécanique avancée","Physique quantique","Relativité"],
};

const STEP_CONFIG = [
  { id:"rappel",   label:"Rappel de cours", icon:"📚", color:"#4ade80" },
  { id:"indice1",  label:"1er indice",       icon:"💡", color:"#facc15" },
  { id:"indice2",  label:"2ème indice",      icon:"🔍", color:"#fb923c" },
  { id:"solution", label:"Solution",         icon:"✅", color:"#60a5fa" },
];

// ─── OPENROUTER API (CORS-safe) ───────────────────────────────────────────────

async function callAI(apiKey, systemPrompt, userMessage, imageBase64 = null) {
  const userContent = imageBase64
    ? [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        { type: "text", text: userMessage }
      ]
    : userMessage;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://studybot.app",
        "X-Title": "StudyBot"
      },
      body: JSON.stringify({
        model: OR_MODEL,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ]
      })
    });
    const data = await res.json();
    if (!res.ok) return `❌ Erreur ${res.status} : ${data?.error?.message || "Vérifie ta clé API."}`;
    return data?.choices?.[0]?.message?.content || "Réponse vide.";
  } catch (e) {
    return `❌ Connexion échouée : ${e.message}`;
  }
}

async function testKey(apiKey) {
  const res = await callAI(apiKey, "Tu es un assistant.", "Réponds uniquement: OK");
  return { ok: !res.startsWith("❌"), msg: res };
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const G = {
  bg: "#060a14", bg2: "#0d1526", bg3: "#111d33",
  border: "rgba(255,255,255,0.07)", border2: "rgba(255,255,255,0.13)",
  green: "#4ade80", yellow: "#facc15", orange: "#fb923c", blue: "#60a5fa", pink: "#f472b6",
  text: "#f1f5f9", muted: "#64748b", sub: "#94a3b8",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:${G.bg};font-family:'Outfit',sans-serif;color:${G.text};-webkit-font-smoothing:antialiased;}
  input,textarea,button{font-family:'Outfit',sans-serif;}
  input:-webkit-autofill{-webkit-box-shadow:0 0 0 100px ${G.bg2} inset!important;-webkit-text-fill-color:${G.text}!important;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  .fade{animation:fadeUp .4s ease forwards;}
  .pulse{animation:pulse 2s infinite;}
  .spin{animation:spin .7s linear infinite;}
  input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#facc15;cursor:pointer;}
`;

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────

function Spinner({ color = G.green, size = 18 }) {
  return <div className="spin" style={{ width: size, height: size, borderRadius: "50%", border: `2px solid rgba(255,255,255,0.08)`, borderTopColor: color, flexShrink: 0 }} />;
}

function Btn({ children, onClick, variant = "primary", disabled, full, style = {} }) {
  const variants = {
    primary: { background: `linear-gradient(135deg,${G.green},#22c55e)`, color: "#052e16", border: "none" },
    ghost:   { background: "rgba(255,255,255,0.04)", color: G.sub, border: `1px solid ${G.border2}` },
    yellow:  { background: `linear-gradient(135deg,${G.yellow},${G.orange})`, color: "#422006", border: "none" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "13px 20px", borderRadius: 13, fontWeight: 700, fontSize: 14,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
      width: full ? "100%" : undefined, transition: "opacity .2s, transform .1s",
      ...variants[variant], ...style
    }}>
      {children}
    </button>
  );
}

function Card({ children, style = {}, color }) {
  return (
    <div style={{
      background: G.bg2, borderRadius: 16, padding: 18,
      border: `1px solid ${color ? color + "33" : G.border}`,
      boxShadow: color ? `0 0 24px ${color}0a` : undefined, ...style
    }}>
      {children}
    </div>
  );
}

function FInput({ label, value, onChange, type = "text", placeholder, icon }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ color: G.muted, fontSize: 11, fontWeight: 700, letterSpacing: ".6px", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>}
      <div style={{ position: "relative" }}>
        {icon && <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15 }}>{icon}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{ width: "100%", background: G.bg3, border: `1.5px solid ${f ? G.green : G.border}`, borderRadius: 11, color: G.text, fontSize: 14, padding: icon ? "11px 12px 11px 40px" : "11px 12px", outline: "none", transition: "border-color .2s" }} />
      </div>
    </div>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const r = 52, circ = 2 * Math.PI * r;
  const color = score >= 80 ? G.green : score >= 50 ? G.yellow : score >= 25 ? G.orange : "#f87171";
  const label = score >= 80 ? "Expert 🏆" : score >= 60 ? "Avancé ⭐" : score >= 40 ? "Intermédiaire 📈" : score >= 20 ? "Débutant 💪" : "À travailler 🔥";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 136, height: 136 }}>
        <svg width="136" height="136" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
          <circle cx="68" cy="68" r={r} fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 34, color, lineHeight: 1 }}>{score}</span>
          <span style={{ color: G.muted, fontSize: 11 }}>/100</span>
        </div>
      </div>
      <span style={{ color, fontWeight: 700, fontSize: 14 }}>{label}</span>
    </div>
  );
}

// ─── SCREEN: API KEY SETUP ────────────────────────────────────────────────────

function ApiKeyScreen({ onSave }) {
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const test = async () => {
    if (!key.trim()) { setError("Colle ta clé API ici."); return; }
    setTesting(true); setError("");
    const r = await testKey(key.trim());
    if (r.ok) { onSave(key.trim()); }
    else { setError(r.msg); }
    setTesting(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      background: `radial-gradient(ellipse at 30% 20%, rgba(74,222,128,0.06) 0%, transparent 55%), ${G.bg}` }}>
      <div className="fade" style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px" }}>🔗</div>
          <h1 style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-.5px" }}>Connexion OpenRouter</h1>
          <p style={{ color: G.muted, fontSize: 13, marginTop: 5 }}>Proxy API gratuit · Compatible navigateur · Gemini 2.0 Flash</p>
        </div>

        <Card style={{ padding: 26 }}>
          {/* Steps */}
          <div style={{ background: G.bg3, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <p style={{ color: G.sub, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📋 Obtenir ta clé gratuite (3 min)</p>
            {[
              ["1", "Va sur", "openrouter.ai", "https://openrouter.ai/keys"],
              ["2", "Crée un compte gratuit (Google ou email)", "", ""],
              ["3", "Clique "Create Key" → copie la clé sk-or-...", "", ""],
            ].map(([n, a, link, href]) => (
              <div key={n} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <span style={{ background: G.green, color: "#052e16", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{n}</span>
                <span style={{ color: G.sub, fontSize: 13 }}>{a} {link && <a href={href} target="_blank" rel="noreferrer" style={{ color: G.green, textDecoration: "none", fontWeight: 600 }}>{link}</a>}</span>
              </div>
            ))}
          </div>

          <div style={{ background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:10, padding:"10px 12px", marginBottom:14 }}>
            <p style={{ color:G.green, fontSize:12, lineHeight:1.5 }}>✅ OpenRouter autorise les appels depuis le navigateur (pas de blocage CORS). Gemini 2.0 Flash est <strong>gratuit</strong>.</p>
          </div>

          <FInput label="Clé API OpenRouter" value={key} onChange={setKey} placeholder="sk-or-v1-..." icon="🔑" type="password" />

          {error && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
              <p style={{ color: "#f87171", fontSize: 12 }}>{error}</p>
            </div>
          )}

          <Btn onClick={test} disabled={testing} full>
            {testing ? <><Spinner color="#052e16" size={16} /> Test en cours…</> : "✅ Valider et continuer"}
          </Btn>

          <p style={{ color: G.muted, fontSize: 11, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
            Ta clé est stockée localement sur ton appareil uniquement.<br />Elle n'est jamais envoyée à nos serveurs.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ─── SCREEN: AUTH ─────────────────────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");

  const submit = async () => {
    if (!email || !password) { setError("Remplis tous les champs."); return; }
    setLoading(true); setError("");
    await new Promise(r => setTimeout(r, 700));
    const user = { email, name: name || email.split("@")[0], avatar: (name || email)[0].toUpperCase() };
    try { localStorage.setItem("sb_user", JSON.stringify(user)); } catch {}
    onLogin(user); setLoading(false);
  };

  const googleLogin = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = { email: "demo@gmail.com", name: "Compte Google", avatar: "G", google: true };
    try { localStorage.setItem("sb_user", JSON.stringify(user)); } catch {}
    onLogin(user); setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      background: `radial-gradient(ellipse at 70% 80%, rgba(96,165,250,0.05) 0%, transparent 55%), ${G.bg}` }}>
      <div className="fade" style={{ maxWidth: 390, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, background: `linear-gradient(135deg,${G.green},#22c55e)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px" }}>🧪</div>
          <h1 style={{ fontWeight: 900, fontSize: 26, letterSpacing: "-.5px" }}>StudyBot</h1>
          <p style={{ color: G.muted, fontSize: 13, marginTop: 4 }}>Ton assistant révision intelligent</p>
        </div>
        <Card style={{ padding: 26 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, background: G.bg3, borderRadius: 11, padding: 4, marginBottom: 22 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ padding: "9px", borderRadius: 9, border: "none", background: mode === m ? G.bg2 : "transparent", color: mode === m ? G.text : G.muted, fontWeight: mode === m ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all .2s" }}>
                {m === "login" ? "Se connecter" : "S'inscrire"}
              </button>
            ))}
          </div>
          {mode === "signup" && <FInput label="Prénom" value={name} onChange={setName} placeholder="Sofia" icon="👤" />}
          <FInput label="Email" type="email" value={email} onChange={setEmail} placeholder="ton@email.com" icon="✉️" />
          <FInput label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" icon="🔒" />
          {error && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 10, textAlign: "center" }}>{error}</p>}
          <Btn onClick={submit} disabled={loading} full style={{ marginBottom: 12 }}>
            {loading ? <><Spinner color="#052e16" size={16} />{mode === "login" ? "Connexion…" : "Création…"}</> : mode === "login" ? "🚀 Se connecter" : "✨ Créer mon compte"}
          </Btn>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: G.border }} /><span style={{ color: G.muted, fontSize: 11 }}>ou</span><div style={{ flex: 1, height: 1, background: G.border }} />
          </div>
          <button onClick={googleLogin} disabled={loading} style={{ width: "100%", padding: "11px", background: "rgba(255,255,255,0.03)", border: `1px solid ${G.border2}`, borderRadius: 11, color: G.text, fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.6 0-14.2 4.1-17.7 10.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.4l-6.6 5C9.9 39.9 16.5 44 24 44z" /><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.7 2-2 3.7-3.6 5l6.2 5.2C41.1 35 44 30 44 24c0-1.3-.1-2.7-.4-4z" /></svg>
            Continuer avec Google
          </button>
        </Card>
      </div>
    </div>
  );
}

// ─── SCREEN: HOME / NAV ───────────────────────────────────────────────────────

function HomeScreen({ user, apiKey, onStart, onQuiz, onLogout, onChangeKey, sessions }) {
  const [level, setLevel] = useState(""); const [subject, setSubject] = useState(""); const [chapter, setChapter] = useState("");
  const [step, setStep] = useState(1);
  const canProceed = step === 1 ? !!level : step === 2 ? !!subject : !!chapter;

  const totalExos = sessions.length;
  const quizSessions = sessions.filter(s => s.quizScore != null);
  const avgScore = quizSessions.length ? Math.round(quizSessions.reduce((a, s) => a + s.quizScore, 0) / quizSessions.length) : null;

  return (
    <div style={{ minHeight: "100vh", background: G.bg, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${G.border}`, padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, backdropFilter: "blur(12px)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg,${G.green},#22c55e)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🧪</div>
          <span style={{ fontWeight: 800, fontSize: 15 }}>StudyBot</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onChangeKey} style={{ background: "rgba(96,165,250,0.08)", border: `1px solid rgba(96,165,250,0.2)`, color: G.blue, borderRadius: 9, padding: "5px 10px", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600 }}>🔑 Clé API</button>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${G.blue},${G.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{user.avatar}</div>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: G.muted, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12 }}>Déco</button>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "22px 20px" }}>
        {/* Stats */}
        <div className="fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Exercices", value: totalExos, icon: "📝", color: G.green },
            { label: "Score moy.", value: avgScore != null ? `${avgScore}/100` : "—", icon: "🎯", color: G.yellow },
          ].map(k => (
            <Card key={k.label} color={k.color} style={{ padding: "14px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 19, marginBottom: 4 }}>{k.icon}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 22, color: k.color }}>{k.value}</div>
              <div style={{ color: G.muted, fontSize: 11, marginTop: 2 }}>{k.label}</div>
            </Card>
          ))}
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
          {["Niveau", "Matière", "Chapitre"].map((s, i) => {
            const done = step > i + 1, active = step === i + 1;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "auto" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 27, height: 27, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? G.green : active ? `${G.green}22` : "rgba(255,255,255,0.04)", border: `2px solid ${done || active ? G.green : G.border}`, fontSize: 11, fontWeight: 800, color: done ? "#052e16" : active ? G.green : G.muted, transition: "all .3s" }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 10, color: active ? G.green : done ? G.sub : G.muted, fontWeight: active ? 700 : 500 }}>{s}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: done ? G.green : G.border, margin: "0 4px 18px", transition: "background .3s" }} />}
              </div>
            );
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="fade">
            <p style={{ color: G.sub, fontSize: 13, marginBottom: 12 }}>👋 Bonjour {user.name} ! Ton niveau ?</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)} style={{ padding: "9px 15px", borderRadius: 11, border: `1.5px solid ${level === l ? G.green : G.border}`, background: level === l ? `${G.green}18` : "rgba(255,255,255,0.02)", color: level === l ? G.green : G.sub, fontFamily: "'Outfit',sans-serif", fontWeight: level === l ? 700 : 500, fontSize: 13, cursor: "pointer", transition: "all .2s" }}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="fade">
            <p style={{ color: G.sub, fontSize: 13, marginBottom: 12 }}>📚 Quelle matière ?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
              {SUBJECTS.map(s => (
                <button key={s.id} onClick={() => s.available && setSubject(s.id)} disabled={!s.available} style={{ padding: "15px 13px", borderRadius: 13, border: `1.5px solid ${subject === s.id ? s.color : s.available ? G.border : "rgba(255,255,255,0.03)"}`, background: subject === s.id ? `${s.color}16` : "rgba(255,255,255,0.02)", opacity: s.available ? 1 : 0.35, cursor: s.available ? "pointer" : "not-allowed", textAlign: "left", transition: "all .2s", position: "relative" }}>
                  <div style={{ fontSize: 21, marginBottom: 5 }}>{s.icon}</div>
                  <div style={{ color: s.available ? G.text : G.muted, fontWeight: 700, fontSize: 13, fontFamily: "'Outfit',sans-serif" }}>{s.label}</div>
                  {!s.available && <div style={{ color: G.muted, fontSize: 10, fontFamily: "'Outfit',sans-serif" }}>Bientôt</div>}
                  {subject === s.id && <div style={{ position: "absolute", top: 8, right: 10, color: s.color }}>✓</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="fade">
            <p style={{ color: G.sub, fontSize: 13, marginBottom: 12 }}>📖 Quel chapitre ?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
              {(CHAPTERS[level] || []).map(c => (
                <button key={c} onClick={() => setChapter(c)} style={{ padding: "12px 15px", borderRadius: 11, border: `1.5px solid ${chapter === c ? G.green : G.border}`, background: chapter === c ? `${G.green}12` : "rgba(255,255,255,0.02)", color: chapter === c ? G.green : G.sub, fontFamily: "'Outfit',sans-serif", fontWeight: chapter === c ? 600 : 400, fontSize: 13, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", transition: "all .2s" }}>
                  {c}{chapter === c && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 1 && <Btn variant="ghost" onClick={() => setStep(s => s - 1)} style={{ flexShrink: 0 }}>← Retour</Btn>}
          <Btn onClick={() => { if (step < 3) setStep(s => s + 1); else onStart({ level, subject, chapter }); }} disabled={!canProceed} full>
            {step < 3 ? "Continuer →" : "🚀 Commencer l'exercice"}
          </Btn>
        </div>

        {/* Quiz CTA */}
        <div style={{ marginTop: 14 }}>
          <button onClick={() => onQuiz({ level: level || "Seconde", subject: subject || "physique-chimie", chapter: chapter || "Énergie" })}
            style={{ width: "100%", padding: "12px", background: "rgba(250,204,21,0.06)", border: `1.5px solid rgba(250,204,21,0.22)`, borderRadius: 13, color: G.yellow, fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            ⚡ Quiz rapide — Évalue ton niveau
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: QUIZ ─────────────────────────────────────────────────────────────

function QuizScreen({ config, apiKey, onFinish, onBack }) {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState("intro");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(null);
  const [loadErr, setLoadErr] = useState("");

  const generate = async () => {
    setPhase("loading"); setLoadErr("");
    const sys = `Tu es un professeur de physique-chimie. Génère exactement 10 questions QCM de difficulté ${difficulty}/10 sur le chapitre "${config.chapter}" pour un élève de ${config.level}.
RÉPONDS UNIQUEMENT en JSON valide sans markdown :
{"questions":[{"q":"question","options":["A","B","C","D"],"answer":0,"explanation":"explication courte"}]}
answer est l'index 0-3 de la bonne réponse.`;
    const raw = await callAI(apiKey, sys, `10 questions niveau ${difficulty}/10 sur ${config.chapter}`);
    if (raw.startsWith("❌")) { setLoadErr(raw); setPhase("intro"); return; }
    try {
      const clean = raw.replace(/```json|```/g, "").replace(/^[^{]*/, "").replace(/[^}]*$/, "");
      const d = JSON.parse(clean);
      setQuestions(d.questions || fallback());
    } catch { setQuestions(fallback()); }
    setCurrent(0); setAnswers([]); setSelected(null); setConfirmed(false);
    setPhase("question");
  };

  const fallback = () => Array.from({ length: 10 }, (_, i) => ({
    q: `Question ${i + 1} — ${config.chapter} (difficulté ${difficulty}/10)`,
    options: ["Option A", "Option B", "Option C", "Option D"], answer: 0,
    explanation: "Révise ce chapitre dans ton manuel."
  }));

  const next = () => {
    const newAns = [...answers, { selected, correct: questions[current].answer }];
    setAnswers(newAns);
    if (current < questions.length - 1) { setCurrent(c => c + 1); setSelected(null); setConfirmed(false); }
    else {
      const correct = newAns.filter(a => a.selected === a.correct).length;
      const s = correct === 0 ? 0 : Math.min(100, Math.round((correct / 10) * difficulty * 10));
      setScore(s); setPhase("result"); onFinish(s);
    }
  };

  const q = questions[current];
  const optC = [G.blue, G.green, G.yellow, G.pink];

  if (phase === "intro") return (
    <div style={{ minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fade" style={{ maxWidth: 420, width: "100%" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: G.muted, cursor: "pointer", fontFamily: "'Outfit',sans-serif", marginBottom: 18, fontSize: 13 }}>← Retour</button>
        <Card style={{ padding: 26 }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Quiz Rapide</h2>
            <p style={{ color: G.muted, fontSize: 13 }}>{config.chapter} · {config.level}</p>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: G.sub, fontSize: 13, fontWeight: 600 }}>Niveau de difficulté</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: G.yellow, fontWeight: 700, fontSize: 17 }}>{difficulty}/10</span>
            </div>
            <input type="range" min={1} max={10} value={difficulty} onChange={e => setDifficulty(+e.target.value)} style={{ width: "100%", cursor: "pointer", accentColor: G.yellow }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ color: G.muted, fontSize: 11 }}>Facile 😊</span>
              <span style={{ color: G.muted, fontSize: 11 }}>Expert 🔥</span>
            </div>
          </div>
          <Card style={{ background: G.bg3, padding: 12, marginBottom: 18 }}>
            <p style={{ color: G.sub, fontSize: 12, lineHeight: 1.6, textAlign: "center" }}>
              10 questions · Score <strong style={{ color: G.text }}>0–100</strong><br />
              Max si tout correct : <strong style={{ color: G.yellow }}>{Math.min(100, difficulty * 10)} pts</strong>
            </p>
          </Card>
          {loadErr && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 12, textAlign: "center" }}>{loadErr}</p>}
          <Btn variant="yellow" onClick={generate} full>⚡ Lancer le quiz</Btn>
        </Card>
      </div>
    </div>
  );

  if (phase === "loading") return (
    <div style={{ minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
      <Spinner color={G.yellow} size={24} />
      <p style={{ color: G.muted, fontSize: 14 }}>Génération des questions niveau {difficulty}/10…</p>
    </div>
  );

  if (phase === "question" && q) return (
    <div style={{ minHeight: "100vh", background: G.bg, paddingBottom: 40 }}>
      <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${G.border}`, padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: G.muted, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>✕</button>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: G.yellow, fontWeight: 700 }}>{current + 1}/10</span>
        <span style={{ color: G.muted, fontSize: 12 }}>Niv.{difficulty}</span>
      </div>
      <div style={{ height: 3, background: G.border }}>
        <div style={{ height: "100%", width: `${(current / 10) * 100}%`, background: `linear-gradient(90deg,${G.yellow},${G.orange})`, transition: "width .4s" }} />
      </div>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "22px 20px" }}>
        <div className="fade" key={current}>
          <Card style={{ padding: 20, marginBottom: 14 }}>
            <p style={{ color: G.text, fontSize: 15, lineHeight: 1.65 }}>{q.q}</p>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
            {q.options.map((opt, i) => {
              let bg = "rgba(255,255,255,0.02)", bdr = G.border, col = G.sub;
              if (confirmed) {
                if (i === q.answer) { bg = `${G.green}18`; bdr = G.green; col = G.green; }
                else if (i === selected && i !== q.answer) { bg = "rgba(248,113,113,0.1)"; bdr = "#f87171"; col = "#f87171"; }
              } else if (i === selected) { bg = `${optC[i]}18`; bdr = optC[i]; col = optC[i]; }
              return (
                <button key={i} onClick={() => !confirmed && setSelected(i)} style={{ padding: "13px 15px", borderRadius: 11, border: `1.5px solid ${bdr}`, background: bg, color: col, fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: 14, cursor: confirmed ? "default" : "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 11, transition: "all .2s" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: i === selected ? bdr : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: i === selected ? G.bg : G.muted, flexShrink: 0 }}>
                    {confirmed && i === q.answer ? "✓" : confirmed && i === selected && i !== q.answer ? "✗" : "ABCD"[i]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {confirmed && (
            <Card color={G.green} style={{ padding: 12, marginBottom: 14 }}>
              <p style={{ color: G.sub, fontSize: 13, lineHeight: 1.5 }}>💡 {q.explanation}</p>
            </Card>
          )}
          {!confirmed
            ? <Btn onClick={() => setConfirmed(true)} disabled={selected === null} full>Valider ma réponse</Btn>
            : <Btn variant="yellow" onClick={next} full>{current < 9 ? "Question suivante →" : "Voir mon score 🎯"}</Btn>
          }
        </div>
      </div>
    </div>
  );

  if (phase === "result") {
    const correct = answers.filter(a => a.selected === a.correct).length;
    return (
      <div style={{ minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="fade" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Résultat</h2>
          <p style={{ color: G.muted, fontSize: 13, marginBottom: 24 }}>{config.chapter} · Difficulté {difficulty}/10</p>
          <div style={{ marginBottom: 22 }}><ScoreRing score={score} /></div>
          <Card style={{ padding: 18, marginBottom: 14, textAlign: "left" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
              {[{ l: "Bonnes rép.", v: `${correct}/10`, c: G.green }, { l: "Difficulté", v: `${difficulty}/10`, c: G.yellow }, { l: "Max possible", v: `${Math.min(100, difficulty * 10)}pts`, c: G.blue }].map(k => (
                <div key={k.l}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 18, color: k.c }}>{k.v}</div>
                  <div style={{ color: G.muted, fontSize: 10, marginTop: 3 }}>{k.l}</div>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => { setPhase("intro"); setScore(null); }} style={{ flex: 1 }}>🔄 Rejouer</Btn>
            <Btn onClick={onBack} style={{ flex: 1 }}>🏠 Accueil</Btn>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// ─── SCREEN: EXERCISE ─────────────────────────────────────────────────────────

function ExerciseScreen({ config, apiKey, onBack, onSave }) {
  const [exerciseText, setExerciseText] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState("rappel");
  const [unlockedSteps, setUnlockedSteps] = useState(["rappel"]);
  const [stepContents, setStepContents] = useState({});
  const [loading, setLoading] = useState(false);
  const [stepsUsed, setStepsUsed] = useState(0);
  const fileRef = useRef();
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [stepContents, loading]);

  const handleImg = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setImagePreview(ev.target.result); setImageBase64(ev.target.result.split(",")[1]); };
    r.readAsDataURL(f);
  };

  const prompts = {
    rappel:  `Tu es un professeur de physique-chimie bienveillant et motivant pour un élève de ${config.level}, chapitre "${config.chapter}". Fournis UNIQUEMENT un rappel des notions du cours pertinentes. NE donne PAS la solution ni d'indice de résolution. Utilise des emojis, max 180 mots. Termine par "À toi de jouer ! 🗝️"`,
    indice1: `Tu es un professeur de physique-chimie pour un élève de ${config.level}. Donne un PREMIER INDICE général (quel concept, quelle approche) sans résoudre. Max 100 mots, encourageant 💫`,
    indice2: `Tu es un professeur de physique-chimie pour un élève de ${config.level}. Donne un DEUXIÈME INDICE précis : quelle formule, comment identifier les données. Ne donne pas le résultat final. Max 130 mots. Termine par "Tu y es presque ! 🔥"`,
    solution:`Tu es un professeur de physique-chimie pour un élève de ${config.level}. Fournis la SOLUTION COMPLÈTE : 1)Données 2)Formule(s) 3)Application numérique 4)Résultat avec unité. Félicite l'élève avec des emojis 🎉`,
  };

  const stepOrder = ["rappel", "indice1", "indice2", "solution"];
  const currentIdx = stepOrder.indexOf(currentStep);
  const hasNext = currentIdx < stepOrder.length - 1;
  const nextCfg = hasNext ? STEP_CONFIG[currentIdx + 1] : null;

  const start = async () => {
    if (!exerciseText.trim() && !imageBase64) return;
    setStarted(true); setCurrentStep("rappel"); setUnlockedSteps(["rappel"]); setStepContents({}); setStepsUsed(0);
    setLoading(true);
    const resp = await callAI(apiKey, prompts.rappel, exerciseText || "Voici l'exercice en image.", imageBase64);
    setStepContents({ rappel: resp });
    setLoading(false);
  };

  const unlockNext = async () => {
    const next = stepOrder[currentIdx + 1]; if (!next) return;
    setCurrentStep(next);
    setUnlockedSteps(p => [...p, next]);
    const used = stepsUsed + 1; setStepsUsed(used);
    if (next === "solution") onSave({ stepsUsed: used, subject: "Physique-Chimie", level: config.level, chapter: config.chapter });
    setLoading(true);
    const resp = await callAI(apiKey, prompts[next], exerciseText || "Voici l'exercice.", imageBase64);
    setStepContents(p => ({ ...p, [next]: resp }));
    setLoading(false);
  };

  const markDone = () => {
    if (currentStep !== "solution") onSave({ stepsUsed, subject: "Physique-Chimie", level: config.level, chapter: config.chapter });
    onBack();
  };

  if (!started) return (
    <div style={{ minHeight: "100vh", background: G.bg, paddingBottom: 40 }}>
      <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${G.border}`, padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: G.muted, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>← Retour</button>
        <span style={{ fontWeight: 700, fontSize: 14 }}>⚗️ {config.chapter}</span>
        <span style={{ color: G.muted, fontSize: 12 }}>{config.level}</span>
      </div>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "22px 20px" }}>
        <Card color={G.green} style={{ padding: 14, marginBottom: 18 }}>
          <p style={{ color: G.sub, fontSize: 13, lineHeight: 1.6 }}>📖 <strong style={{ color: G.text }}>{config.chapter}</strong> · 🎓 {config.level}</p>
        </Card>
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: G.muted, fontSize: 11, fontWeight: 700, letterSpacing: ".6px", textTransform: "uppercase", marginBottom: 7 }}>Ton exercice</div>
          <textarea value={exerciseText} onChange={e => setExerciseText(e.target.value)}
            placeholder="Colle l'énoncé ici… ou uploade une photo ✍️&#10;&#10;Ex: Un objet de 2 kg tombe de 5 m. Calcule son énergie potentielle." rows={5}
            style={{ width: "100%", background: G.bg3, border: `1.5px solid ${G.border}`, borderRadius: 13, color: G.text, fontFamily: "'Outfit',sans-serif", fontSize: 14, padding: "12px 14px", resize: "vertical", lineHeight: 1.6, outline: "none" }}
            onFocus={e => e.target.style.borderColor = G.green} onBlur={e => e.target.style.borderColor = G.border} />
        </div>
        <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "11px", background: "rgba(255,255,255,0.02)", border: `1.5px dashed ${G.border}`, borderRadius: 12, color: G.muted, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
          📸 {imagePreview ? "Changer la photo" : "Photo de l'exercice"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display: "none" }} />
        {imagePreview && (
          <div style={{ position: "relative", marginBottom: 14 }}>
            <img src={imagePreview} alt="exo" style={{ width: "100%", borderRadius: 12, maxHeight: 180, objectFit: "cover", border: `1px solid ${G.green}44` }} />
            <button onClick={() => { setImageBase64(null); setImagePreview(null); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}>✕</button>
          </div>
        )}
        <Btn onClick={start} disabled={!exerciseText.trim() && !imageBase64} full>🚀 Commencer la révision</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: G.bg, paddingBottom: 40 }}>
      <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${G.border}`, padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, backdropFilter: "blur(12px)", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: G.muted, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>← Retour</button>
        <span style={{ fontWeight: 700, fontSize: 14 }}>⚗️ {config.chapter}</span>
        <span style={{ color: G.green, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700 }}>{unlockedSteps.length}/4</span>
      </div>
      <div style={{ height: 3, background: G.border }}>
        <div style={{ height: "100%", width: `${(unlockedSteps.length / 4) * 100}%`, background: `linear-gradient(90deg,${G.green},${G.blue})`, transition: "width .5s" }} />
      </div>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 20px" }}>
        {/* Step pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, justifyContent: "center" }}>
          {STEP_CONFIG.map(s => {
            const unlocked = unlockedSteps.includes(s.id), active = currentStep === s.id;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, border: `1.5px solid ${active ? s.color : unlocked ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.04)"}`, background: active ? `${s.color}16` : "transparent", opacity: unlocked ? 1 : 0.3, color: active ? s.color : unlocked ? G.sub : G.muted, fontSize: 12, fontWeight: active ? 700 : 500, transition: "all .3s" }}>
                <span>{s.icon}</span><span>{s.label}</span>{!unlocked && <span style={{ fontSize: 9 }}>🔒</span>}
              </div>
            );
          })}
        </div>
        {/* Exercise recap */}
        {(exerciseText || imagePreview) && (
          <Card style={{ padding: "11px 13px", marginBottom: 12 }}>
            <div style={{ color: G.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".5px", marginBottom: 5, textTransform: "uppercase" }}>Ton exercice</div>
            {imagePreview && <img src={imagePreview} alt="" style={{ width: "100%", borderRadius: 8, maxHeight: 100, objectFit: "cover", marginBottom: 5 }} />}
            {exerciseText && <p style={{ color: G.sub, fontSize: 13, lineHeight: 1.5 }}>{exerciseText}</p>}
          </Card>
        )}
        {/* Steps */}
        {stepOrder.map(sid => {
          if (!unlockedSteps.includes(sid)) return null;
          const cfg = STEP_CONFIG.find(s => s.id === sid);
          const content = stepContents[sid], isActive = currentStep === sid;
          return (
            <div key={sid} className="fade" style={{ background: G.bg2, border: `1.5px solid ${isActive ? cfg.color + "44" : G.border}`, borderRadius: 15, padding: 17, marginBottom: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                <span style={{ fontSize: 15 }}>{cfg.icon}</span>
                <span style={{ color: cfg.color, fontWeight: 700, fontSize: 13 }}>{cfg.label}</span>
              </div>
              {content
                ? <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.72, whiteSpace: "pre-wrap" }}>{content}</p>
                : isActive && loading && <div style={{ display: "flex", alignItems: "center", gap: 9, color: G.muted }}><Spinner color={cfg.color} /><span style={{ fontSize: 13 }}>Réflexion en cours…</span></div>
              }
            </div>
          );
        })}
        <div ref={bottomRef} />
        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 6 }}>
            {hasNext && currentStep === stepOrder[currentIdx] && (
              <>
                <button onClick={unlockNext} style={{ width: "100%", padding: "13px", background: `${nextCfg.color}0e`, border: `1.5px solid ${nextCfg.color}44`, borderRadius: 12, color: nextCfg.color, fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {nextCfg.icon} Je n'ai pas trouvé → {nextCfg.label}
                </button>
                <Btn onClick={markDone} full>✅ J'ai trouvé la solution !</Btn>
              </>
            )}
            {currentStep === "solution" && <Btn onClick={markDone} full>🎯 Exercice terminé</Btn>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [apiKey, setApiKey] = useState(() => { try { return localStorage.getItem("sb_openrouter_key") || ""; } catch { return ""; } });
  const [user, setUser]     = useState(() => { try { return JSON.parse(localStorage.getItem("sb_user") || "null"); } catch { return null; } });
  const [screen, setScreen] = useState("home");
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState(() => { try { return JSON.parse(localStorage.getItem("sb_sessions") || "[]"); } catch { return []; } });

  const saveSession = data => {
    const s = { ...data, timestamp: Date.now() };
    const u = [...sessions, s]; setSessions(u);
    try { localStorage.setItem("sb_sessions", JSON.stringify(u)); } catch {}
  };

  const saveApiKey = key => {
    setApiKey(key);
    try { localStorage.setItem("sb_openrouter_key", key); } catch {}
    setScreen("home");
  };

  const logout = () => {
    try { localStorage.removeItem("sb_user"); } catch {}
    setUser(null);
  };

  // 1. Need API key
  if (!apiKey || screen === "apikey") return (
    <><style>{css}</style><ApiKeyScreen onSave={saveApiKey} /></>
  );
  // 2. Need auth
  if (!user) return (
    <><style>{css}</style><AuthScreen onLogin={u => { try { localStorage.setItem("sb_user", JSON.stringify(u)); } catch {} setUser(u); }} /></>
  );
  // 3. Exercise
  if (screen === "exercise" && config) return (
    <><style>{css}</style><ExerciseScreen config={config} apiKey={apiKey} onBack={() => setScreen("home")} onSave={saveSession} /></>
  );
  // 4. Quiz
  if (screen === "quiz" && config) return (
    <><style>{css}</style><QuizScreen config={config} apiKey={apiKey} onBack={() => setScreen("home")} onFinish={score => saveSession({ quizScore: score, subject: "Physique-Chimie", timestamp: Date.now() })} /></>
  );
  // 5. Home
  return (
    <><style>{css}</style>
      <HomeScreen user={user} apiKey={apiKey} sessions={sessions}
        onStart={cfg => { setConfig(cfg); setScreen("exercise"); }}
        onQuiz={cfg => { setConfig(cfg); setScreen("quiz"); }}
        onLogout={logout}
        onChangeKey={() => setScreen("apikey")} />
    </>
  );
}
