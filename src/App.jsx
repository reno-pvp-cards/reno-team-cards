import React, { useState, useRef, useCallback } from 'react'

/* ============================================================
   CC TEAM CARD  ―  クリスタルコンフリクト大会用チーム紹介カード
   レイアウト：上=ロゴ+チーム名 / 中央=スクショ / 下=情報
              スクショ上下に情報層が透過オーバーレイ
   ・Astra=白基調×青文字 / Umbra=黒基調×赤文字
   ・出力 1920×1080 PNG
   ============================================================ */

const CARD_W = 960
const CARD_H = 540
const CARD_SCALE = 2

const HEADER_H = 84            // 上：ロゴ＋チーム名
const FOOTER_H = 22            // 下端コピーライト
const INFO_H = 176             // 下：情報層の高さ（メンバー2列5行＋履歴2列3行ぶん）
// 中央スクショは HEADER_H 下端〜情報層上端まで（情報層と一部重なる）
const INFO_OVERLAP = 22        // 情報層がスクショに食い込む高さ（透過部分）

const MEMBER_SLOTS = 8
const HISTORY_SLOTS = 5

// クリスタルコンフリクト 最高ランク
const RANK_LIST = ['アルテマ', 'オメガ', 'クリスタル', 'ダイヤモンド', 'プラチナ', 'ゴールド', 'シルバー', 'ブロンズ', '']

// ランクのダイヤ色（CCキャラカードから流用）
const RANK_CONFIG = {
  アルテマ:    { fill: '#bd3636', top: '#d44f4f', right: '#982626', left: '#7c1d1d', stroke: '#e88282' },
  オメガ:      { fill: '#a05aa0', top: '#b873b8', right: '#7e468e', left: '#683a74', stroke: '#cf9ccf' },
  クリスタル:  { fill: '#5a96b5', top: '#78b0c8', right: '#467a96', left: '#3a657d', stroke: '#a0c4d6' },
  ダイヤモンド:{ fill: '#7e96a8', top: '#9fb6c4', right: '#5e7689', left: '#4a6072', stroke: '#bcccd6' },
  プラチナ:    { fill: '#98a6b0', top: '#b8c4cc', right: '#7a8893', left: '#67737d', stroke: '#d2dce2' },
  ゴールド:    { fill: '#c79e4a', top: '#dcbb6e', right: '#a17f30', left: '#856825', stroke: '#e6cd8e' },
  シルバー:    { fill: '#b5b0a4', top: '#cecabd', right: '#928d82', left: '#7c776d', stroke: '#dcd8cd' },
  ブロンズ:    { fill: '#b07a4e', top: '#c2956c', right: '#8e5f33', left: '#744d29', stroke: '#d2a87e' },
}

// ロール（マーク廃止・文字ラベルのみ）
const ROLES = {
  player:  { label: '' },
  leader:  { label: 'LEADER' },
  support: { label: 'SUPPORT' },
  manager: { label: 'MANAGER' },
}

const FACTIONS = {
  astra: {
    name: 'ASTRA', jp: 'アストラ', light: true,
    accent: '#1c7fc4', accent2: '#3da9e0',
    deep: '#f4f8fc', deep2: '#e7eef5',
    panel: 'rgba(28,127,196,0.06)', panelBorder: 'rgba(28,127,196,0.22)',
    glow: 'rgba(28,127,196,0.0)', grid: 'rgba(28,127,196,0.08)',
    textMain: '#103a5c', textSub: 'rgba(28,90,140,0.62)', textFaint: 'rgba(28,90,140,0.32)',
    cardShadow: '0 20px 60px rgba(40,80,120,0.25)',
    // スクショに重なる情報層の透過色（白幕）
    veil: 'rgba(244,248,252,0.78)', veilSolid: '#f4f8fc',
  },
  umbra: {
    name: 'UMBRA', jp: 'ウンブラ', light: false,
    accent: '#e5352a', accent2: '#ff6e64',
    deep: '#080303', deep2: '#030101',
    panel: 'rgba(229,53,42,0.07)', panelBorder: 'rgba(229,53,42,0.26)',
    glow: 'rgba(229,53,42,0.5)', grid: 'rgba(229,53,42,0.08)',
    textMain: '#ff5347', textSub: 'rgba(255,110,100,0.72)', textFaint: 'rgba(255,110,100,0.32)',
    cardShadow: '0 20px 60px rgba(0,0,0,0.6)',
    veil: 'rgba(6,2,2,0.76)', veilSolid: '#030101',
  },
}

const fmtMonth = (val) => {
  if (!val) return ''
  const [y, m] = val.split('-')
  if (!y || !m) return ''   // 年・月いずれか未選択なら非表示
  return `${y}/${m}`
}

const emptyMember = () => ({ last: '', first: '', rank: '', role: 'player' })

const emptyTeam = {
  faction: 'astra',
  showLogo: true,   // ASTRA/UMBRA ロゴの表示ON/OFF
  headerSwap: false, // ヘッダーの左右入れ替え（false=テキスト左/ロゴ右、true=ロゴ左/テキスト右）
  teamName: '',
  teamReading: '',
  foundedDate: '',   // 結成日（'YYYY-MM' 形式）
  members: Array(MEMBER_SLOTS).fill(null).map((_, i) => ({
    ...emptyMember(), role: i === 0 ? 'leader' : 'player',
  })),
  screenshotDataUrl: '',
  history: Array(HISTORY_SLOTS).fill(null).map(() => ({ name: '', period: '', place: '' })),
}

/* ============================================================ */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Saira+Condensed:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Sans JP', sans-serif; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    input, textarea, select { font-family: 'Noto Sans JP', sans-serif; }
    input[type="month"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.6; cursor: pointer; }
  `}</style>
)

const UI = {
  pageBg: '#0a0c12',
  panelBg: 'rgba(255,255,255,0.035)',
  panelBorder: 'rgba(255,255,255,0.09)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.14)',
  text: 'rgba(255,255,255,0.9)',
  textSub: 'rgba(255,255,255,0.5)',
  textFaint: 'rgba(255,255,255,0.32)',
}

function Label({ children }) {
  return (
    <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: UI.textSub, marginBottom: '7px', textAlign: 'left' }}>{children}</div>
  )
}

// ランクダイヤ（DOM・SVG）
function RankDiamond({ rank, size = 14 }) {
  const c = RANK_CONFIG[rank]
  if (!c) return null
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block', flexShrink: 0 }} aria-label={rank}>
      <polygon points="24,4 44,20 24,44 4,20" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
      <polygon points="24,9 38,20 24,21 10,20" fill={c.top} />
      <polygon points="24,21 38,20 24,39" fill={c.right} />
      <polygon points="24,21 10,20 24,39" fill={c.left} />
    </svg>
  )
}


/* ============================================================
   カード描画（プレビュー・書き出し共通の唯一の実装）
   canvas に 960×540 論理座標で描画。S 倍の解像度で出力。
   これ1つをプレビューと書き出しの両方で使うため差異が出ない。
   ============================================================ */
const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src })

// canvas描画で使う全フォント（ファミリー×ウェイト）を明示的にロード。
// document.fonts.ready だけだと本番で初回描画時にWebフォント未着 → 標準フォントで
// プレースホルダー（TEAM NAME 等）が描かれてしまうため、ここで確実に取得してから描画する。
let _fontsReadyPromise = null
async function ensureFonts() {
  if (_fontsReadyPromise) return _fontsReadyPromise
  _fontsReadyPromise = (async () => {
    if (!document.fonts) return
    // drawCard内で使用しているフォント指定をすべて網羅
    const specs = [
      "300 16px 'Oswald'", "400 16px 'Oswald'", "500 16px 'Oswald'",
      "600 16px 'Oswald'", "700 16px 'Oswald'",
      "8px 'Oswald'", "10px 'Oswald'", "11px 'Oswald'", "14px 'Oswald'",
      "30px 'Oswald'", "36px 'Oswald'",
      "400 16px 'Noto Sans JP'", "500 16px 'Noto Sans JP'",
      "700 16px 'Noto Sans JP'", "900 16px 'Noto Sans JP'",
      "11px 'Noto Sans JP'", "12px 'Noto Sans JP'",
      "400 16px 'Saira Condensed'", "500 16px 'Saira Condensed'",
      "600 16px 'Saira Condensed'", "700 16px 'Saira Condensed'",
      "11px 'Saira Condensed'",
    ]
    try {
      await Promise.all(specs.map(s => document.fonts.load(s)))
    } catch (e) { /* 失敗してもreadyにフォールバック */ }
    try { await document.fonts.ready } catch (e) {}
  })()
  return _fontsReadyPromise
}

async function drawCard(canvas, team) {
  const f = FACTIONS[team.faction]
  const W = CARD_W, H = CARD_H, S = CARD_SCALE
  canvas.width = W * S; canvas.height = H * S
  const ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(S, S); ctx.textBaseline = 'alphabetic'

  const fillRect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
  const txt = (s, x, y, font, color, align = 'left', maxW) => {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align
    if (maxW) {
      let str = s
      while (ctx.measureText(str).width > maxW && str.length > 1) str = str.slice(0, -1)
      if (str !== s) str = str.slice(0, -1) + '…'
      ctx.fillText(str, x, y)
    } else ctx.fillText(s, x, y)
  }
  // ランクダイヤ描画（中心cx,cy・サイズsz）
  const drawDiamond = (rank, cx, cy, sz) => {
    const c = RANK_CONFIG[rank]; if (!c) return
    const s = sz / 48
    const P = (px, py) => [cx + (px - 24) * s, cy + (py - 24) * s]
    const poly = (pts, fill, stroke) => {
      ctx.beginPath()
      pts.forEach(([px, py], idx) => { const [x, y] = P(px, py); idx ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
      ctx.closePath()
      if (fill) { ctx.fillStyle = fill; ctx.fill() }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5 * s; ctx.stroke() }
    }
    poly([[24,4],[44,20],[24,44],[4,20]], c.fill, c.stroke)
    poly([[24,9],[38,20],[24,21],[10,20]], c.top)
    poly([[24,21],[38,20],[24,39]], c.right)
    poly([[24,21],[10,20],[24,39]], c.left)
  }

  // 背景
  fillRect(0, 0, W, H, f.deep)

  // 中央：スクショ（HEADER_H 下〜カード下端、contain・下寄せ）
  const ssTop = HEADER_H
  const ssArea = H - HEADER_H
  fillRect(0, ssTop, W, ssArea, f.deep2)
  if (team.screenshotDataUrl) {
    try {
      const img = await loadImg(team.screenshotDataUrl)
      const sR = img.width / img.height, tR = W / ssArea
      let rw, rh
      if (sR > tR) { rw = W; rh = W / sR } else { rh = ssArea; rw = ssArea * sR }
      const ox = (W - rw) / 2
      const oy = ssTop + (ssArea - rh)   // 下寄せ
      ctx.drawImage(img, ox, oy, rw, rh)
    } catch (e) { /* 読み込み失敗時はプレースホルダ */ }
  } else {
    txt('NO IMAGE', W / 2, ssTop + ssArea / 2, "600 14px 'Oswald'", f.textFaint, 'center')
  }

  // 上：ヘッダーのグラデ幕
  const hg = ctx.createLinearGradient(0, 0, 0, HEADER_H + 24)
  hg.addColorStop(0, f.deep); hg.addColorStop((HEADER_H - 24) / (HEADER_H + 24), f.deep); hg.addColorStop(1, f.deep + '00')
  fillRect(0, 0, W, HEADER_H + 24, hg)

  // ヘッダー内容（headerSwap で左右入れ替え）
  const swap = team.headerSwap
  const textAlignSide = swap ? 'right' : 'left'
  const textAnchorX = swap ? (W - 24) : 24       // テキストブロックの基準X
  const logoAnchorX = swap ? 24 : (W - 24)       // ロゴの基準X
  const logoAlignSide = swap ? 'left' : 'right'

  // テキストブロック：CRYSTAL CONFLICT ＋ チーム名 ＋ 読み方
  txt('CRYSTAL CONFLICT', textAnchorX, 32, "600 10px 'Oswald'", f.textSub, textAlignSide)
  // 結成日（CRYSTAL CONFLICT のラベル横に併記）
  if (team.foundedDate) {
    const foundedStr = `EST. ${fmtMonth(team.foundedDate)}`
    ctx.font = "600 10px 'Oswald'"
    const ccW = ctx.measureText('CRYSTAL CONFLICT').width
    if (!swap) {
      txt(foundedStr, textAnchorX + ccW + 12, 32, "600 10px 'Oswald'", f.textFaint, 'left')
    } else {
      txt(foundedStr, textAnchorX - ccW - 12, 32, "600 10px 'Oswald'", f.textFaint, 'right')
    }
  }
  const teamNameStr = team.teamName || 'TEAM NAME'
  ctx.font = "700 36px 'Oswald'"
  const tnW = Math.min(ctx.measureText(teamNameStr).width, W * 0.62)
  if (!swap) {
    // 左揃え：チーム名 → 右に読み方
    txt(teamNameStr, textAnchorX, 66, "700 36px 'Oswald'", f.textMain, 'left', W * 0.62)
    if (team.teamReading) txt(team.teamReading, textAnchorX + tnW + 14, 66, "12px 'Noto Sans JP'", f.textSub, 'left', W * 0.3)
  } else {
    // 右揃え：チーム名を右端 → 読み方はその左に
    txt(teamNameStr, textAnchorX, 66, "700 36px 'Oswald'", f.textMain, 'right', W * 0.62)
    if (team.teamReading) txt(team.teamReading, textAnchorX - tnW - 14, 66, "12px 'Noto Sans JP'", f.textSub, 'right', W * 0.3)
  }
  // ロゴ（薄）― showLogo時のみ
  if (team.showLogo) {
    ctx.save(); ctx.globalAlpha = 0.4
    txt(f.name, logoAnchorX, 60, "700 30px 'Oswald'", f.accent, logoAlignSide)
    ctx.restore()
  }

  // 下：情報層（透過 veil → 下70%はソリッド）
  const infoTop = H - INFO_H
  const vg = ctx.createLinearGradient(0, infoTop, 0, H)
  vg.addColorStop(0, f.deep + '00')
  vg.addColorStop(0.18, f.veil)
  vg.addColorStop(0.42, f.veilSolid)
  vg.addColorStop(1, f.veilSolid)
  fillRect(0, infoTop, W, INFO_H, vg)

  // 上端アクセント
  const accY = infoTop + INFO_OVERLAP - 4
  const ag = ctx.createLinearGradient(0, 0, W, 0)
  ag.addColorStop(0, f.accent + '00'); ag.addColorStop(0.5, f.accent); ag.addColorStop(1, f.accent + '00')
  fillRect(0, accY, W, 2, ag)

  /* 情報レイアウト（下寄せ）
     ・メンバー：2列（左 01-05 / 右 06-08）
     ・履歴　　：1列（最大5件・折り返しなし・大会名を広めに）
     ・メンバー左列(5行)を最下段の基準に、全体をフッター直上に下寄せ */
  const PAD = 24
  const ix = PAD
  const innerW = W - PAD * 2
  const footY = H - 12
  const sep = footY - 9

  // フォントサイズ（① メンバー名12px / 履歴11px）
  const MEM_FONT = "12px 'Noto Sans JP'"
  const MEM_NUM_FONT = "600 11px 'Oswald'"
  const HIST_FONT = "11px 'Noto Sans JP'"
  const HIST_PERIOD_FONT = "11px 'Saira Condensed'"
  const HIST_PLACE_FONT = "500 11px 'Noto Sans JP'"
  const LABEL_FONT = "600 10px 'Oswald'"

  const mRowH = 21, hRowH = 21
  const bottomPad = 12
  const memRows = 5            // 左列の行数（01-05）
  const blockH = (memRows - 1) * mRowH
  const firstRowY = (sep - bottomPad) - blockH   // 1行目ベースライン
  const labelY = firstRowY - 22                  // ラベル下に余白（① タイトル下を広めに）

  // 列レイアウト：左=メンバー(2列) / 右=履歴(1列)
  const colGap = 30
  const memW = (innerW - colGap) * 0.54
  const rightX = ix + memW + colGap
  const rightW = innerW - memW - colGap
  const mColGap = 16
  const mColW = (memW - mColGap) / 2
  const mCol2X = ix + mColW + mColGap
  // ラベル（MEMBERS/HISTORY）より中身を少し右にインデント
  const INDENT = 14

  // メンバー1名を描画
  const drawMember = (m, idx, colX, rowY, colW) => {
    const role = ROLES[m.role] || ROLES.player
    const filled = m.last || m.first
    const nameStr = `${m.last || ''}${m.last && m.first ? ' ' : ''}${m.first || ''}`
    txt(String(idx + 1).padStart(2, '0'), colX, rowY, MEM_NUM_FONT, filled ? f.accent : f.accent + '66')
    const nameX = colX + 24
    const reserve = (m.rank ? 18 : 0) + (role.label ? 48 : 0)
    const nameMax = colW - 24 - reserve - 6
    txt(nameStr || '—', nameX, rowY, MEM_FONT, filled ? f.textMain : f.textFaint, 'left', nameMax)
    ctx.font = MEM_FONT
    const nw = Math.min(ctx.measureText(nameStr).width, nameMax)
    let tailX = nameX + nw + 8
    if (m.rank) { drawDiamond(m.rank, tailX + 6, rowY - 4, 13); tailX += 18 }
    if (role.label) {
      ctx.font = "8px 'Oswald'"
      const lw = ctx.measureText(role.label).width + 8
      ctx.strokeStyle = f.panelBorder; ctx.lineWidth = 1
      ctx.beginPath(); ctx.roundRect(tailX, rowY - 9, lw, 12, 2); ctx.stroke()
      txt(role.label, tailX + 4, rowY, "8px 'Oswald'", f.textSub)
    }
  }

  // メンバー｜履歴 の境界に縦の仕切り線（視認性向上）
  const dividerX = rightX - colGap / 2
  const divTop = labelY - 10        // ラベル上端あたり
  const divBottom = footY - 9 - 4   // フッター区切り線の少し上
  const dvg = ctx.createLinearGradient(0, divTop, 0, divBottom)
  dvg.addColorStop(0, f.accent + '00')
  dvg.addColorStop(0.12, f.accent + '55')
  dvg.addColorStop(0.88, f.accent + '55')
  dvg.addColorStop(1, f.accent + '00')
  ctx.strokeStyle = dvg; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(dividerX, divTop); ctx.lineTo(dividerX, divBottom); ctx.stroke()

  // 左：MEMBERS（2列：01-05 / 06-08）― 中身はラベルより少し右
  txt('MEMBERS', ix, labelY, LABEL_FONT, f.textSub)
  team.members.slice(0, 5).forEach((m, i) => drawMember(m, i, ix + INDENT, firstRowY + i * mRowH, mColW - INDENT))
  team.members.slice(5, 8).forEach((m, i) => drawMember(m, i + 5, mCol2X + INDENT, firstRowY + i * mRowH, mColW - INDENT))

  // 右：HISTORY（1列・最大5件・折り返しなし）― 中身はラベルより少し右
  txt('HISTORY', rightX, labelY, LABEL_FONT, f.textSub)
  const hist = team.history.filter(h => h.name).slice(0, HISTORY_SLOTS)
  const histX = rightX + INDENT
  if (hist.length === 0) {
    txt('—', histX, firstRowY, HIST_FONT, f.textFaint)
  } else {
    const periodW = 48          // 年月の固定幅
    const placeReserve = 58     // 順位ラベルの確保幅（優勝/準優勝/予選敗退 等）
    const nameMax = rightW - INDENT - periodW - placeReserve - 8   // 大会名の最大幅（広め）
    hist.forEach((h, i) => {
      const rowY = firstRowY + i * hRowH
      txt(fmtMonth(h.period), histX, rowY, HIST_PERIOD_FONT, f.textFaint)
      txt(h.name, histX + periodW, rowY, HIST_FONT, f.textMain, 'left', nameMax)
      ctx.font = HIST_FONT
      const nw = Math.min(ctx.measureText(h.name).width, nameMax)
      // 順位は大会名の直後に配置（離れすぎ防止）
      if (h.place) txt(h.place, histX + periodW + nw + 10, rowY, HIST_PLACE_FONT, f.textSub, 'left')
    })
  }

  // フッター
  ctx.strokeStyle = f.panelBorder; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(ix, footY - 9); ctx.lineTo(ix + innerW, footY - 9); ctx.stroke()
  txt('FINAL FANTASY XIV © SQUARE ENIX', ix, footY, "8px 'Oswald'", f.textFaint, 'left')
  txt('CC TEAM CARD', ix + innerW, footY, "600 8px 'Oswald'", f.accent, 'right')
}

/* ============================================================
   フォーム
   ============================================================ */
function TeamForm({ initial, onSubmit }) {
  const [team, setTeam] = useState(initial)
  const fileRef = useRef()
  const previewRef = useRef(null)

  // ライブプレビュー：書き出しと同じ drawCard で canvas に描画（差異ゼロ）
  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (document.fonts) { try { await ensureFonts() } catch (e) {} }
      if (cancelled || !previewRef.current) return
      try { await drawCard(previewRef.current, team) } catch (e) { console.error('preview render error:', e) }
    }
    run()
    return () => { cancelled = true }
  }, [team])

  const set = (k, v) => setTeam(t => ({ ...t, [k]: v }))
  const setMember = (i, k, v) => setTeam(t => ({ ...t, members: t.members.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }))
  const setHistory = (i, k, v) => setTeam(t => ({ ...t, history: t.history.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }))
  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => set('screenshotDataUrl', ev.target.result)
    reader.readAsDataURL(file)
  }

  const f = FACTIONS[team.faction]
  const inputStyle = { width: '100%', background: UI.inputBg, border: `1px solid ${UI.inputBorder}`, borderRadius: '8px', padding: '10px 13px', color: UI.text, fontSize: '14px', fontFamily: "'Noto Sans JP',sans-serif", outline: 'none' }
  const smallInput = { ...inputStyle, padding: '8px 10px', fontSize: '13px' }
  const segBtn = (active, color) => ({ flex: 1, padding: '11px 8px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${active ? color : UI.inputBorder}`, background: active ? color + '22' : 'transparent', color: active ? color : UI.textSub, fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: '13px', letterSpacing: '0.08em', transition: 'all 0.15s ease', textAlign: 'center' })

  const placeOptions = ['', '優勝', '準優勝', '3位', 'ベスト4', '予選敗退', '参加']
  const roleOptions = [
    { v: 'player', label: '選手' },
    { v: 'leader', label: 'リーダー' },
    { v: 'support', label: 'サポート' },
    { v: 'manager', label: 'マネージャー' },
  ]

  // 大会履歴の年月（年=2022〜今年 / 月=1〜12）
  const thisYear = new Date().getFullYear()
  const yearOptions = []
  for (let y = thisYear; y >= 2022; y--) yearOptions.push(String(y))
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  // period（'YYYY-MM'）の分解・組立
  const splitPeriod = (p) => { const [y, m] = (p || '').split('-'); return { y: y || '', m: m || '' } }
  const setPeriodPart = (i, part, val) => {
    const cur = splitPeriod(team.history[i].period)
    const next = { ...cur, [part]: val }
    setHistory(i, 'period', (next.y && next.m) ? `${next.y}-${next.m}` : (next.y ? `${next.y}-` : (next.m ? `-${next.m}` : '')))
  }

  // 結成日の年候補（2022〜今年）と組立
  const foundedYearOptions = []
  for (let y = thisYear; y >= 2022; y--) foundedYearOptions.push(String(y))
  const setFoundedPart = (part, val) => {
    const cur = splitPeriod(team.foundedDate)
    const next = { ...cur, [part]: val }
    set('foundedDate', (next.y && next.m) ? `${next.y}-${next.m}` : (next.y ? `${next.y}-` : (next.m ? `-${next.m}` : '')))
  }

  return (
    <div style={{ minHeight: '100vh', background: UI.pageBg, padding: '28px 16px 60px', color: UI.text }}>
      <div style={{ maxWidth: '660px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: '11px', letterSpacing: '0.32em', color: f.accent, textTransform: 'uppercase' }}>Crystal Conflict</div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: '30px', fontWeight: 700, letterSpacing: '0.12em', color: UI.text }}>TEAM CARD</div>
        </div>

        {/* プレビュー：書き出しと同一の drawCard を canvas に描画。
            canvas内部は1920×1080、表示は幅576pxに縮小（16:9・全体表示）。 */}
        <div style={{ width: '576px', maxWidth: '100%', margin: '0 auto 8px', borderRadius: '6px', overflow: 'hidden', boxShadow: f.cardShadow }}>
          <canvas ref={previewRef} style={{ display: 'block', width: '100%', height: 'auto' }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: UI.textFaint, marginBottom: '24px' }}>↑ リアルタイムプレビュー（出力 1920×1080）</div>

        {/* スクショ（プレビュー直下） */}
        <Label>スクリーンショット（横長 16:9 推奨）</Label>
        <div onClick={() => fileRef.current?.click()} style={{ border: `1px dashed ${UI.inputBorder}`, borderRadius: '10px', padding: '18px', textAlign: 'center', cursor: 'pointer', marginBottom: '24px', background: UI.inputBg, color: UI.textSub, fontSize: '13px' }}>
          {team.screenshotDataUrl ? '✅ 画像を設定済み（タップで変更）' : '📷 画像をアップロード'}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>

        {/* 陣営 */}
        <Label>カラー</Label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div onClick={() => set('faction', 'astra')} style={segBtn(team.faction === 'astra', FACTIONS.astra.accent)}>ASTRA <span style={{ fontSize: '10px', opacity: 0.7 }}>／ 白×青</span></div>
          <div onClick={() => set('faction', 'umbra')} style={segBtn(team.faction === 'umbra', FACTIONS.umbra.accent)}>UMBRA <span style={{ fontSize: '10px', opacity: 0.7 }}>／ 黒×赤</span></div>
        </div>

        {/* ロゴ表示 ON/OFF */}
        <div onClick={() => set('showLogo', !team.showLogo)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '11px 14px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${team.showLogo ? f.accent : UI.inputBorder}`, background: team.showLogo ? f.accent + '15' : 'transparent', transition: 'all 0.15s ease' }}>
          <span style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: '13px', color: UI.text }}><b>{FACTIONS[team.faction].name}</b> ロゴを表示</span>
          <span style={{ position: 'relative', width: '40px', height: '22px', borderRadius: '11px', background: team.showLogo ? f.accent : UI.inputBorder, transition: 'background 0.15s ease', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: '2px', left: team.showLogo ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s ease' }} />
          </span>
        </div>

        {/* ヘッダー左右入れ替え */}
        <div onClick={() => set('headerSwap', !team.headerSwap)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', padding: '11px 14px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${team.headerSwap ? f.accent : UI.inputBorder}`, background: team.headerSwap ? f.accent + '15' : 'transparent', transition: 'all 0.15s ease' }}>
          <span style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: '13px', color: UI.text }}>ヘッダーの左右を入れ替え<span style={{ color: UI.textFaint, fontSize: '11px' }}>（{team.headerSwap ? 'ロゴ左／チーム名右' : 'チーム名左／ロゴ右'}）</span></span>
          <span style={{ position: 'relative', width: '40px', height: '22px', borderRadius: '11px', background: team.headerSwap ? f.accent : UI.inputBorder, transition: 'background 0.15s ease', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: '2px', left: team.headerSwap ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s ease' }} />
          </span>
        </div>

        {/* チーム名 */}
        <Label>チーム名</Label>
        <input style={{ ...inputStyle, marginBottom: '12px' }} value={team.teamName} onChange={e => set('teamName', e.target.value)} placeholder="例：Sample" />
        <Label>読み方</Label>
        <input style={{ ...inputStyle, marginBottom: '12px' }} value={team.teamReading} onChange={e => set('teamReading', e.target.value)} placeholder="例：サンプル" />

        {/* 結成日 */}
        <Label>結成日（任意）</Label>
        <div style={{ display: 'flex', gap: '7px', marginBottom: '24px' }}>
          <select style={{ ...smallInput, flex: 1, cursor: 'pointer', appearance: 'none' }} value={splitPeriod(team.foundedDate).y} onChange={e => setFoundedPart('y', e.target.value)}>
            <option value="" style={{ background: '#181820' }}>年</option>
            {foundedYearOptions.map(y => <option key={y} value={y} style={{ background: '#181820' }}>{y}年</option>)}
          </select>
          <select style={{ ...smallInput, flex: 1, cursor: 'pointer', appearance: 'none' }} value={splitPeriod(team.foundedDate).m} onChange={e => setFoundedPart('m', e.target.value)}>
            <option value="" style={{ background: '#181820' }}>月</option>
            {monthOptions.map(m => <option key={m} value={m} style={{ background: '#181820' }}>{Number(m)}月</option>)}
          </select>
        </div>

        {/* メンバー */}
        <Label>メンバー（01＝リーダー ／ 姓・名で入力）</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {team.members.map((m, i) => (
            <div key={i} style={{ background: UI.panelBg, border: `1px solid ${UI.panelBorder}`, borderRadius: '10px', padding: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: '12px', color: f.accent, width: '22px', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <input style={{ ...smallInput, flex: 1 }} value={m.last} onChange={e => setMember(i, 'last', e.target.value)} placeholder="姓（Last）" />
                <input style={{ ...smallInput, flex: 1 }} value={m.first} onChange={e => setMember(i, 'first', e.target.value)} placeholder="名（First）" />
              </div>
              <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                {m.rank && <RankDiamond rank={m.rank} size={20} />}
                <select style={{ ...smallInput, flex: 1, cursor: 'pointer', appearance: 'none' }} value={m.rank} onChange={e => setMember(i, 'rank', e.target.value)}>
                  {RANK_LIST.map(r => <option key={r} value={r} style={{ background: '#181820' }}>{r || 'ランク非表示'}</option>)}
                </select>
                <select style={{ ...smallInput, flex: 1, cursor: 'pointer', appearance: 'none' }} value={m.role} onChange={e => setMember(i, 'role', e.target.value)}>
                  {roleOptions.map(r => <option key={r.v} value={r.v} style={{ background: '#181820' }}>{r.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* 大会履歴 */}
        <Label>大会履歴（5件 ／ 2022年以降）</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
          {team.history.map((h, i) => (
            <div key={i} style={{ background: UI.panelBg, border: `1px solid ${UI.panelBorder}`, borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: '10px', color: f.accent, letterSpacing: '0.1em', marginBottom: '8px' }}>EVENT {String(i + 1).padStart(2, '0')}</div>
              <input style={{ ...smallInput, marginBottom: '7px' }} value={h.name} onChange={e => setHistory(i, 'name', e.target.value)} placeholder="大会名" />
              <div style={{ display: 'flex', gap: '7px' }}>
                <select style={{ ...smallInput, flex: 1, cursor: 'pointer', appearance: 'none' }} value={splitPeriod(h.period).y} onChange={e => setPeriodPart(i, 'y', e.target.value)}>
                  <option value="" style={{ background: '#181820' }}>年</option>
                  {yearOptions.map(y => <option key={y} value={y} style={{ background: '#181820' }}>{y}年</option>)}
                </select>
                <select style={{ ...smallInput, flex: 1, cursor: 'pointer', appearance: 'none' }} value={splitPeriod(h.period).m} onChange={e => setPeriodPart(i, 'm', e.target.value)}>
                  <option value="" style={{ background: '#181820' }}>月</option>
                  {monthOptions.map(m => <option key={m} value={m} style={{ background: '#181820' }}>{Number(m)}月</option>)}
                </select>
                <select style={{ ...smallInput, flex: 1, cursor: 'pointer', appearance: 'none' }} value={h.place} onChange={e => setHistory(i, 'place', e.target.value)}>
                  {placeOptions.map(p => <option key={p} value={p} style={{ background: '#181820' }}>{p || '順位を選択'}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => onSubmit(team)} style={{ width: '100%', padding: '15px', borderRadius: '10px', border: 'none', background: f.accent, color: '#fff', fontFamily: "'Oswald',sans-serif", fontSize: '16px', fontWeight: 700, letterSpacing: '0.14em', cursor: 'pointer', boxShadow: `0 8px 24px ${f.accent}44` }}>カードを生成する →</button>
      </div>
    </div>
  )
}

/* ============================================================
   canvas高解像度レンダリング
   ============================================================ */
function CardView({ team, onEdit }) {
  const [imgSrc, setImgSrc] = useState(null)
  const [generating, setGenerating] = useState(false)
  const f = FACTIONS[team.faction]

  const render = useCallback(async () => {
    setGenerating(true)
    try {
      if (document.fonts) await ensureFonts()
      const cv = document.createElement('canvas')
      await drawCard(cv, team)
      setImgSrc(cv.toDataURL('image/png'))
    } catch (err) {
      console.error('render error:', err)
      alert('画像生成に失敗しました。再試行してください。')
    } finally {
      setGenerating(false)
    }
  }, [team])

  React.useEffect(() => { render() }, [render])

  return (
    <div style={{ minHeight: '100vh', background: UI.pageBg, padding: '28px 16px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {imgSrc ? (
        <img src={imgSrc} alt="team card" style={{ width: `${CARD_W}px`, maxWidth: '100%', borderRadius: '6px', boxShadow: f.cardShadow, animation: 'fadeIn 0.4s ease' }} />
      ) : (
        <div style={{ color: UI.textSub, fontFamily: "'Oswald',sans-serif", padding: '80px 0' }}>{generating ? '⏳ 生成中…' : '準備中…'}</div>
      )}
      <div style={{ maxWidth: `${CARD_W}px`, width: '100%', marginTop: '14px', background: f.accent + '11', border: `1px solid ${f.accent}33`, borderRadius: '10px', padding: '13px 16px', textAlign: 'center', color: UI.text, fontSize: '12px', lineHeight: 1.8 }}>
        <div style={{ color: f.accent, fontWeight: 700, fontFamily: "'Oswald',sans-serif", fontSize: '14px', letterSpacing: '0.1em', marginBottom: '5px' }}>READY FOR STREAM</div>
        💻 画像を右クリック →「名前を付けて保存」で 1920×1080 のPNGとして保存できます
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onEdit} style={{ padding: '10px 22px', background: 'transparent', border: `1px solid ${UI.inputBorder}`, borderRadius: '8px', color: UI.text, fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: '14px', letterSpacing: '0.08em', cursor: 'pointer' }}>← 編集に戻る</button>
        <button onClick={render} disabled={generating} style={{ padding: '10px 22px', background: f.accent, border: 'none', borderRadius: '8px', color: '#fff', fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '0.08em', cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.6 : 1 }}>{generating ? '生成中…' : '↺ 再生成'}</button>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('form')
  const [team, setTeam] = useState(emptyTeam)
  return (
    <>
      <GlobalStyle />
      {view === 'form' ? (
        <TeamForm initial={team} onSubmit={(data) => { setTeam(data); setView('card') }} />
      ) : (
        <CardView team={team} onEdit={() => setView('form')} />
      )}
    </>
  )
}
