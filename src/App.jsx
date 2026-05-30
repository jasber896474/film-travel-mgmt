import { useState, useMemo, useCallback, useEffect } from "react";

const SUPABASE_URL = "https://knoudnzjnfkfhiizgcna.supabase.co";
const SUPABASE_KEY = "sb_publishable_OdfFFai3Ac1NgbelUPlYXQ_8R8IDAhA";
let _token = null;

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${_token || SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
    },
    ...opts,
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const t = await res.text(); return t ? JSON.parse(t) : [];
};

const api = {
  login: (email, pw) => fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pw }),
  }).then(r => r.json()),
  logout: () => fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${_token}` },
  }),
  get: (table, filter) => sb(`${table}?select=*${filter || ""}`),
  insert: (table, data) => sb(table, { method: "POST", body: JSON.stringify(data) }),
  update: (table, id, data) => sb(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (table, id) => sb(`${table}?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  deleteWhere: (table, col, val) => sb(`${table}?${col}=eq.${val}`, { method: "DELETE", prefer: "return=minimal" }),
};

// ─── i18n ──────────────────────────────────────────────────
const LANGS = {
  "zh-TW": "繁體中文",
  "zh-CN": "简体中文",
  "en": "English",
  "ko": "한국어",
  "ja": "日本語",
};

const T = {
  "zh-TW": {
    appName:"劇組交通住宿管理系統", logout:"登出", print:"列印", members:"成員管理", back:"返回",
    loginTitle:"請登入", loginEmail:"電子郵件", loginPw:"密碼", loginBtn:"登入", loginHint:"存取權限由管理員邀請授予",
    projects:"專案列表", newProject:"＋ 新增專案", openProject:"開啟 →", projectName:"專案名稱", projectDesc:"說明（選填）",
    create:"建立", creating:"建立中…", cancel:"取消", save:"儲存", edit:"編輯", delete:"刪除", add:"＋ 新增",
    saved:"✓ 已儲存", deleted:"已刪除",
    tabStaff:"👤 工作人員列表", tabFlight:"✈ 航班管理", tabHotel:"🏨 飯店管理", tabHotelList:"📋 飯店清單",
    staffList:"工作人員列表", flightMgmt:"✈ 航班管理", hotelMgmt:"飯店管理", hotelList:"📋 飯店清單",
    no:"編號", dept:"部門", nameKanji:"姓名（漢字）", nameRoman:"羅馬拼音", importance:"重要度",
    status:"安排狀態", passport:"護照號碼", dob:"出生年月日", passportExp:"護照效期", diet:"飲食限制", action:"操作",
    arranged:"✓ 已安排", partial:"⚡ 部分完成", unArranged:"— 未安排", passportWarn:"⚠ 剩餘不足180天",
    addStaff:"新增工作人員", editStaff:"編輯工作人員",
    airline:"航空公司", flightNo:"航班號", cabin:"艙等", pnr:"訂位代號(PNR)",
    depAirport:"出發機場", depTerminal:"出發航廈", depTime:"出發時間",
    arrAirport:"抵達機場", arrTerminal:"抵達航廈", arrTime:"抵達時間",
    checkedBag:"託運行李", cabinBag:"手提行李", flightDone:"✓ 已安排", flightNone:"未安排", addFlight:"＋ 輸入",
    hotel:"飯店", roomType:"房型", checkIn:"入住日期", checkOut:"退房日期",
    basePrice:"基本房價($/晚)", nights:"住宿天數", totalAmt:"合計金額($)",
    roommate:"同室者", singleRoom:"單人房", hotelDone:"✓ 已安排", hotelNone:"未安排",
    totalCost:"🏨 飯店總費用（全員合計）",
    hotelStats:"📊 各飯店統計", guestCount:"入住人數", roomCount:"客室數", totalSpend:"總費用",
    datePrice:"📅 日期別房價設定", addRule:"＋ 新增規則", addHotel:"＋ 新增飯店",
    date:"日期", basePriceShort:"基本", importanceSurcharge:"重要度加算", holidaySurcharge:"節日加算", finalPrice:"最終房價",
    hotelName:"飯店名稱", hotelAddr:"地址", hotelTel:"電話",
    targetHotel:"對象飯店", customRoomType:"自訂房型", breakdownTitle:"每日房價明細",
    noData:"無資料", searchStaff:"搜尋姓名・部門・護照…", searchFlight:"搜尋姓名・航空公司…",
    searchHotel:"搜尋姓名・飯店…", searchHotelList:"搜尋飯店名・地址・電話…",
    allDept:"全部門", role_admin:"管理員", role_editor:"編輯", role_viewer:"唯讀",
    noProject:"尚無專案", noProjectHint:"建立新專案，或等待管理員邀請", firstProject:"＋ 建立第一個專案",
    deleteConfirm:"確定刪除？", deleteProjConfirm:"確定刪除此專案？所有相關資料也會一併刪除。",
  },
  "zh-CN": {
    appName:"剧组交通住宿管理系统", logout:"登出", print:"打印", members:"成员管理", back:"返回",
    loginTitle:"请登录", loginEmail:"电子邮件", loginPw:"密码", loginBtn:"登录", loginHint:"访问权限由管理员邀请授予",
    projects:"项目列表", newProject:"＋ 新建项目", openProject:"打开 →", projectName:"项目名称", projectDesc:"说明（选填）",
    create:"创建", creating:"创建中…", cancel:"取消", save:"保存", edit:"编辑", delete:"删除", add:"＋ 新增",
    saved:"✓ 已保存", deleted:"已删除",
    tabStaff:"👤 工作人员列表", tabFlight:"✈ 航班管理", tabHotel:"🏨 饭店管理", tabHotelList:"📋 饭店列表",
    staffList:"工作人员列表", flightMgmt:"✈ 航班管理", hotelMgmt:"饭店管理", hotelList:"📋 饭店列表",
    no:"编号", dept:"部门", nameKanji:"姓名（汉字）", nameRoman:"罗马拼音", importance:"重要度",
    status:"安排状态", passport:"护照号码", dob:"出生年月日", passportExp:"护照效期", diet:"饮食限制", action:"操作",
    arranged:"✓ 已安排", partial:"⚡ 部分完成", unArranged:"— 未安排", passportWarn:"⚠ 剩余不足180天",
    addStaff:"新增工作人员", editStaff:"编辑工作人员",
    airline:"航空公司", flightNo:"航班号", cabin:"舱位", pnr:"订座代号(PNR)",
    depAirport:"出发机场", depTerminal:"出发航站", depTime:"出发时间",
    arrAirport:"到达机场", arrTerminal:"到达航站", arrTime:"到达时间",
    checkedBag:"托运行李", cabinBag:"手提行李", flightDone:"✓ 已安排", flightNone:"未安排", addFlight:"＋ 录入",
    hotel:"饭店", roomType:"房型", checkIn:"入住日期", checkOut:"退房日期",
    basePrice:"基本房价($/晚)", nights:"住宿天数", totalAmt:"合计金额($)",
    roommate:"同住者", singleRoom:"单人间", hotelDone:"✓ 已安排", hotelNone:"未安排",
    totalCost:"🏨 饭店总费用（全员合计）",
    hotelStats:"📊 各饭店统计", guestCount:"入住人数", roomCount:"客房数", totalSpend:"总费用",
    datePrice:"📅 日期别房价设置", addRule:"＋ 新增规则", addHotel:"＋ 新增饭店",
    date:"日期", basePriceShort:"基本", importanceSurcharge:"重要度加算", holidaySurcharge:"节日加算", finalPrice:"最终房价",
    hotelName:"饭店名称", hotelAddr:"地址", hotelTel:"电话",
    targetHotel:"对象饭店", customRoomType:"自定义房型", breakdownTitle:"每日房价明细",
    noData:"无数据", searchStaff:"搜索姓名・部门・护照…", searchFlight:"搜索姓名・航空公司…",
    searchHotel:"搜索姓名・饭店…", searchHotelList:"搜索饭店名・地址・电话…",
    allDept:"全部门", role_admin:"管理员", role_editor:"编辑", role_viewer:"只读",
    noProject:"暂无项目", noProjectHint:"创建新项目，或等待管理员邀请", firstProject:"＋ 创建第一个项目",
    deleteConfirm:"确定删除？", deleteProjConfirm:"确定删除此项目？所有相关数据也会一并删除。",
  },
  "en": {
    appName:"Production Travel & Accommodation System", logout:"Logout", print:"Print", members:"Members", back:"Back",
    loginTitle:"Please Login", loginEmail:"Email", loginPw:"Password", loginBtn:"Login", loginHint:"Access is granted by admin invitation",
    projects:"Projects", newProject:"+ New Project", openProject:"Open →", projectName:"Project Name", projectDesc:"Description (optional)",
    create:"Create", creating:"Creating…", cancel:"Cancel", save:"Save", edit:"Edit", delete:"Delete", add:"+ Add",
    saved:"✓ Saved", deleted:"Deleted",
    tabStaff:"👤 Staff List", tabFlight:"✈ Flights", tabHotel:"🏨 Hotels", tabHotelList:"📋 Hotel List",
    staffList:"Staff List", flightMgmt:"✈ Flight Management", hotelMgmt:"Hotel Management", hotelList:"📋 Hotel List",
    no:"No.", dept:"Dept", nameKanji:"Name (Kanji)", nameRoman:"Romanized", importance:"Priority",
    status:"Status", passport:"Passport No.", dob:"Date of Birth", passportExp:"Expiry", diet:"Dietary", action:"Actions",
    arranged:"✓ Arranged", partial:"⚡ Partial", unArranged:"— Pending", passportWarn:"⚠ Expires within 180 days",
    addStaff:"Add Staff", editStaff:"Edit Staff",
    airline:"Airline", flightNo:"Flight No.", cabin:"Cabin", pnr:"PNR",
    depAirport:"Dep. Airport", depTerminal:"Dep. Terminal", depTime:"Dep. Time",
    arrAirport:"Arr. Airport", arrTerminal:"Arr. Terminal", arrTime:"Arr. Time",
    checkedBag:"Checked Bag", cabinBag:"Cabin Bag", flightDone:"✓ Arranged", flightNone:"Pending", addFlight:"+ Input",
    hotel:"Hotel", roomType:"Room Type", checkIn:"Check-in", checkOut:"Check-out",
    basePrice:"Base Price ($/night)", nights:"Nights", totalAmt:"Total ($)",
    roommate:"Roommate", singleRoom:"Single", hotelDone:"✓ Arranged", hotelNone:"Pending",
    totalCost:"🏨 Total Hotel Cost (All Staff)",
    hotelStats:"📊 Hotel Statistics", guestCount:"Guests", roomCount:"Rooms", totalSpend:"Total Cost",
    datePrice:"📅 Date-based Pricing", addRule:"+ Add Rule", addHotel:"+ Add Hotel",
    date:"Date", basePriceShort:"Base", importanceSurcharge:"Priority Sur.", holidaySurcharge:"Holiday Sur.", finalPrice:"Final Price",
    hotelName:"Hotel Name", hotelAddr:"Address", hotelTel:"Phone",
    targetHotel:"Target Hotel", customRoomType:"Custom Room Type", breakdownTitle:"Daily Breakdown",
    noData:"No data", searchStaff:"Search name, dept, passport…", searchFlight:"Search name, airline…",
    searchHotel:"Search name, hotel…", searchHotelList:"Search hotel name, address…",
    allDept:"All Depts", role_admin:"Admin", role_editor:"Editor", role_viewer:"Viewer",
    noProject:"No Projects", noProjectHint:"Create a new project or wait for an admin invitation", firstProject:"+ Create First Project",
    deleteConfirm:"Confirm delete?", deleteProjConfirm:"Delete this project? All related data will be deleted.",
  },
  "ko": {
    appName:"제작진 교통·숙박 관리 시스템", logout:"로그아웃", print:"인쇄", members:"멤버 관리", back:"뒤로",
    loginTitle:"로그인하세요", loginEmail:"이메일", loginPw:"비밀번호", loginBtn:"로그인", loginHint:"접근 권한은 관리자의 초대로 부여됩니다",
    projects:"프로젝트 목록", newProject:"＋ 새 프로젝트", openProject:"열기 →", projectName:"프로젝트명", projectDesc:"설명 (선택)",
    create:"생성", creating:"생성 중…", cancel:"취소", save:"저장", edit:"편집", delete:"삭제", add:"＋ 추가",
    saved:"✓ 저장됨", deleted:"삭제됨",
    tabStaff:"👤 스태프 목록", tabFlight:"✈ 항공편", tabHotel:"🏨 호텔", tabHotelList:"📋 호텔 목록",
    staffList:"스태프 목록", flightMgmt:"✈ 항공편 관리", hotelMgmt:"호텔 관리", hotelList:"📋 호텔 목록",
    no:"번호", dept:"부서", nameKanji:"이름(한자)", nameRoman:"로마자", importance:"중요도",
    status:"배정 상태", passport:"여권 번호", dob:"생년월일", passportExp:"만료일", diet:"식이 제한", action:"작업",
    arranged:"✓ 완료", partial:"⚡ 일부 완료", unArranged:"— 미배정", passportWarn:"⚠ 만료 180일 미만",
    addStaff:"스태프 추가", editStaff:"스태프 편집",
    airline:"항공사", flightNo:"편명", cabin:"좌석 등급", pnr:"예약 코드(PNR)",
    depAirport:"출발 공항", depTerminal:"출발 터미널", depTime:"출발 시각",
    arrAirport:"도착 공항", arrTerminal:"도착 터미널", arrTime:"도착 시각",
    checkedBag:"위탁 수하물", cabinBag:"기내 수하물", flightDone:"✓ 완료", flightNone:"미배정", addFlight:"＋ 입력",
    hotel:"호텔", roomType:"객실 유형", checkIn:"체크인", checkOut:"체크아웃",
    basePrice:"기본 요금($/박)", nights:"숙박 일수", totalAmt:"합계($)",
    roommate:"룸메이트", singleRoom:"1인실", hotelDone:"✓ 완료", hotelNone:"미배정",
    totalCost:"🏨 호텔 총비용 (전원 합계)",
    hotelStats:"📊 호텔별 통계", guestCount:"투숙 인원", roomCount:"객실 수", totalSpend:"총비용",
    datePrice:"📅 날짜별 요금 설정", addRule:"＋ 규칙 추가", addHotel:"＋ 호텔 추가",
    date:"날짜", basePriceShort:"기본", importanceSurcharge:"중요도 할증", holidaySurcharge:"특별일 할증", finalPrice:"최종 요금",
    hotelName:"호텔명", hotelAddr:"주소", hotelTel:"전화",
    targetHotel:"대상 호텔", customRoomType:"사용자 정의 객실", breakdownTitle:"일별 요금 내역",
    noData:"데이터 없음", searchStaff:"이름・부서・여권 검색…", searchFlight:"이름・항공사 검색…",
    searchHotel:"이름・호텔 검색…", searchHotelList:"호텔명・주소・전화 검색…",
    allDept:"전체 부서", role_admin:"관리자", role_editor:"편집자", role_viewer:"열람만",
    noProject:"프로젝트 없음", noProjectHint:"새 프로젝트를 생성하거나 관리자 초대를 기다리세요", firstProject:"＋ 첫 프로젝트 생성",
    deleteConfirm:"삭제하시겠습니까?", deleteProjConfirm:"이 프로젝트를 삭제하시겠습니까? 관련 데이터도 모두 삭제됩니다.",
  },
  "ja": {
    appName:"映像制作 交通・宿泊管理システム", logout:"ログアウト", print:"印刷", members:"メンバー管理", back:"戻る",
    loginTitle:"ログインしてください", loginEmail:"メールアドレス", loginPw:"パスワード", loginBtn:"ログイン", loginHint:"アクセス権は管理者から招待されます",
    projects:"プロジェクト一覧", newProject:"＋ 新規プロジェクト", openProject:"開く →", projectName:"プロジェクト名", projectDesc:"説明（任意）",
    create:"作成", creating:"作成中…", cancel:"キャンセル", save:"保存", edit:"編集", delete:"削除", add:"＋ 追加",
    saved:"✓ 保存しました", deleted:"削除しました",
    tabStaff:"👤 スタッフリスト", tabFlight:"✈ フライト管理", tabHotel:"🏨 ホテル管理", tabHotelList:"📋 ホテルリスト",
    staffList:"スタッフリスト", flightMgmt:"✈ フライト管理", hotelMgmt:"ホテル管理", hotelList:"📋 ホテルリスト",
    no:"No.", dept:"部署", nameKanji:"氏名（漢字）", nameRoman:"ローマ字", importance:"重要度",
    status:"手配状況", passport:"パスポート番号", dob:"生年月日", passportExp:"有効期限", diet:"食事制限", action:"操作",
    arranged:"✓ 手配済", partial:"⚡ 一部完了", unArranged:"— 未手配", passportWarn:"⚠ 残り180日未満",
    addStaff:"スタッフ追加", editStaff:"スタッフ編集",
    airline:"航空会社", flightNo:"便名", cabin:"搭乗クラス", pnr:"PNR予約コード",
    depAirport:"出発空港", depTerminal:"出発ターミナル", depTime:"出発時刻",
    arrAirport:"到着空港", arrTerminal:"到着ターミナル", arrTime:"到着時刻",
    checkedBag:"預け荷物", cabinBag:"機内持込", flightDone:"✓ 手配済", flightNone:"未手配", addFlight:"＋ 入力",
    hotel:"ホテル", roomType:"部屋タイプ", checkIn:"チェックイン", checkOut:"チェックアウト",
    basePrice:"基本料金（$/泊）", nights:"宿泊日数", totalAmt:"合計金額（$）",
    roommate:"同室者", singleRoom:"個室", hotelDone:"✓ 手配済", hotelNone:"未手配",
    totalCost:"🏨 ホテル総費用（全員合計）",
    hotelStats:"📊 ホテル別統計", guestCount:"入室人数", roomCount:"客室数", totalSpend:"総費用",
    datePrice:"📅 日付別料金設定", addRule:"＋ ルール追加", addHotel:"＋ ホテル追加",
    date:"日付", basePriceShort:"基本", importanceSurcharge:"重要度加算", holidaySurcharge:"節日加算", finalPrice:"最終料金",
    hotelName:"ホテル名", hotelAddr:"住所", hotelTel:"電話番号",
    targetHotel:"対象ホテル", customRoomType:"カスタム部屋タイプ", breakdownTitle:"日別料金内訳",
    noData:"データなし", searchStaff:"名前・部署・パスポートで検索…", searchFlight:"名前・航空会社で検索…",
    searchHotel:"名前・ホテルで検索…", searchHotelList:"ホテル名・住所・電話で検索…",
    allDept:"全部署", role_admin:"管理者", role_editor:"編集者", role_viewer:"閲覧のみ",
    noProject:"プロジェクトなし", noProjectHint:"新しいプロジェクトを作成するか、管理者から招待を受けてください", firstProject:"＋ 最初のプロジェクトを作成",
    deleteConfirm:"削除しますか？", deleteProjConfirm:"このプロジェクトを削除しますか？関連するすべてのデータも削除されます。",
  },
};

// ─── helpers ───────────────────────────────────────────────
const today = new Date();
const fmt = d => d ? new Date(d).toLocaleDateString("ja-JP") : "—";
const diffDays = (a, b) => { if (!a || !b) return 0; return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000)); };
const passportWarning = exp => exp && (new Date(exp) - today) / 86400000 < 180;
const starLabel = s => s === 3 ? "★★★" : s === 2 ? "★★" : s === 1 ? "★" : "";
const IMPORTANCE = [3, 2, 1, 0];
const CABIN = ["Economy", "Premium Economy", "Business", "First"];
const ROOM_TYPES = ["Single", "Twin", "Double", "Suite", "Deluxe", "Custom"];
const ROLE_COLORS = { admin: { bg:"#fee2e2", color:"#dc2626" }, editor: { bg:"#dbeafe", color:"#1d4ed8" }, viewer: { bg:"#f3f4f6", color:"#6b7280" } };

// ─── UI helpers ─────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.45)" }}>
      <div style={{ background:"white", borderRadius:16, boxShadow:"0 20px 60px rgba(0,0,0,.3)", width:"100%", maxWidth:wide?700:560, maxHeight:"90vh", overflowY:"auto", margin:"0 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", borderBottom:"1px solid #e5e7eb" }}>
          <h2 style={{ fontWeight:700, fontSize:16, color:"#1e3a8a", margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:"#9ca3af" }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom:12 }}><label style={{ display:"block", fontSize:11, fontWeight:600, color:"#6b7280", marginBottom:4 }}>{label}</label>{children}</div>;
}

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
const thS = { padding:"10px 10px", textAlign:"left", whiteSpace:"nowrap", fontSize:12 };
const tdS = i => ({ padding:"9px 10px", fontSize:12, background:i%2===0?"#fff":"#f8fafc", borderBottom:"1px solid #e5e7eb" });
const tblW = { width:"100%", borderCollapse:"collapse", background:"white", borderRadius:12, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,.08)" };
const thead = { background:"#1e3a8a", color:"white" };
const eBtn = { marginRight:6, fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid #d1d5db", cursor:"pointer", background:"white" };
const dBtn = { fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid #fecaca", cursor:"pointer", background:"#fff5f5", color:"#dc2626" };
const aBtn = { fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid #bfdbfe", cursor:"pointer", background:"#eff6ff", color:"#2563eb" };

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position:"relative", flex:1, minWidth:160 }}>
      <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#9ca3af" }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "検索…"}
        style={{ width:"100%", border:"1px solid #d1d5db", borderRadius:8, padding:"7px 10px 7px 30px", fontSize:13, outline:"none", boxSizing:"border-box" }} />
    </div>
  );
}

function DeptFilter({ depts, value, onChange, allLabel }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ border:"1px solid #d1d5db", borderRadius:8, padding:"7px 10px", fontSize:13, background:"white", minWidth:120 }}>
      <option value="">{allLabel || "全部門"}</option>
      {depts.map(d => <option key={d} value={d}>{d}</option>)}
    </select>
  );
}

function LangSwitcher({ lang, onChange }) {
  return (
    <select value={lang} onChange={e => onChange(e.target.value)}
      style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,.35)", borderRadius:8, padding:"6px 10px", fontSize:13, cursor:"pointer", outline:"none" }}>
      {Object.entries(LANGS).map(([k, v]) => (
        <option key={k} value={k} style={{ background:"#1e3a8a", color:"white" }}>{v}</option>
      ))}
    </select>
  );
}

// ─── Login ──────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("zh-TW");
  const t = T[lang];

  const handleLogin = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.login(email, pw);
      if (res.access_token) { _token = res.access_token; onLogin(res.access_token, res.user, lang); }
      else setError(res.error_description || res.message || "Login failed");
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1e3a8a,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"white", borderRadius:16, padding:40, width:360, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:36 }}>🎬</div>
          <div style={{ fontSize:18, fontWeight:800, color:"#1e3a8a", marginTop:8 }}>{t.appName}</div>
          <div style={{ fontSize:12, color:"#9ca3af", marginTop:4 }}>{t.loginTitle}</div>
        </div>
        <div style={{ marginBottom:18 }}>
          <select value={lang} onChange={e => setLang(e.target.value)}
            style={{ width:"100%", border:"1px solid #d1d5db", borderRadius:8, padding:"8px 12px", fontSize:13, background:"white", outline:"none", cursor:"pointer" }}>
            {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {error && <div style={{ background:"#fef2f2", color:"#dc2626", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:14 }}>{error}</div>}
        <Field label={t.loginEmail}><input className={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} /></Field>
        <Field label={t.loginPw}><input className={inp} type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} /></Field>
        <button onClick={handleLogin} disabled={loading}
          style={{ width:"100%", marginTop:8, background:loading?"#93c5fd":"#2563eb", color:"white", border:"none", borderRadius:8, padding:12, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontSize:15 }}>
          {loading ? "…" : t.loginBtn}
        </button>
        <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center", marginTop:16 }}>{t.loginHint}</p>
      </div>
    </div>
  );
}

// ─── Forms ──────────────────────────────────────────────────
function PersonForm({ init, onSave, onClose, t }) {
  const blank = { dept:"", name_kanji:"", last_roman:"", first_roman:"", importance:0, passport:"", dob:"", passport_exp:"", diet:"" };
  const [f, setF] = useState(init || blank);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.dept}><input className={inp} value={f.dept} onChange={set("dept")} /></Field>
        <Field label={t.nameKanji}><input className={inp} value={f.name_kanji} onChange={set("name_kanji")} /></Field>
        <Field label={t.nameRoman + " (" + t.no + "姓)"}><input className={inp} value={f.last_roman} onChange={set("last_roman")} /></Field>
        <Field label={t.nameRoman + " (" + t.no + "名)"}><input className={inp} value={f.first_roman} onChange={set("first_roman")} /></Field>
        <Field label={t.importance}>
          <select className={inp} value={f.importance} onChange={e => setF(p => ({ ...p, importance:+e.target.value }))}>
            {IMPORTANCE.map(i => <option key={i} value={i}>{i===0?"—":starLabel(i)}</option>)}
          </select>
        </Field>
        <Field label={t.passport}><input className={inp} value={f.passport} onChange={set("passport")} /></Field>
        <Field label={t.dob}><input type="date" className={inp} value={f.dob||""} onChange={set("dob")} /></Field>
        <Field label={t.passportExp}>
          <input type="date" className={inp} value={f.passport_exp||""} onChange={set("passport_exp")}
            style={passportWarning(f.passport_exp)?{borderColor:"red",color:"red"}:{}} />
          {passportWarning(f.passport_exp) && <p style={{ color:"red", fontSize:11, marginTop:4 }}>{t.passportWarn}</p>}
        </Field>
        <Field label={t.diet}><input className={inp} value={f.diet} onChange={set("diet")} /></Field>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d1d5db", cursor:"pointer" }}>{t.cancel}</button>
        <button onClick={() => onSave(f)} style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, cursor:"pointer" }}>{t.save}</button>
      </div>
    </div>
  );
}

function FlightForm({ init, onSave, onClose, t }) {
  const blank = { airline:"", flight_no:"", cabin:"Economy", pnr:"", dep_airport:"", dep_terminal:"", dep_time:"", arr_airport:"", arr_terminal:"", arr_time:"", checked_bag:"", cabin_bag:"" };
  const [f, setF] = useState(init || blank);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.airline}><input className={inp} value={f.airline} onChange={set("airline")} /></Field>
        <Field label={t.flightNo}><input className={inp} value={f.flight_no} onChange={set("flight_no")} /></Field>
        <Field label={t.cabin}><select className={inp} value={f.cabin} onChange={set("cabin")}>{CABIN.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label={t.pnr}><input className={inp} value={f.pnr} onChange={set("pnr")} /></Field>
        <Field label={t.depAirport}><input className={inp} value={f.dep_airport} onChange={set("dep_airport")} /></Field>
        <Field label={t.depTerminal}><input className={inp} value={f.dep_terminal} onChange={set("dep_terminal")} /></Field>
        <Field label={t.depTime}><input type="datetime-local" className={inp} value={f.dep_time||""} onChange={set("dep_time")} /></Field>
        <Field label={t.arrAirport}><input className={inp} value={f.arr_airport} onChange={set("arr_airport")} /></Field>
        <Field label={t.arrTerminal}><input className={inp} value={f.arr_terminal} onChange={set("arr_terminal")} /></Field>
        <Field label={t.arrTime}><input type="datetime-local" className={inp} value={f.arr_time||""} onChange={set("arr_time")} /></Field>
        <Field label={t.checkedBag}><input className={inp} value={f.checked_bag} onChange={set("checked_bag")} /></Field>
        <Field label={t.cabinBag}><input className={inp} value={f.cabin_bag} onChange={set("cabin_bag")} /></Field>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d1d5db", cursor:"pointer" }}>{t.cancel}</button>
        <button onClick={() => onSave(f)} style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, cursor:"pointer" }}>{t.save}</button>
      </div>
    </div>
  );
}

function HotelStayForm({ init, hotels, pricingRules, onSave, onClose, t }) {
  const blank = { hotel_id:"", room_type:"Single", room_custom:"", check_in:"", check_out:"", base_price:"" };
  const [f, setF] = useState(init ? { ...init, hotel_id:init.hotel_id||"" } : blank);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const nights = diffDays(f.check_in, f.check_out);
  const { totalAmount, breakdown } = useMemo(() => {
    if (!f.check_in || !f.check_out || nights === 0) return { totalAmount:0, breakdown:[] };
    const roomLabel = f.room_type === "Custom" ? f.room_custom : f.room_type;
    let total = 0; const bd = [];
    for (let i = 0; i < nights; i++) {
      const d = new Date(f.check_in); d.setDate(d.getDate() + i);
      const ds = d.toISOString().slice(0,10);
      const rule = pricingRules.find(r => +r.hotel_id === +f.hotel_id && r.date === ds &&
        (r.room_type === roomLabel || (r.room_type === "Custom" && r.room_custom === roomLabel)));
      const price = rule ? (+rule.final_price||0) : (+f.base_price||0);
      total += price; bd.push({ date:ds, price, fromRule:!!rule });
    }
    return { totalAmount:total, breakdown:bd };
  }, [f, nights, pricingRules]);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.hotel}>
          <select className={inp} value={f.hotel_id} onChange={set("hotel_id")}>
            <option value="">-- {t.hotel} --</option>
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </Field>
        <Field label={t.roomType}><select className={inp} value={f.room_type} onChange={set("room_type")}>{ROOM_TYPES.map(r => <option key={r}>{r}</option>)}</select></Field>
        {f.room_type === "Custom" && <Field label={t.customRoomType}><input className={inp} value={f.room_custom} onChange={set("room_custom")} /></Field>}
        <Field label={t.checkIn}><input type="date" className={inp} value={f.check_in||""} onChange={set("check_in")} /></Field>
        <Field label={t.checkOut}><input type="date" className={inp} value={f.check_out||""} onChange={set("check_out")} /></Field>
        <Field label={t.basePrice}><input type="number" className={inp} value={f.base_price} onChange={set("base_price")} /></Field>
        <Field label={t.nights}><input className={inp} value={nights||""} readOnly style={{ background:"#f5f5f5" }} /></Field>
        <Field label={t.totalAmt}><input className={inp} value={totalAmount?`$${totalAmount.toLocaleString()}`:"—"} readOnly style={{ background:"#f5f5f5", fontWeight:700, color:"#2563eb" }} /></Field>
      </div>
      {breakdown.length > 0 && (
        <div style={{ marginTop:10, background:"#f8fafc", borderRadius:8, padding:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", marginBottom:6 }}>{t.breakdownTitle}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {breakdown.map(b => (
              <span key={b.date} style={{ fontSize:11, padding:"2px 7px", borderRadius:4, background:b.fromRule?"#dbeafe":"#f3f4f6", color:b.fromRule?"#1d4ed8":"#374151", border:b.fromRule?"1px solid #93c5fd":"1px solid #e5e7eb" }}>
                {b.date.slice(5)} ${b.price.toLocaleString()}{b.fromRule?" *":""}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d1d5db", cursor:"pointer" }}>{t.cancel}</button>
        <button onClick={() => onSave({ ...f, nights, total_amount:totalAmount })} style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, cursor:"pointer" }}>{t.save}</button>
      </div>
    </div>
  );
}

function HotelMasterForm({ init, onSave, onClose, t }) {
  const [f, setF] = useState(init || { name:"", address:"", tel:"" });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <Field label={t.hotelName}><input className={inp} value={f.name} onChange={set("name")} /></Field>
      <Field label={t.hotelAddr}><input className={inp} value={f.address} onChange={set("address")} /></Field>
      <Field label={t.hotelTel}><input className={inp} value={f.tel} onChange={set("tel")} /></Field>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d1d5db", cursor:"pointer" }}>{t.cancel}</button>
        <button onClick={() => onSave(f)} style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, cursor:"pointer" }}>{t.save}</button>
      </div>
    </div>
  );
}

function PricingRuleForm({ init, hotelId, hotelName, onSave, onClose, t }) {
  const blank = { date:"", room_type:"Single", room_custom:"", base_price:"", importance_surcharge:"0", holiday_surcharge:"0" };
  const [f, setF] = useState(init || blank);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const final = (+f.base_price||0) + (+f.importance_surcharge||0) + (+f.holiday_surcharge||0);
  return (
    <div>
      <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"8px 14px", marginBottom:14, fontSize:13, color:"#1d4ed8" }}>
        🏨 {hotelName}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.date}><input type="date" className={inp} value={f.date||""} onChange={set("date")} /></Field>
        <Field label={t.roomType}><select className={inp} value={f.room_type} onChange={set("room_type")}>{ROOM_TYPES.map(r => <option key={r}>{r}</option>)}</select></Field>
        {f.room_type === "Custom" && <Field label={t.customRoomType}><input className={inp} value={f.room_custom} onChange={set("room_custom")} /></Field>}
        <Field label={t.basePriceShort + " ($)"}><input type="number" className={inp} value={f.base_price} onChange={set("base_price")} /></Field>
        <Field label={t.importanceSurcharge}><input type="number" className={inp} value={f.importance_surcharge} onChange={set("importance_surcharge")} /></Field>
        <Field label={t.holidaySurcharge}><input type="number" className={inp} value={f.holiday_surcharge} onChange={set("holiday_surcharge")} /></Field>
        <Field label={t.finalPrice}><input className={inp} value={`$${final.toLocaleString()}`} readOnly style={{ background:"#f5f5f5", fontWeight:700, color:"#2563eb" }} /></Field>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d1d5db", cursor:"pointer" }}>{t.cancel}</button>
        <button onClick={() => onSave({ ...f, hotel_id:hotelId, final_price:final })} style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, cursor:"pointer" }}>{t.save}</button>
      </div>
    </div>
  );
}

function RoommateModal({ pid, persons, roommates, onSave, onClose, t }) {
  const current = roommates.filter(r => r.person_id === pid).map(r => r.partner_id);
  const [selected, setSelected] = useState(current);
  const person = persons.find(p => p.id === pid);
  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <Modal title={t.roommateSet + " — " + (person?.name_kanji||"")} onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:300, overflowY:"auto" }}>
        {persons.filter(p => p.id !== pid).map(p => (
          <label key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, cursor:"pointer", border:`1px solid ${selected.includes(p.id)?"#2563eb":"#e5e7eb"}`, background:selected.includes(p.id)?"#eff6ff":"white" }}>
            <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
            <span style={{ fontWeight:600, fontSize:13 }}>{p.name_kanji}</span>
            <span style={{ fontSize:12, color:"#6b7280" }}>{p.last_roman} {p.first_roman} / {p.dept}</span>
          </label>
        ))}
      </div>
      <div style={{ marginTop:12, padding:"8px 12px", background:"#f8fafc", borderRadius:8, fontSize:12 }}>
        {selected.length === 0 ? t.roommateNone : selected.map(id => persons.find(p=>p.id===id)?.name_kanji).join("、")}
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d1d5db", cursor:"pointer" }}>{t.cancel}</button>
        <button onClick={() => onSave(pid, selected)} style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, cursor:"pointer" }}>{t.save}</button>
      </div>
    </Modal>
  );
}

// ─── Project Selector ────────────────────────────────────────
function ProjectSelector({ user, lang, onLangChange, onSelect }) {
  const t = T[lang];
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const load = async () => {
    setLoading(true);
    try {
      const up = await api.get("user_projects", `&user_id=eq.${user.id}`);
      if (up.length === 0) { setProjects([]); setLoading(false); return; }
      const projIds = up.map(r => r.project_id);
      const projs = await sb(`projects?id=in.(${projIds.join(",")})`);
      const merged = up.map(r => ({
        ...r,
        projects: projs.find(p => p.id === r.project_id) || { id: r.project_id, name: "（名前なし）", description: "" },
      }));
      setProjects(merged);
    } catch (e) { showToast("Error: " + e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createProject = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const [proj] = await api.insert("projects", { name:newName, description:newDesc, created_by:user.id });
      await api.insert("user_projects", { user_id:user.id, project_id:proj.id, role:"admin" });
      showToast(t.saved); setNewName(""); setNewDesc(""); setShowNew(false); load();
    } catch (e) { showToast("Error: " + e.message); }
    setSaving(false);
  };

  const deleteProject = async (pid) => {
    if (!window.confirm(t.deleteProjConfirm)) return;
    await api.delete("projects", pid);
    showToast(t.deleted); load();
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8" }}>
      {toast && <div style={{ position:"fixed", top:20, right:20, zIndex:999, background:"#1e3a8a", color:"white", borderRadius:10, padding:"10px 20px", fontSize:13, fontWeight:600 }}>{toast}</div>}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", padding:"16px 24px", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800 }}>🎬 {t.appName}</div>
          <div style={{ fontSize:11, opacity:.75 }}>{user.email}</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <LangSwitcher lang={lang} onChange={onLangChange} />
          <button onClick={() => { api.logout(); window.location.reload(); }}
            style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,.3)", borderRadius:8, padding:"7px 14px", fontWeight:600, cursor:"pointer", fontSize:12 }}>
            🔒 {t.logout}
          </button>
        </div>
      </div>
      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:"#1e3a8a", margin:0 }}>📁 {t.projects}</h2>
          <button onClick={() => setShowNew(true)}
            style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:14 }}>{t.newProject}</button>
        </div>
        {loading ? <div style={{ textAlign:"center", padding:40, color:"#9ca3af" }}>…</div> : (
          projects.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, background:"white", borderRadius:16, boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📂</div>
              <div style={{ fontSize:16, fontWeight:600, color:"#374151", marginBottom:8 }}>{t.noProject}</div>
              <div style={{ fontSize:13, color:"#9ca3af", marginBottom:20 }}>{t.noProjectHint}</div>
              <button onClick={() => setShowNew(true)}
                style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"10px 24px", fontWeight:700, cursor:"pointer" }}>{t.firstProject}</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
              {projects.map(up => (
                <div key={up.id} style={{ background:"white", borderRadius:14, boxShadow:"0 2px 12px rgba(0,0,0,.08)", overflow:"hidden" }}>
                  <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", padding:"20px 20px 16px", color:"white" }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>🎬</div>
                    <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>{up.projects?.name || "—"}</div>
                    {up.projects?.description && <div style={{ fontSize:12, opacity:.8 }}>{up.projects.description}</div>}
                  </div>
                  <div style={{ padding:"14px 20px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20, ...ROLE_COLORS[up.role] }}>{t[`role_${up.role}`]}</span>
                      <span style={{ fontSize:11, color:"#9ca3af" }}>{up.projects?.created_at ? new Date(up.projects.created_at).toLocaleDateString() : ""}</span>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => onSelect(up.projects, up.role)}
                        style={{ flex:1, background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                        {t.openProject}
                      </button>
                      {up.role === "admin" && (
                        <button onClick={() => deleteProject(up.project_id)} style={{ ...dBtn, padding:"8px 12px" }}>🗑</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      {showNew && (
        <Modal title={t.newProject} onClose={() => setShowNew(false)}>
          <Field label={t.projectName}><input className={inp} value={newName} onChange={e => setNewName(e.target.value)} /></Field>
          <Field label={t.projectDesc}><input className={inp} value={newDesc} onChange={e => setNewDesc(e.target.value)} /></Field>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
            <button onClick={() => setShowNew(false)} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d1d5db", cursor:"pointer" }}>{t.cancel}</button>
            <button onClick={createProject} disabled={saving||!newName.trim()}
              style={{ background:saving||!newName.trim()?"#93c5fd":"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px 20px", fontWeight:700, cursor:"pointer" }}>
              {saving ? t.creating : t.create}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Main Project App ────────────────────────────────────────
function ProjectApp({ project, userRole, user, lang, onLangChange, onBack }) {
  const pid = project.id;
  const canEdit = userRole === "admin" || userRole === "editor";
  const t = T[lang];
  const [tab, setTab] = useState("A");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [persons, setPersons] = useState([]);
  const [flights, setFlights] = useState([]);
  const [stays, setStays] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [roommates, setRoommates] = useState([]);
  const [searchA, setSearchA] = useState(""); const [deptA, setDeptA] = useState("");
  const [searchB, setSearchB] = useState(""); const [deptB, setDeptB] = useState("");
  const [searchC, setSearchC] = useState(""); const [deptC, setDeptC] = useState("");
  const [searchD, setSearchD] = useState("");
  const [personModal, setPersonModal] = useState(null);
  const [flightModal, setFlightModal] = useState(null);
  const [stayModal, setStayModal] = useState(null);
  const [hotelModal, setHotelModal] = useState(null);
  const [priceModal, setPriceModal] = useState(null);
  const [roommateModal, setRoommateModal] = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const pf = `&project_id=eq.${pid}`;
      const [p, f, s, h, pr, rm] = await Promise.all([
        api.get("persons", pf), api.get("flights", pf), api.get("stays", pf),
        api.get("hotels", pf), api.get("pricing_rules", pf), api.get("roommates", pf),
      ]);
      setPersons(p); setFlights(f); setStays(s); setHotels(h); setPricingRules(pr); setRoommates(rm);
    } catch (e) { showToast("Error: " + e.message); }
    setLoading(false);
  }, [pid]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const allDepts = useMemo(() => [...new Set(persons.map(p => p.dept).filter(Boolean))], [persons]);
  const getStatus = useCallback((id) => {
    const f = flights.find(fl => fl.person_id === id);
    const s = stays.find(st => st.person_id === id);
    const hasF = f && f.airline && f.flight_no;
    const hasS = s && s.hotel_id && s.check_in && s.check_out;
    if (hasF && hasS) return "arranged";
    if (hasF || hasS) return "partial";
    return "none";
  }, [flights, stays]);

  const filterPersons = (q, dept) => persons.filter(p => {
    const kw = q.toLowerCase();
    const match = !kw || [p.name_kanji,p.last_roman,p.first_roman,p.dept,p.passport,p.diet].some(v => (v||"").toLowerCase().includes(kw));
    return match && (!dept || p.dept === dept);
  });

  const getHotelName = id => hotels.find(h => h.id == id)?.name || "—";
  const getRoommateNames = id => roommates.filter(r => r.person_id === id).map(r => persons.find(p => p.id === r.partner_id)?.name_kanji).filter(Boolean).join("、");
  const totalHotelCost = useMemo(() => stays.reduce((s, st) => s + (st.total_amount||0), 0), [stays]);
  const hotelStats = useMemo(() => {
    const map = {};
    hotels.forEach(h => { map[h.id] = { guests:0, rooms:0, total:0 }; });
    stays.forEach(s => {
      if (!s.hotel_id) return;
      if (!map[s.hotel_id]) map[s.hotel_id] = { guests:0, rooms:0, total:0 };
      map[s.hotel_id].guests += 1; map[s.hotel_id].rooms += 1; map[s.hotel_id].total += (s.total_amount||0);
    });
    return map;
  }, [stays, hotels]);

  const savePerson = async f => {
    try {
      if (personModal.mode === "add") { const [r] = await api.insert("persons", { ...f, project_id:pid }); setPersons(p => [...p, r]); }
      else { const [r] = await api.update("persons", personModal.data.id, f); setPersons(p => p.map(x => x.id===personModal.data.id?r:x)); }
      showToast(t.saved); setPersonModal(null);
    } catch (e) { showToast("Error: " + e.message); }
  };
  const deletePerson = async id => {
    if (!window.confirm(t.deleteConfirm)) return;
    await api.delete("persons", id);
    setPersons(p => p.filter(x => x.id !== id));
    showToast(t.deleted);
  };
  const saveFlight = async f => {
    try {
      const existing = flights.find(fl => fl.person_id === flightModal.pid);
      const data = { ...f, person_id:flightModal.pid, project_id:pid };
      if (existing) { const [r] = await api.update("flights", existing.id, data); setFlights(fl => fl.map(x => x.id===existing.id?r:x)); }
      else { const [r] = await api.insert("flights", data); setFlights(fl => [...fl, r]); }
      showToast(t.saved); setFlightModal(null);
    } catch (e) { showToast("Error: " + e.message); }
  };
  const saveStay = async f => {
    try {
      const existing = stays.find(s => s.person_id === stayModal.pid);
      const data = { ...f, person_id:stayModal.pid, project_id:pid };
      if (existing) { const [r] = await api.update("stays", existing.id, data); setStays(s => s.map(x => x.id===existing.id?r:x)); }
      else { const [r] = await api.insert("stays", data); setStays(s => [...s, r]); }
      showToast(t.saved); setStayModal(null);
    } catch (e) { showToast("Error: " + e.message); }
  };
  const saveHotel = async f => {
    try {
      if (hotelModal.mode === "add") { const [r] = await api.insert("hotels", { ...f, project_id:pid }); setHotels(h => [...h, r]); }
      else { const [r] = await api.update("hotels", hotelModal.data.id, f); setHotels(h => h.map(x => x.id===hotelModal.data.id?r:x)); }
      showToast(t.saved); setHotelModal(null);
    } catch (e) { showToast("Error: " + e.message); }
  };
  const deleteHotel = async id => {
    if (!window.confirm(t.deleteConfirm)) return;
    await api.delete("hotels", id); setHotels(h => h.filter(x => x.id !== id));
    showToast(t.deleted);
  };
  const savePricing = async f => {
    try {
      if (priceModal.mode === "add") { const [r] = await api.insert("pricing_rules", { ...f, project_id:pid }); setPricingRules(rs => [...rs, r]); }
      else { const [r] = await api.update("pricing_rules", priceModal.data.id, f); setPricingRules(rs => rs.map(x => x.id===priceModal.data.id?r:x)); }
      showToast(t.saved); setPriceModal(null);
    } catch (e) { showToast("Error: " + e.message); }
  };
  const deletePricing = async id => {
    await api.delete("pricing_rules", id); setPricingRules(rs => rs.filter(r => r.id !== id));
  };
  const saveRoommates = async (rpid, partnerIds) => {
    try {
      await api.deleteWhere("roommates", "person_id", rpid);
      if (partnerIds.length > 0) {
        await api.insert("roommates", partnerIds.map(rid => ({ person_id:rpid, partner_id:rid, project_id:pid })));
        for (const rid of partnerIds) {
          await api.deleteWhere("roommates", "person_id", rid);
          const all = [...new Set([rpid, ...partnerIds.filter(x => x !== rid)])];
          await api.insert("roommates", all.map(x => ({ person_id:rid, partner_id:x, project_id:pid })));
        }
      }
      await loadAll(); showToast(t.saved); setRoommateModal(null);
    } catch (e) { showToast("Error: " + e.message); }
  };

  const TABS = [
    { id:"A", label:t.tabStaff },
    { id:"B", label:t.tabFlight },
    { id:"C", label:t.tabHotel },
    { id:"D", label:t.tabHotelList },
  ];

  const statusBadge = status => {
    if (status === "arranged") return <span style={{ padding:"2px 8px", borderRadius:20, background:"#d1fae5", color:"#065f46", fontSize:11, fontWeight:700 }}>{t.arranged}</span>;
    if (status === "partial")  return <span style={{ padding:"2px 8px", borderRadius:20, background:"#fef3c7", color:"#92400e", fontSize:11, fontWeight:700 }}>{t.partial}</span>;
    return <span style={{ padding:"2px 8px", borderRadius:20, background:"#f3f4f6", color:"#9ca3af", fontSize:11 }}>{t.unArranged}</span>;
  };

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", minHeight:"100vh", background:"#f0f4f8" }}>
      {toast && <div style={{ position:"fixed", top:20, right:20, zIndex:999, background:"#1e3a8a", color:"white", borderRadius:10, padding:"10px 20px", fontSize:13, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,.2)" }}>{toast}</div>}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", padding:"14px 24px", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,.3)", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13 }}>← {t.back}</button>
          <div>
            <div style={{ fontSize:17, fontWeight:800 }}>🎬 {project.name}</div>
            <div style={{ fontSize:11, opacity:.75 }}>☁ {user.email} · <span style={{ padding:"1px 6px", borderRadius:10, background:"rgba(255,255,255,0.2)", fontSize:10 }}>{t[`role_${userRole}`]}</span></div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <LangSwitcher lang={lang} onChange={onLangChange} />
          <button onClick={() => window.print()} style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,.3)", borderRadius:8, padding:"7px 14px", fontWeight:600, cursor:"pointer", fontSize:12 }}>🖨 {t.print}</button>
        </div>
      </div>

      <div className="no-print" style={{ background:"white", borderBottom:"2px solid #e5e7eb", display:"flex", paddingLeft:14 }}>
        {TABS.map(tab2 => (
          <button key={tab2.id} onClick={() => setTab(tab2.id)}
            style={{ padding:"11px 18px", fontWeight:tab===tab2.id?700:400, color:tab===tab2.id?"#2563eb":"#6b7280", borderBottom:tab===tab2.id?"3px solid #2563eb":"3px solid transparent", background:"none", border:"none", cursor:"pointer", fontSize:13 }}>
            {tab2.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign:"center", padding:40, color:"#6b7280" }}>…</div> : (
        <div style={{ padding:"18px 14px", maxWidth:1280, margin:"0 auto" }}>

          {tab === "A" && (() => {
            const rows = filterPersons(searchA, deptA);
            return (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                  <h2 style={{ fontSize:17, fontWeight:700, color:"#1e3a8a", margin:0 }}>{t.staffList}</h2>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                    <SearchBar value={searchA} onChange={setSearchA} placeholder={t.searchStaff} />
                    <DeptFilter depts={allDepts} value={deptA} onChange={setDeptA} allLabel={t.allDept} />
                    {canEdit && <button onClick={() => setPersonModal({ mode:"add", data:null })}
                      style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, cursor:"pointer", fontSize:13 }}>{t.add}</button>}
                  </div>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={tblW}>
                    <thead><tr style={thead}>{[t.no,t.dept,t.nameKanji,t.nameRoman,t.importance,t.status,t.passport,t.dob,t.passportExp,t.diet,t.action].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((p, i) => {
                        const warn = passportWarning(p.passport_exp);
                        return (
                          <tr key={p.id}>
                            <td style={tdS(i)}>{p.id}</td>
                            <td style={tdS(i)}>{p.dept}</td>
                            <td style={{ ...tdS(i), fontWeight:p.importance===3?700:400, color:p.importance===3?"#dc2626":"inherit" }}>
                              {p.name_kanji}{p.importance===3&&<span style={{ marginLeft:4, fontSize:10, background:"#fee2e2", color:"#dc2626", borderRadius:4, padding:"1px 5px" }}>★★★</span>}
                            </td>
                            <td style={tdS(i)}>{p.last_roman} {p.first_roman}</td>
                            <td style={{ ...tdS(i), color:p.importance===3?"#dc2626":p.importance===2?"#d97706":"#6b7280" }}>{starLabel(p.importance)||"—"}</td>
                            <td style={tdS(i)}>{statusBadge(getStatus(p.id))}</td>
                            <td style={tdS(i)}>{p.passport}</td>
                            <td style={tdS(i)}>{fmt(p.dob)}</td>
                            <td style={{ ...tdS(i), color:warn?"#dc2626":"inherit", fontWeight:warn?700:400 }}>{fmt(p.passport_exp)}{warn&&" ⚠"}</td>
                            <td style={tdS(i)}>{p.diet||"—"}</td>
                            <td style={{ ...tdS(i), whiteSpace:"nowrap" }}>
                              {canEdit && <><button style={eBtn} onClick={() => setPersonModal({ mode:"edit", data:p })}>{t.edit}</button>
                              <button style={dBtn} onClick={() => deletePerson(p.id)}>{t.delete}</button></>}
                            </td>
                          </tr>
                        );
                      })}
                      {rows.length===0 && <tr><td colSpan={11} style={{ padding:20, textAlign:"center", color:"#9ca3af" }}>{t.noData}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {tab === "B" && (() => {
            const rows = filterPersons(searchB, deptB);
            return (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                  <h2 style={{ fontSize:17, fontWeight:700, color:"#1e3a8a", margin:0 }}>{t.flightMgmt}</h2>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <SearchBar value={searchB} onChange={setSearchB} placeholder={t.searchFlight} />
                    <DeptFilter depts={allDepts} value={deptB} onChange={setDeptB} allLabel={t.allDept} />
                  </div>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={tblW}>
                    <thead><tr style={thead}>{[t.no,t.dept,t.nameKanji,t.nameRoman,t.airline,t.flightNo,"Class",t.pnr,t.depAirport,t.depTime,t.arrAirport,t.arrTime,t.checkedBag+"/"+t.cabinBag,t.status,t.action].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((p, i) => {
                        const f = flights.find(fl => fl.person_id===p.id); const hasF = f&&f.airline;
                        return (
                          <tr key={p.id}>
                            <td style={tdS(i)}>{p.id}</td><td style={tdS(i)}>{p.dept}</td>
                            <td style={{ ...tdS(i), fontWeight:p.importance===3?700:400, color:p.importance===3?"#dc2626":"inherit" }}>{p.name_kanji}</td>
                            <td style={tdS(i)}>{p.last_roman} {p.first_roman}</td>
                            <td style={tdS(i)}>{f?.airline||"—"}</td><td style={tdS(i)}>{f?.flight_no||"—"}</td>
                            <td style={tdS(i)}>{f?.cabin||"—"}</td><td style={tdS(i)}>{f?.pnr||"—"}</td>
                            <td style={tdS(i)}>{f?`${f.dep_airport}${f.dep_terminal?" T"+f.dep_terminal:""}`:"—"}</td>
                            <td style={tdS(i)}>{f?.dep_time?new Date(f.dep_time).toLocaleString("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"—"}</td>
                            <td style={tdS(i)}>{f?`${f.arr_airport}${f.arr_terminal?" T"+f.arr_terminal:""}`:"—"}</td>
                            <td style={tdS(i)}>{f?.arr_time?new Date(f.arr_time).toLocaleString("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"—"}</td>
                            <td style={tdS(i)}>{f?`${f.checked_bag||"—"}/${f.cabin_bag||"—"}`:"—"}</td>
                            <td style={tdS(i)}>{hasF?<span style={{ padding:"2px 8px",borderRadius:20,background:"#d1fae5",color:"#065f46",fontSize:11,fontWeight:700 }}>{t.flightDone}</span>:<span style={{ padding:"2px 8px",borderRadius:20,background:"#f3f4f6",color:"#9ca3af",fontSize:11 }}>{t.flightNone}</span>}</td>
                            <td style={{ ...tdS(i), whiteSpace:"nowrap" }}>
                              {canEdit&&<button style={aBtn} onClick={() => setFlightModal({ pid:p.id, data:f||null })}>{hasF?t.edit:t.addFlight}</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {tab === "C" && (() => {
            const rows = filterPersons(searchC, deptC);
            return (
              <div>
                <div style={{ background:"linear-gradient(90deg,#1e3a8a,#2563eb)", color:"white", borderRadius:12, padding:"13px 20px", marginBottom:18, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{t.totalCost}</div>
                  <div style={{ fontSize:24, fontWeight:900 }}>${totalHotelCost.toLocaleString()}</div>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                  <h2 style={{ fontSize:17, fontWeight:700, color:"#1e3a8a", margin:0 }}>{t.hotelMgmt}</h2>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <SearchBar value={searchC} onChange={setSearchC} placeholder={t.searchHotel} />
                    <DeptFilter depts={allDepts} value={deptC} onChange={setDeptC} allLabel={t.allDept} />
                  </div>
                </div>
                <div style={{ overflowX:"auto", marginBottom:28 }}>
                  <table style={tblW}>
                    <thead><tr style={thead}>{[t.no,t.dept,t.nameKanji,t.hotel,t.roomType,t.checkIn,t.checkOut,t.nights,t.totalAmt,t.roommate,t.status,t.action].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((p, i) => {
                        const s = stays.find(st => st.person_id===p.id); const hasS = s&&s.hotel_id&&s.check_in;
                        const roomLabel = s?.room_type==="Custom"?(s.room_custom||"Custom"):s?.room_type;
                        return (
                          <tr key={p.id}>
                            <td style={tdS(i)}>{p.id}</td><td style={tdS(i)}>{p.dept}</td>
                            <td style={{ ...tdS(i), fontWeight:p.importance===3?700:400, color:p.importance===3?"#dc2626":"inherit" }}>{p.name_kanji}</td>
                            <td style={tdS(i)}>{s?getHotelName(s.hotel_id):"—"}</td>
                            <td style={tdS(i)}>{roomLabel||"—"}</td>
                            <td style={tdS(i)}>{fmt(s?.check_in)}</td><td style={tdS(i)}>{fmt(s?.check_out)}</td>
                            <td style={tdS(i)}>{s?.nights||"—"}</td>
                            <td style={{ ...tdS(i), fontWeight:700, color:"#2563eb" }}>{s?.total_amount?`$${s.total_amount.toLocaleString()}`:"—"}</td>
                            <td style={tdS(i)}>{getRoommateNames(p.id)?<span style={{ fontSize:11,background:"#fef3c7",color:"#92400e",borderRadius:4,padding:"2px 7px" }}>🛏 {getRoommateNames(p.id)}</span>:<span style={{ fontSize:11,color:"#9ca3af" }}>{t.singleRoom}</span>}</td>
                            <td style={tdS(i)}>{hasS?<span style={{ padding:"2px 8px",borderRadius:20,background:"#d1fae5",color:"#065f46",fontSize:11,fontWeight:700 }}>{t.hotelDone}</span>:<span style={{ padding:"2px 8px",borderRadius:20,background:"#f3f4f6",color:"#9ca3af",fontSize:11 }}>{t.hotelNone}</span>}</td>
                            <td style={{ ...tdS(i), whiteSpace:"nowrap" }}>
                              {canEdit&&<><button style={aBtn} onClick={() => setStayModal({ pid:p.id, data:s||null })}>{hasS?t.edit:t.add}</button>
                              <button style={{ ...eBtn, marginLeft:4 }} onClick={() => setRoommateModal({ pid:p.id })}>🛏</button></>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 style={{ fontSize:15, fontWeight:700, color:"#1e3a8a", marginBottom:12 }}>{t.hotelStats}</h3>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
                    {hotels.map(h => {
                      const st = hotelStats[h.id]||{ guests:0, rooms:0, total:0 };
                      return (
                        <div key={h.id} style={{ background:"white", borderRadius:12, padding:16, boxShadow:"0 2px 8px rgba(0,0,0,.08)", borderLeft:"4px solid #2563eb" }}>
                          <div style={{ fontWeight:700, fontSize:13, color:"#1e3a8a", marginBottom:10 }}>🏨 {h.name}</div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" }}>
                            <div style={{ background:"#eff6ff", borderRadius:8, padding:"8px 4px" }}><div style={{ fontSize:20, fontWeight:900, color:"#2563eb" }}>{st.guests}</div><div style={{ fontSize:10, color:"#6b7280" }}>{t.guestCount}</div></div>
                            <div style={{ background:"#f0fdf4", borderRadius:8, padding:"8px 4px" }}><div style={{ fontSize:20, fontWeight:900, color:"#16a34a" }}>{st.rooms}</div><div style={{ fontSize:10, color:"#6b7280" }}>{t.roomCount}</div></div>
                            <div style={{ background:"#fefce8", borderRadius:8, padding:"8px 4px" }}><div style={{ fontSize:14, fontWeight:900, color:"#ca8a04" }}>${st.total.toLocaleString()}</div><div style={{ fontSize:10, color:"#6b7280" }}>{t.totalSpend}</div></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {tab === "D" && (() => {
            const kw = searchD.toLowerCase();
            const fh = hotels.filter(h => !kw||[h.name,h.address,h.tel].some(v=>(v||"").toLowerCase().includes(kw)));
            return (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                  <h2 style={{ fontSize:17, fontWeight:700, color:"#1e3a8a", margin:0 }}>{t.hotelList}</h2>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <SearchBar value={searchD} onChange={setSearchD} placeholder={t.searchHotelList} />
                    {canEdit&&<button onClick={() => setHotelModal({ mode:"add", data:null })}
                      style={{ background:"#2563eb", color:"white", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, cursor:"pointer", fontSize:13, whiteSpace:"nowrap" }}>{t.addHotel}</button>}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                  {fh.map(h => {
                    const hRules = [...pricingRules.filter(r => +r.hotel_id===h.id)].sort((a,b)=>a.date>b.date?1:-1);
                    return (
                      <div key={h.id} style={{ background:"white", borderRadius:12, boxShadow:"0 2px 8px rgba(0,0,0,.08)", overflow:"hidden" }}>
                        <div style={{ borderLeft:"4px solid #2563eb", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:15, color:"#1e3a8a", marginBottom:4 }}>🏨 {h.name}</div>
                            <div style={{ fontSize:12, color:"#6b7280" }}>📍 {h.address}</div>
                            <div style={{ fontSize:12, color:"#6b7280" }}>📞 {h.tel}</div>
                          </div>
                          {canEdit&&<div style={{ display:"flex", gap:8, marginLeft:12 }}>
                            <button style={eBtn} onClick={() => setHotelModal({ mode:"edit", data:h })}>{t.edit}</button>
                            <button style={dBtn} onClick={() => deleteHotel(h.id)}>{t.delete}</button>
                          </div>}
                        </div>
                        <div style={{ borderTop:"1px solid #e5e7eb", padding:"12px 16px", background:"#fafafa" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:"#374151" }}>{t.datePrice}</div>
                            {canEdit&&<button onClick={() => setPriceModal({ mode:"add", data:null, hotelId:h.id, hotelName:h.name })}
                              style={{ background:"#2563eb", color:"white", border:"none", borderRadius:7, padding:"4px 12px", fontWeight:700, cursor:"pointer", fontSize:12 }}>{t.addRule}</button>}
                          </div>
                          {hRules.length===0?<p style={{ color:"#9ca3af", fontSize:12, margin:0 }}>{t.noData}</p>:(
                            <div style={{ overflowX:"auto" }}>
                              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                                <thead><tr style={{ background:"#e5e7eb" }}>{[t.date,t.roomType,t.basePriceShort,t.importanceSurcharge,t.holidaySurcharge,t.finalPrice,t.action].map(l => <th key={l} style={{ padding:"6px 10px", textAlign:"left", fontWeight:600 }}>{l}</th>)}</tr></thead>
                                <tbody>
                                  {hRules.map(r => (
                                    <tr key={r.id} style={{ borderBottom:"1px solid #e5e7eb" }}>
                                      <td style={{ padding:"6px 10px" }}>{r.date}</td>
                                      <td style={{ padding:"6px 10px" }}>{r.room_type==="Custom"?(r.room_custom||"Custom"):r.room_type}</td>
                                      <td style={{ padding:"6px 10px" }}>${(+r.base_price||0).toLocaleString()}</td>
                                      <td style={{ padding:"6px 10px" }}>${(+r.importance_surcharge||0).toLocaleString()}</td>
                                      <td style={{ padding:"6px 10px" }}>${(+r.holiday_surcharge||0).toLocaleString()}</td>
                                      <td style={{ padding:"6px 10px", fontWeight:700, color:"#2563eb" }}>${(+r.final_price||0).toLocaleString()}</td>
                                      {canEdit&&<td style={{ padding:"6px 10px", whiteSpace:"nowrap" }}>
                                        <button style={eBtn} onClick={() => setPriceModal({ mode:"edit", data:r, hotelId:h.id, hotelName:h.name })}>{t.edit}</button>
                                        <button style={dBtn} onClick={() => deletePricing(r.id)}>{t.delete}</button>
                                      </td>}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {personModal&&<Modal title={personModal.mode==="add"?t.addStaff:t.editStaff} onClose={() => setPersonModal(null)}><PersonForm init={personModal.data} onSave={savePerson} onClose={() => setPersonModal(null)} t={t} /></Modal>}
      {flightModal&&<Modal title={`${t.flightMgmt} — ${persons.find(p=>p.id===flightModal.pid)?.name_kanji||""}`} onClose={() => setFlightModal(null)}><FlightForm init={flightModal.data} onSave={saveFlight} onClose={() => setFlightModal(null)} t={t} /></Modal>}
      {stayModal&&<Modal title={`${t.hotelMgmt} — ${persons.find(p=>p.id===stayModal.pid)?.name_kanji||""}`} onClose={() => setStayModal(null)}><HotelStayForm init={stayModal.data} hotels={hotels} pricingRules={pricingRules} onSave={saveStay} onClose={() => setStayModal(null)} t={t} /></Modal>}
      {hotelModal&&<Modal title={hotelModal.mode==="add"?t.addHotel:t.hotelName} onClose={() => setHotelModal(null)}><HotelMasterForm init={hotelModal.data} onSave={saveHotel} onClose={() => setHotelModal(null)} t={t} /></Modal>}
      {priceModal&&<Modal title={priceModal.mode==="add"?t.addRule:t.datePrice} onClose={() => setPriceModal(null)}><PricingRuleForm init={priceModal.data} hotelId={priceModal.hotelId} hotelName={priceModal.hotelName} onSave={savePricing} onClose={() => setPriceModal(null)} t={t} /></Modal>}
      {roommateModal&&<RoommateModal pid={roommateModal.pid} persons={persons} roommates={roommates} onSave={saveRoommates} onClose={() => setRoommateModal(null)} t={t} />}

      <style>{`@media print { .no-print { display:none !important; } body { background:white; } @page { size:A4 landscape; margin:10mm; } }`}</style>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [lang, setLang] = useState("zh-TW");

  const handleLogin = async (t, u, loginLang) => {
    _token = t; setToken(t); setUser(u);
    try {
      const rows = await api.get("user_settings", `&user_id=eq.${u.id}`);
      if (rows.length > 0) setLang(rows[0].language);
      else setLang(loginLang || "zh-TW");
    } catch { setLang(loginLang || "zh-TW"); }
  };

  const handleLangChange = async newLang => {
    setLang(newLang);
    if (user) {
      try {
        await sb("user_settings", {
          method:"POST",
          prefer:"return=representation,resolution=merge-duplicates",
          body:JSON.stringify({ user_id:user.id, language:newLang }),
        });
      } catch(e) { console.error(e); }
    }
  };

  const handleSelectProject = (proj, role) => { setProject(proj); setUserRole(role); };
  const handleBack = () => { setProject(null); setUserRole(null); };

  if (!token) return <LoginScreen onLogin={handleLogin} />;
  if (!project) return <ProjectSelector user={user} lang={lang} onLangChange={handleLangChange} onSelect={handleSelectProject} />;
  return <ProjectApp project={project} userRole={userRole} user={user} lang={lang} onLangChange={handleLangChange} onBack={handleBack} />;
}
