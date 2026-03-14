import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
//  🔧 把下面的網址換成你的 Google Sheets CSV 網址
//  做法：Google Sheets → 檔案 → 共用 → 發布到網路 → CSV → 複製網址
// ═══════════════════════════════════════════════════════════════════
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_tr93QNKj8ZTyoMWSpX0KDSymo6wHEshs8giEkIbwb-uoJ2yf9K53Q1cPglG9F7OHS48KXEGU5d5W/pub?gid=0&single=true&output=csv";
// ═══════════════════════════════════════════════════════════════════

const REFRESH_INTERVAL = 30000; // 每 30 秒自動更新（毫秒）

// 固定欄位（這幾欄不算活動）
const FIXED_COLS = ["team_id", "team_name", "color_index"];

const TEAM_COLORS = [
  { main: "#FF6B35", light: "#FF6B3520" },
  { main: "#00D4FF", light: "#00D4FF20" },
  { main: "#A855F7", light: "#A855F720" },
  { main: "#10B981", light: "#10B98120" },
  { main: "#F59E0B", light: "#F59E0B20" },
  { main: "#EC4899", light: "#EC489920" },
];

const RANK_STYLES = {
  1: { badge: "🏆", color: "#FFD700", shadow: "0 0 30px #FFD70088" },
  2: { badge: "🥈", color: "#C0C0C0", shadow: "0 0 20px #C0C0C044" },
  3: { badge: "🥉", color: "#CD7F32", shadow: "0 0 20px #CD7F3244" },
};

// ── CSV Parser ──────────────────────────────────────────────────────
// 格式：每列一個隊伍，活動名稱當欄位
// team_id | team_name | color_index | 活動A | 活動B | 活動C ...
function parseCSV(text) {
  const lines = text.trim().split("\n").map(l =>
    l.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
  );
  const headers = lines[0];
  const activityCols = headers.filter(h => !FIXED_COLS.includes(h) && h !== "");

  const teams = lines.slice(1)
    .filter(row => row[0] && row[0].trim() !== "")
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i] || ""));

      const activities = activityCols.map(act => ({
        name: act,
        points: parseInt(obj[act]) || 0,
      }));

      return {
        id: obj.team_id,
        name: obj.team_name,
        colorIdx: parseInt(obj.color_index) || 0,
        activities,
        total: activities.reduce((s, a) => s + a.points, 0),
      };
    });

  return { teams, activityCols };
}

const getRanked = (teams) =>
  [...teams]
    .sort((a, b) => b.total - a.total)
    .map((t, i) => ({ ...t, rank: i + 1 }));

// ── Global Styles ───────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Noto+Sans+TC:wght@300;400;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080c18; }
    @keyframes float {
      0%   { transform: translateY(0) scale(1); opacity: .6; }
      50%  { transform: translateY(-30px) scale(1.2); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: .6; }
    }
    @keyframes rankPulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.08); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes expandDown {
      from { opacity: 0; transform: translateY(-10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes topGlow {
      0%, 100% { box-shadow: 0 0 30px #FFD70055; }
      50%       { box-shadow: 0 0 60px #FFD70099, 0 0 100px #FFD70033; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0a0e1a; }
    ::-webkit-scrollbar-thumb { background: #2a3050; border-radius: 3px; }
  `}</style>
);

// ── Particles ───────────────────────────────────────────────────────
function Particles() {
  const pts = Array.from({ length: 40 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 3 + 1, dur: Math.random() * 20 + 10, delay: Math.random() * -20,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          animation: `float ${p.dur}s ${p.delay}s infinite linear`,
        }} />
      ))}
    </div>
  );
}

// ── Score Bar ───────────────────────────────────────────────────────
function ScoreBar({ value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        borderRadius: 3, transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
        boxShadow: `0 0 8px ${color}66`,
      }} />
    </div>
  );
}

// ── Activity Detail Panel ───────────────────────────────────────────
function ActivityDetail({ team }) {
  const c = TEAM_COLORS[team.colorIdx] || TEAM_COLORS[0];
  const maxPts = Math.max(...team.activities.map(a => a.points), 1);

  return (
    <div style={{
      animation: "expandDown 0.3s ease",
      borderTop: `1px solid ${c.main}22`,
      background: "rgba(0,0,0,0.35)",
      padding: "20px 24px 24px",
    }}>
      <div style={{
        fontFamily: "Orbitron", fontSize: 11, color: c.main,
        letterSpacing: 3, marginBottom: 16, opacity: 0.8,
      }}>── 各活動積分明細 ──</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {team.activities.map((act, i) => (
          <div key={act.name} style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 10,
            background: `${c.main}0d`,
            border: `1px solid ${c.main}1a`,
            animation: "slideIn 0.3s ease both",
            animationDelay: `${i * 0.05}s`,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 5,
                  background: `${c.main}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Orbitron", fontSize: 10, color: c.main, fontWeight: 700,
                }}>{i + 1}</div>
                <span style={{ fontFamily: "Noto Sans TC", fontSize: 14, color: "#d0d8f0", fontWeight: 700 }}>
                  {act.name}
                </span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${(act.points / maxPts) * 100}%`,
                  background: `linear-gradient(90deg, ${c.main}66, ${c.main})`,
                  borderRadius: 2, transition: "width 0.6s ease",
                }} />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontFamily: "Orbitron", fontSize: 22, fontWeight: 700,
                color: act.points === 0 ? "#3a4060" : c.main,
                textShadow: act.points > 0 ? `0 0 10px ${c.main}66` : "none",
                lineHeight: 1,
              }}>
                {act.points > 0 ? `+${act.points}` : "—"}
              </div>
              <div style={{ fontFamily: "Noto Sans TC", fontSize: 10, color: "#4a5880", marginTop: 3 }}>積分</div>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        marginTop: 14, padding: "12px 16px", borderRadius: 10,
        background: `${c.main}18`, border: `1px solid ${c.main}44`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: "Noto Sans TC", color: "#a0aec0", fontSize: 13 }}>
          共 {team.activities.length} 個活動
        </span>
        <div>
          <span style={{ fontFamily: "Noto Sans TC", color: "#6b7a9d", fontSize: 12, marginRight: 8 }}>總計</span>
          <span style={{ fontFamily: "Orbitron", color: c.main, fontSize: 20, fontWeight: 900 }}>
            {team.total} pts
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Team Card ───────────────────────────────────────────────────────
function TeamCard({ team, expanded, onToggle, maxScore, activityCols }) {
  const c = TEAM_COLORS[team.colorIdx] || TEAM_COLORS[0];
  const rs = RANK_STYLES[team.rank] || {};
  const isTop = team.rank <= 3;

  return (
    <div style={{
      borderRadius: 16,
      background: isTop && team.rank === 1
        ? "linear-gradient(135deg, #1a1600 0%, #0d0d1a 100%)"
        : "linear-gradient(135deg, #111827 0%, #0d1117 100%)",
      border: `1px solid ${isTop ? rs.color + "44" : c.main + "22"}`,
      boxShadow: isTop ? rs.shadow : "none",
      animation: team.rank === 1 ? "topGlow 3s ease-in-out infinite" : `slideIn 0.5s ease both`,
      animationDelay: team.rank === 1 ? "0s" : `${(team.rank - 1) * 0.08}s`,
      marginBottom: 12, overflow: "hidden",
      transition: "transform 0.2s, border-color 0.3s",
    }}>
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", padding: "18px 22px", gap: 16, cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.parentElement.style.transform = "translateY(-2px)"}
        onMouseLeave={e => e.currentTarget.parentElement.style.transform = "translateY(0)"}
      >
        {/* Rank */}
        <div style={{
          minWidth: 52, height: 52, borderRadius: 12,
          background: isTop ? `${rs.color}22` : c.light,
          border: `2px solid ${isTop ? rs.color + "66" : c.main + "44"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: isTop ? "rankPulse 2s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}>
          {isTop
            ? <span style={{ fontSize: 22 }}>{rs.badge}</span>
            : <span style={{ fontFamily: "Orbitron", fontSize: 18, fontWeight: 700, color: c.main }}>{team.rank}</span>
          }
        </div>

        {/* Name + bar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.main, boxShadow: `0 0 8px ${c.main}`, flexShrink: 0 }} />
            <span style={{ fontFamily: "Noto Sans TC", fontWeight: 700, fontSize: 16, color: "#f0f4ff", letterSpacing: 1 }}>
              {team.name}
            </span>
          </div>
          <ScoreBar value={team.total} max={maxScore} color={c.main} />
          <div style={{ marginTop: 5, fontFamily: "Noto Sans TC", fontSize: 11, color: "#3a4a6a" }}>
            {activityCols.length} 個活動 · 點擊查看明細
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontFamily: "Orbitron", fontSize: 28, fontWeight: 900,
            color: isTop ? rs.color : c.main,
            textShadow: isTop ? `0 0 20px ${rs.color}` : `0 0 15px ${c.main}88`,
            lineHeight: 1,
          }}>{team.total}</div>
          <div style={{ fontFamily: "Noto Sans TC", fontSize: 11, color: "#6b7a9d", marginTop: 4 }}>總積分</div>
        </div>

        {/* Arrow */}
        <div style={{
          marginLeft: 4, color: c.main, fontSize: 16, flexShrink: 0,
          transform: expanded ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.3s",
        }}>▼</div>
      </div>

      {expanded && <ActivityDetail team={team} />}
    </div>
  );
}

// ── Status Bar ──────────────────────────────────────────────────────
function StatusBar({ lastUpdate, loading, onRefresh, countdown }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "8px 16px",
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: loading ? "#F59E0B" : "#10B981",
          boxShadow: loading ? "0 0 8px #F59E0B" : "0 0 8px #10B981",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
        <span style={{ fontFamily: "Noto Sans TC", fontSize: 12, color: "#6b7a9d" }}>
          {loading ? "更新中..." : `最後更新：${lastUpdate}`}
        </span>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "8px 16px",
      }}>
        <span style={{ fontFamily: "Orbitron", fontSize: 11, color: "#4a5880" }}>
          {countdown}s 後自動刷新
        </span>
        <button
          onClick={onRefresh}
          onMouseEnter={e => e.target.style.background = "rgba(0,212,255,0.2)"}
          onMouseLeave={e => e.target.style.background = "rgba(0,212,255,0.1)"}
          style={{
            background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)",
            borderRadius: 12, padding: "3px 10px", cursor: "pointer",
            fontFamily: "Noto Sans TC", fontSize: 12, color: "#00D4FF", transition: "all 0.2s",
          }}
        >立即刷新</button>
      </div>
    </div>
  );
}

// ── Activity Overview Table ─────────────────────────────────────────
function ActivityOverview({ ranked, activityCols }) {
  if (!activityCols.length) return null;
  return (
    <div style={{
      marginBottom: 28,
      background: "linear-gradient(135deg, #111827, #0d1117)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "20px 24px", overflowX: "auto",
    }}>
      <div style={{ fontFamily: "Orbitron", fontSize: 11, color: "#6b7a9d", letterSpacing: 3, marginBottom: 16 }}>
        ALL ACTIVITIES OVERVIEW
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
        <thead>
          <tr>
            <th style={{ fontFamily: "Noto Sans TC", fontSize: 12, color: "#4a5880", textAlign: "left", padding: "6px 12px 10px 0", fontWeight: 400 }}>隊伍</th>
            {activityCols.map(act => (
              <th key={act} style={{
                fontFamily: "Noto Sans TC", fontSize: 12, color: "#4a5880",
                textAlign: "center", padding: "6px 8px 10px", fontWeight: 400, whiteSpace: "nowrap",
              }}>{act}</th>
            ))}
            <th style={{ fontFamily: "Orbitron", fontSize: 11, color: "#00D4FF", textAlign: "right", padding: "6px 0 10px 12px", fontWeight: 700 }}>總分</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((team, rowIdx) => {
            const c = TEAM_COLORS[team.colorIdx] || TEAM_COLORS[0];
            const rs = RANK_STYLES[team.rank] || {};
            return (
              <tr key={team.id} style={{
                borderTop: "1px solid rgba(255,255,255,0.04)",
                background: rowIdx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
              }}>
                <td style={{ padding: "10px 12px 10px 0", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 14, marginRight: 6 }}>{rs.badge || `#${team.rank}`}</span>
                  <span style={{ fontFamily: "Noto Sans TC", fontSize: 13, color: "#c0cce0", fontWeight: 700 }}>{team.name}</span>
                </td>
                {team.activities.map(act => (
                  <td key={act.name} style={{ textAlign: "center", padding: "10px 8px" }}>
                    <span style={{
                      fontFamily: "Orbitron", fontSize: 14, fontWeight: 700,
                      color: act.points === 0 ? "#2a3450" : c.main,
                    }}>
                      {act.points > 0 ? act.points : "—"}
                    </span>
                  </td>
                ))}
                <td style={{ textAlign: "right", padding: "10px 0 10px 12px" }}>
                  <span style={{
                    fontFamily: "Orbitron", fontSize: 16, fontWeight: 900,
                    color: team.rank <= 3 ? rs.color : c.main,
                    textShadow: team.rank <= 3 ? `0 0 10px ${rs.color}88` : "none",
                  }}>{team.total}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────
export default function App() {
  const [teams, setTeams] = useState([]);
  const [activityCols, setActivityCols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState("--:--");
  const [expanded, setExpanded] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [showOverview, setShowOverview] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(SHEET_CSV_URL + "&t=" + Date.now());
      if (!res.ok) throw new Error("無法讀取試算表");
      const text = await res.text();
      const { teams: parsed, activityCols: cols } = parseCSV(text);
      setTeams(parsed);
      setActivityCols(cols);
      const now = new Date();
      setLastUpdate(
        `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`
      );
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);
  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : REFRESH_INTERVAL / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  const ranked = getRanked(teams);
  const maxScore = ranked[0]?.total || 1;
  const toggle = useCallback((id) => setExpanded(prev => (prev === id ? null : id)), []);

  return (
    <>
      <GlobalStyles />
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #080c18 0%, #0d1122 50%, #060910 100%)",
        fontFamily: "Noto Sans TC, sans-serif", position: "relative",
      }}>
        <Particles />
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "32px 20px 60px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: "Orbitron", fontSize: 11, color: "#00D4FF", letterSpacing: 6, marginBottom: 12, opacity: 0.7 }}>
              LIVE COMPETITION
            </div>
            <h1 style={{
              fontFamily: "Orbitron", fontSize: "clamp(22px, 5vw, 36px)", fontWeight: 900,
              background: "linear-gradient(135deg, #ffffff 0%, #a0c4ff 50%, #00D4FF 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              lineHeight: 1.1, letterSpacing: -1,
            }}>即時競賽排行榜</h1>
            <p style={{ fontFamily: "Noto Sans TC", fontSize: 14, color: "#4a5880", marginTop: 10, letterSpacing: 2 }}>
              點選各隊查看各活動積分明細
            </p>
          </div>

          <StatusBar lastUpdate={lastUpdate} loading={loading} onRefresh={fetchData} countdown={countdown} />

          {error && (
            <div style={{
              background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
              borderRadius: 12, padding: "20px", marginBottom: 24, textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontFamily: "Noto Sans TC", color: "#ff8080", fontSize: 15, marginBottom: 8 }}>讀取資料失敗</div>
              <div style={{ fontFamily: "Noto Sans TC", color: "#6b7a9d", fontSize: 13, lineHeight: 2 }}>
                請確認：<br />
                1. App.jsx 中 SHEET_CSV_URL 已換成正確的 CSV 網址<br />
                2. Google Sheets 已「發布到網路」選 CSV 格式<br />
                3. 前三個欄位名稱為 team_id、team_name、color_index，其餘為活動名稱
              </div>
            </div>
          )}

          {loading && teams.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 40, animation: "spin 1s linear infinite", display: "inline-block", marginBottom: 16 }}>⟳</div>
              <div style={{ fontFamily: "Noto Sans TC", color: "#6b7a9d" }}>讀取排行榜資料中...</div>
            </div>
          )}

          {ranked.length > 0 && (
            <>
              {/* Top 3 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
                {ranked.slice(0, 3).map(t => {
                  const rs = RANK_STYLES[t.rank];
                  return (
                    <div key={t.id} style={{
                      background: `linear-gradient(135deg, ${rs.color}15, transparent)`,
                      border: `1px solid ${rs.color}33`, borderRadius: 12,
                      padding: "14px 16px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 28 }}>{rs.badge}</div>
                      <div style={{ fontFamily: "Noto Sans TC", fontSize: 13, color: "#8090b0", marginTop: 4 }}>{t.name}</div>
                      <div style={{
                        fontFamily: "Orbitron", fontSize: 22, fontWeight: 900, color: rs.color,
                        textShadow: `0 0 15px ${rs.color}88`, marginTop: 6,
                      }}>{t.total}</div>
                    </div>
                  );
                })}
              </div>

              {/* Overview toggle */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <button
                  onClick={() => setShowOverview(v => !v)}
                  style={{
                    background: showOverview ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${showOverview ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 10, padding: "9px 22px", cursor: "pointer",
                    fontFamily: "Noto Sans TC", fontSize: 13,
                    color: showOverview ? "#00D4FF" : "#6b7a9d",
                    transition: "all 0.3s", letterSpacing: 1,
                  }}
                >
                  {showOverview ? "▲ 收起活動總覽" : "▼ 展開活動總覽（所有隊 × 所有活動）"}
                </button>
              </div>

              {showOverview && <ActivityOverview ranked={ranked} activityCols={activityCols} />}

              {/* Cards */}
              <div>
                {ranked.map(team => (
                  <TeamCard
                    key={team.id} team={team}
                    expanded={expanded === team.id}
                    onToggle={() => toggle(team.id)}
                    maxScore={maxScore}
                    activityCols={activityCols}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
