import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
//  🔧 把下面的網址換成你的 Google Sheets CSV 網址
//  做法：Google Sheets → 檔案 → 共用 → 發布到網路 → CSV → 複製網址
// ═══════════════════════════════════════════════════════════════════
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_tr93QNKj8ZTyoMWSpX0KDSymo6wHEshs8giEkIbwb-uoJ2yf9K53Q1cPglG9F7OHS48KXEGU5d5W/pub?gid=0&single=true&output=csv";
// ═══════════════════════════════════════════════════════════════════

const REFRESH_INTERVAL = 30000;
const FIXED_COLS = ["team_id", "team_name", "color_index", "champion_gift"];

const PALETTE = {
  bg: "#eef2ff",
  card: "#ffffff",
  border: "#d9dde3",
  text: "#1f2937",
  subText: "#6b7280",
  accent: "#111827",
  soft: "#eef2f7",
  top: "#f9fafb",
  gold: "#f59e0b",
  goldSoft: "#fffbeb",
};

function parseCSV(text) {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));

  const headers = lines[0];
  const activityCols = headers.filter((h) => !FIXED_COLS.includes(h) && h !== "");

  const teams = lines
    .slice(1)
    .filter((row) => row[0] && row[0].trim() !== "")
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i] || ""));

      const activities = activityCols.map((act) => ({
        name: act,
        points: parseInt(obj[act], 10) || 0,
      }));

      return {
        id: obj.team_id,
        name: obj.team_name,
        colorIdx: parseInt(obj.color_index, 10) || 0,
        championGift: (obj.champion_gift || "").trim(),
        activities,
        total: activities.reduce((s, a) => s + a.points, 0),
      };
    });

  return { teams, activityCols };
}

const getRanked = (teams) => [...teams].sort((a, b) => b.total - a.total).map((t, i) => ({ ...t, rank: i + 1 }));
const displayScore = (value) => (value > 0 ? value : "N/A");

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+TC:wght@400;500;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${PALETTE.bg}; color: ${PALETTE.text}; }
    button { font-family: "Noto Sans TC", sans-serif; }
  `}</style>
);

function ScoreBar({ value, max }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 7, background: PALETTE.soft, borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "#374151",
          borderRadius: 999,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function ActivityDetail({ team }) {
  const maxPts = Math.max(...team.activities.map((a) => a.points), 1);

  return (
    <div style={{ borderTop: `1px solid ${PALETTE.border}`, background: "#fcfcfd", padding: "14px 18px 18px" }}>
      <div style={{ fontSize: 12, color: PALETTE.subText, marginBottom: 10 }}>各活動積分</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {team.activities.map((act) => (
          <div
            key={act.name}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              alignItems: "center",
              gap: 10,
              border: `1px solid ${PALETTE.border}`,
              borderRadius: 8,
              padding: "10px 12px",
              background: "#fff",
            }}
          >
            <div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>{act.name}</div>
              <div style={{ height: 4, borderRadius: 999, background: PALETTE.soft, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(act.points / maxPts) * 100}%`, background: "#6b7280" }} />
              </div>
            </div>
            <div style={{ fontWeight: 700, color: PALETTE.text, minWidth: 52, textAlign: "right" }}>{displayScore(act.points)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamCard({ team, expanded, onToggle, maxScore, activityCols }) {
  const isChampion = team.rank === 1;

  return (
    <div
      style={{
        borderRadius: isChampion ? 16 : 12,
        border: isChampion ? "1px solid #f4d38f" : `1px solid ${PALETTE.border}`,
        background: PALETTE.card,
        boxShadow: isChampion ? "0 12px 26px rgba(245, 158, 11, 0.22)" : "0 6px 16px rgba(15, 23, 42, 0.06)",
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          textAlign: "left",
          gap: 14,
          border: "none",
          background: isChampion ? "linear-gradient(120deg, #fff7e6 0%, #ffffff 50%, #fffaf0 100%)" : "transparent",
          padding: "14px 16px",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            border: isChampion ? "1px solid #f5d799" : `1px solid ${PALETTE.border}`,
            background: isChampion ? "linear-gradient(135deg, #f59e0b, #facc15)" : PALETTE.top,
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            color: isChampion ? "#78350f" : PALETTE.text,
            flexShrink: 0,
          }}
        >
          {isChampion ? "👑" : team.rank}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isChampion ? 18 : 16, fontWeight: 800, marginBottom: 6, color: isChampion ? "#7c2d12" : PALETTE.text }}>{team.name}</div>
          <ScoreBar value={team.total} max={maxScore} />
          <div style={{ marginTop: 6, fontSize: 12, color: PALETTE.subText }}>{isChampion ? "冠軍隊伍" : `${activityCols.length} 個活動`}</div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: isChampion ? 28 : 24, fontWeight: 800, color: isChampion ? "#b45309" : PALETTE.text }}>{displayScore(team.total)}</div>
          <div style={{ fontSize: 12, color: PALETTE.subText }}>總分</div>
        </div>

        <div style={{ marginLeft: 4, fontSize: 12, color: PALETTE.subText }}>{expanded ? "▲" : "▼"}</div>
      </button>

      {expanded && <ActivityDetail team={team} />}
    </div>
  );
}

function StatusBar({ lastUpdate, loading, onRefresh, countdown }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
      <div style={{ fontSize: 13, color: PALETTE.subText }}>{loading ? "更新中..." : `最後更新：${lastUpdate}｜${countdown}s 後自動刷新`}</div>
      <button
        onClick={onRefresh}
        style={{
          border: `1px solid ${PALETTE.border}`,
          background: PALETTE.card,
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
          color: PALETTE.text,
          fontSize: 13,
        }}
      >
        立即刷新
      </button>
    </div>
  );
}

function ActivityOverview({ ranked, activityCols }) {
  if (!activityCols.length) return null;
  return (
    <div
      style={{
        marginBottom: 20,
        background: PALETTE.card,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        overflowX: "auto",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 10px 8px 0", fontSize: 12, color: PALETTE.subText }}>隊伍</th>
            {activityCols.map((act) => (
              <th key={act} style={{ textAlign: "center", padding: "8px", fontSize: 12, color: PALETTE.subText }}>
                {act}
              </th>
            ))}
            <th style={{ textAlign: "right", padding: "8px 0 8px 10px", fontSize: 12, color: PALETTE.subText }}>總分</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((team) => (
            <tr key={team.id} style={{ borderTop: `1px solid ${PALETTE.border}` }}>
              <td style={{ padding: "10px 10px 10px 0", fontWeight: 600 }}>
                #{team.rank} {team.name}
              </td>
              {team.activities.map((act) => (
                <td key={act.name} style={{ textAlign: "center", padding: "10px 8px" }}>
                  {displayScore(act.points)}
                </td>
              ))}
              <td style={{ textAlign: "right", padding: "10px 0 10px 10px", fontWeight: 700 }}>{displayScore(team.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChampionBanner({ champion, gift }) {
  if (!champion) return null;

  return (
    <div
      style={{
        background: "linear-gradient(130deg, #fff8e8 0%, #fff 55%, #fff4da 100%)",
        border: "1px solid #efcc87",
        borderRadius: 16,
        boxShadow: "0 14px 28px rgba(245, 158, 11, 0.22)",
        padding: "18px",
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 12, color: "#b45309", marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em" }}>CHAMPION</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: "#7c2d12" }}>🏆 {champion.name}</div>
          <div style={{ fontSize: 14, color: "#9a3412", fontWeight: 700 }}>總分：{displayScore(champion.total)}</div>
        </div>
        <div
          style={{
            border: "1px solid #f4c86e",
            borderRadius: 12,
            padding: "10px 12px",
            background: "#fffbeb",
            minWidth: 200,
          }}
        >
          <div style={{ fontSize: 12, color: "#a16207", marginBottom: 4 }}>冠軍禮物</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#78350f", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }} aria-hidden="true">
              🎟️
            </span>
            {gift || "未設定"}
          </div>
        </div>
      </div>
    </div>
  );
}

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
      setLastUpdate(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`);
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : REFRESH_INTERVAL / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  const ranked = getRanked(teams);
  const maxScore = ranked[0]?.total || 1;
  const champion = ranked[0];
  const championGift = teams.find((team) => team.championGift)?.championGift || "";
  const toggle = useCallback((id) => setExpanded((prev) => (prev === id ? null : id)), []);

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: PALETTE.bg, fontFamily: "Noto Sans TC, sans-serif" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ fontFamily: "Inter, Noto Sans TC, sans-serif", fontSize: "clamp(24px, 5vw, 34px)", fontWeight: 800, color: PALETTE.accent }}>
              即時競賽排行榜
            </h1>
            <p style={{ fontSize: 14, color: PALETTE.subText, marginTop: 8 }}>#競賽區間：4/1~6/30#</p>
          </div>

          <StatusBar lastUpdate={lastUpdate} loading={loading} onRefresh={fetchData} countdown={countdown} />

          {error && (
            <div style={{ background: "#fff", border: "1px solid #f3c0c0", borderRadius: 12, padding: 16, marginBottom: 16, color: "#b42318", lineHeight: 1.8 }}>
              讀取資料失敗，請確認：
              <br />1. 已將 `SHEET_CSV_URL` 設為正確的 CSV 網址。
              <br />2. Google Sheets 已「發布到網路」且格式為 CSV。
              <br />3. 固定欄位要有 team_id、team_name、color_index。
              <br />4. 若要設定冠軍禮物，可新增欄位 `champion_gift`，在任一列填入禮物名稱即可。
            </div>
          )}

          {loading && teams.length === 0 && !error && <div style={{ color: PALETTE.subText, textAlign: "center", padding: "38px 0" }}>讀取排行榜資料中...</div>}

          {ranked.length > 0 && (
            <>
              <ChampionBanner champion={champion} gift={championGift} />

              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <button
                  onClick={() => setShowOverview((v) => !v)}
                  style={{
                    background: PALETTE.card,
                    border: `1px solid ${PALETTE.border}`,
                    borderRadius: 8,
                    padding: "7px 14px",
                    cursor: "pointer",
                    fontSize: 13,
                    color: PALETTE.text,
                  }}
                >
                  {showOverview ? "收起活動總覽" : "展開活動總覽"}
                </button>
              </div>

              {showOverview && <ActivityOverview ranked={ranked} activityCols={activityCols} />}

              <div>
                {ranked.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
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
