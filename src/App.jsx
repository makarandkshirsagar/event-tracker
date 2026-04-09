import { useState, useMemo, useEffect } from "react";

// ── SUPABASE CONFIG ──────────────────────────────────────────────
// Replace these two values with your actual Supabase project credentials
const SUPABASE_URL = "https://zxrajiaadapdogjvvxxz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cmFqaWFhZGFwZG9nanZ2eHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDk1NTAsImV4cCI6MjA5MTIyNTU1MH0.SxBDO1l-9tHQ1vt1frH3qdfj6jz3c8ODByrTCSQaBvo";
const ADMIN_PASSWORD = "admin123"; // Change this to a secure password

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const db = {
  // Events
  getEvents:   ()           => sb("events?select=*&order=created_at.asc"),
  insertEvent: (name)       => sb("events", { method: "POST", body: JSON.stringify({ name }) }),
  deleteEvent: (id)         => sb(`events?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  // Tasks
  getTasks:    (eid)        => sb(`tasks?event_id=eq.${eid}&select=*&order=created_at.asc`),
  insertTask:  (t)          => sb("tasks", { method: "POST", body: JSON.stringify(t) }),
  updateTask:  (id, t)      => sb(`tasks?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(t) }),
  deleteTask:  (id)         => sb(`tasks?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  // Members
  getMembers:  (eid)        => sb(`team_members?event_id=eq.${eid}&select=*&order=created_at.asc`),
  insertMember:(m, eid, email) => sb("team_members", { method: "POST", body: JSON.stringify({ name: m, event_id: eid, email: email||null }) }),
  deleteMember:(id)         => sb(`team_members?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  // Check-ins
  insertCI:    (c)          => sb("daily_checkins", { method: "POST", body: JSON.stringify(c) }),
  // AI Reports
  insertReport:(r)          => sb("ai_reports", { method: "POST", body: JSON.stringify(r) }),
  // Divisions
  getDivisions:   ()        => sb("divisions?select=*&order=sort_order.asc"),
  insertDivision: (d)       => sb("divisions", { method: "POST", body: JSON.stringify(d) }),
  updateDivision: (id, d)   => sb(`divisions?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(d) }),
  deleteDivision: (id)      => sb(`divisions?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
};
// ────────────────────────────────────────────────────────────────

const PRIORITIES = ["Low","Medium","High","Critical"];
const STATUSES   = ["Not Started","In Progress","On Track","At Risk","Blocked","Completed"];

const P_CLR = { Low:"#3b82f6", Medium:"#f59e0b", High:"#f97316", Critical:"#ef4444" };
const S_CLR = { "Not Started":"#9ca3af","In Progress":"#3b82f6","On Track":"#22c55e","At Risk":"#f59e0b","Blocked":"#ef4444","Completed":"#a855f7" };
const S_BG  = { "Not Started":"#f3f4f6","In Progress":"#eff6ff","On Track":"#f0fdf4","At Risk":"#fffbeb","Blocked":"#fef2f2","Completed":"#faf5ff" };

const dot  = (color,size=8) => <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",background:color,flexShrink:0}}/>;
const pill = (label,bg,color) => <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:bg,color,fontWeight:500,whiteSpace:"nowrap"}}>{label}</span>;

const Bar = ({pct,color="#6366f1",h=6}) => (
  <div style={{background:"#e5e7eb",borderRadius:99,height:h,overflow:"hidden"}}>
    <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:99,transition:"width .3s"}}/>
  </div>
);

const Btn = ({children,onClick,variant="primary",small,disabled,style={}}) => {
  const base = {cursor:"pointer",border:"none",borderRadius:10,fontWeight:500,transition:"opacity .15s",opacity:disabled?.5:1,...style};
  const v = {
    primary:{background:"#4f46e5",color:"#fff",padding:small?"4px 12px":"10px 20px",fontSize:small?11:13},
    ghost:  {background:"#f3f4f6",color:"#374151",padding:small?"4px 12px":"10px 20px",fontSize:small?11:13},
    danger: {background:"#fee2e2",color:"#dc2626",padding:"4px 10px",fontSize:11},
    success:{background:"#dcfce7",color:"#16a34a",padding:"4px 10px",fontSize:11},
    info:   {background:"#eff6ff",color:"#2563eb",padding:"4px 10px",fontSize:11},
  };
  return <button onClick={disabled?null:onClick} style={{...base,...v[variant]}}>{children}</button>;
};

const Input = ({label,value,onChange,placeholder,type="text"}) => (
  <div style={{marginBottom:12}}>
    {label&&<div style={{fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",boxSizing:"border-box",background:"#fff"}}/>
  </div>
);

const Select = ({label,value,onChange,options}) => (
  <div style={{marginBottom:12}}>
    {label&&<div style={{fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",background:"#fff",boxSizing:"border-box"}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>
);

const Textarea = ({label,value,onChange,placeholder,rows=2}) => (
  <div style={{marginBottom:12}}>
    {label&&<div style={{fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>}
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",background:"#fff"}}/>
  </div>
);

const Card = ({children,style={}}) => <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:16,marginBottom:12,...style}}>{children}</div>;

const Toast = ({msg,type}) => msg ? (
  <div style={{position:"fixed",bottom:24,right:24,background:type==="error"?"#fee2e2":type==="warning"?"#fffbeb":"#dcfce7",
    color:type==="error"?"#dc2626":type==="warning"?"#92400e":"#15803d",
    border:`1px solid ${type==="error"?"#fca5a5":type==="warning"?"#fcd34d":"#86efac"}`,
    borderRadius:12,padding:"10px 18px",fontSize:13,fontWeight:500,zIndex:999,boxShadow:"0 4px 12px rgba(0,0,0,.1)"}}>
    {msg}
  </div>
) : null;

const blankTask = () => ({title:"",member:"",division:"",priority:"Medium",due:"",notes:""});
const blankCI   = t  => ({status:t.status,progress:t.progress,blocker:t.blocker||"",notes:t.notes||""});

// ── DB NOT CONFIGURED CHECK ──
const isConfigured = SUPABASE_URL !== "YOUR_SUPABASE_URL";

export default function App() {
  const [view,       setView]       = useState("dashboard");
  const [events,     setEvents]     = useState([]);
  const [eventId,    setEventId]    = useState(null);
  const [newEvent,   setNewEvent]   = useState("");
  const [tasks,      setTasks]      = useState([]);
  const [members,    setMembers]    = useState([]);
  const [fDiv,       setFDiv]       = useState("All");
  const [fMember,    setFMember]    = useState("All");
  const [fStatus,    setFStatus]    = useState("All");
  const [taskPanel,  setTaskPanel]  = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [taskForm,   setTaskForm]   = useState(blankTask());
  const [ciTask,     setCiTask]     = useState(null);
  const [ciForm,     setCiForm]     = useState({});
  const [newMember,  setNewMember]  = useState("");
  const [aiReport,   setAiReport]   = useState("");
  const [aiLoading,  setAiLoading]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState({msg:"",type:"success"});
  const [saving,     setSaving]     = useState(false);
  const [currentUser,setCurrentUser] = useState(()=>{ try{ return JSON.parse(sessionStorage.getItem("evtUser"))||null; }catch{ return null; } });
  const [loginTab,   setLoginTab]   = useState("admin");
  const [adminPass,  setAdminPass]  = useState("");
  const [memberInput,setMemberInput] = useState("");
  const [memberEmail,setMemberEmail] = useState("");
  const [sending,    setSending]    = useState(false);
  const [divisions,  setDivisions]  = useState([]);
  const [divForm,    setDivForm]    = useState({name:"",icon:"📁"});
  const [editDivId,  setEditDivId]  = useState(null);

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast({msg:"",type:"success"}), 3000);
  };

  // ── LOAD EVENTS + DIVISIONS ──
  useEffect(() => {
    if (!isConfigured) return;
    const load = async () => {
      setLoading(true);
      try {
        const [evts, divs] = await Promise.all([db.getEvents(), db.getDivisions()]);
        setEvents(evts);
        setDivisions(divs);
      } catch(e) {
        showToast("Failed to load data. Check your credentials.", "error");
      }
      setLoading(false);
    };
    load();
  }, []);

  // ── LOAD TASKS + MEMBERS WHEN EVENT SELECTED ──
  useEffect(() => {
    if (!isConfigured || !eventId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [t, m] = await Promise.all([db.getTasks(eventId), db.getMembers(eventId)]);
        setTasks(t.map(r=>({...r, progress: r.progress||0, blocker: r.blocker||"", notes: r.notes||""})));
        setMembers(m.map(r=>r.name));
        setMemberRows(m);
      } catch(e) {
        showToast("Failed to load data from Supabase.", "error");
      }
      setLoading(false);
    };
    load();
  }, [eventId]);

  const [memberRows, setMemberRows] = useState([]);

  const project = events.find(e => e.id === eventId)?.name || "Event Tracker";
  const isAdmin  = currentUser?.role === "admin";
  const isMember = currentUser?.role === "member";

  // ── AUTH ──
  const login = (role, name = null) => {
    const user = { role, name };
    setCurrentUser(user);
    sessionStorage.setItem("evtUser", JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    setEventId(null);
    setTasks([]); setMembers([]); setMemberRows([]);
    sessionStorage.removeItem("evtUser");
  };

  // ── SEND REMINDERS ──
  const sendReminders = async () => {
    const atRisk = tasks.filter(t => ["Blocked","At Risk"].includes(t.status));
    if (!atRisk.length) { showToast("No blocked or at-risk tasks to remind.", "warning"); return; }
    setSending(true);
    try {
      const memberEmails = {};
      memberRows.forEach(r => { if (r.email) memberEmails[r.name] = r.email; });
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ tasks: atRisk, memberEmails, projectName: project }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Reminder emails sent ✅");
    } catch {
      showToast("Failed to send reminders. Make sure the edge function is deployed.", "error");
    }
    setSending(false);
  };

  // ── EVENT HANDLERS ──
  const createEvent = async () => {
    const name = newEvent.trim();
    if (!name) return;
    try {
      if (isConfigured) {
        const [row] = await db.insertEvent(name);
        setEvents(evts => [...evts, row]);
        setEventId(row.id);
      } else {
        const fake = { id: Date.now(), name, created_at: new Date().toISOString() };
        setEvents(evts => [...evts, fake]);
        setEventId(fake.id);
      }
      setNewEvent("");
    } catch(e) {
      showToast("Failed to create event.", "error");
    }
  };

  const selectEvent = (id) => {
    setTasks([]); setMembers([]); setMemberRows([]);
    setView("dashboard");
    setEventId(id);
  };

  // ── DIVISION CRUD ──
  const saveDivision = async () => {
    if (!divForm.name.trim()) return;
    try {
      if (editDivId) {
        if (isConfigured) await db.updateDivision(editDivId, divForm);
        setDivisions(ds => ds.map(d => d.id === editDivId ? {...d, ...divForm} : d));
        showToast("Division updated ✅");
      } else {
        const sort_order = divisions.length + 1;
        if (isConfigured) {
          const [row] = await db.insertDivision({...divForm, sort_order});
          setDivisions(ds => [...ds, row]);
        } else {
          setDivisions(ds => [...ds, {id: Date.now(), ...divForm, sort_order}]);
        }
        showToast("Division added ✅");
      }
      setDivForm({name:"", icon:"📁"}); setEditDivId(null);
    } catch(e) { showToast("Failed to save division.", "error"); }
  };

  const deleteDivision = async (id) => {
    try {
      if (isConfigured) await db.deleteDivision(id);
      setDivisions(ds => ds.filter(d => d.id !== id));
      showToast("Division deleted", "warning");
    } catch(e) { showToast("Failed to delete division.", "error"); }
  };

  const removeEvent = async (id) => {
    try {
      if (isConfigured) await db.deleteEvent(id);
      setEvents(evts => evts.filter(e => e.id !== id));
      if (eventId === id) setEventId(null);
      showToast("Event deleted", "warning");
    } catch(e) {
      showToast("Failed to delete event.", "error");
    }
  };

  const tf = (k,v) => setTaskForm(f=>({...f,[k]:v}));
  const cf = (k,v) => setCiForm(f=>({...f,[k]:v}));

  const openAdd  = () => { setEditId(null); setTaskForm({...blankTask(), member: isMember ? currentUser.name : ""}); setTaskPanel(true); };
  const openEdit = t  => { setEditId(t.id); setTaskForm({title:t.title,member:t.member,division:t.division,priority:t.priority,due:t.due,notes:t.notes}); setTaskPanel(true); };
  const openCI   = t  => { setCiTask(t); setCiForm(blankCI(t)); };

  // ── SAVE TASK (Create / Update) ──
  const saveTask = async () => {
    if (!taskForm.title||!taskForm.member||!taskForm.division) return;
    setSaving(true);
    try {
      if (editId) {
        if (isConfigured) await db.updateTask(editId, taskForm);
        setTasks(ts=>ts.map(t=>t.id===editId?{...t,...taskForm}:t));
        showToast("Task updated ✅");
      } else {
        const newTask = {...taskForm, status:"Not Started", progress:0, blocker:"", event_id: eventId};
        if (isConfigured) {
          const [saved] = await db.insertTask(newTask);
          setTasks(ts=>[...ts, saved]);
        } else {
          setTasks(ts=>[...ts,{id:Date.now(),...newTask}]);
        }
        showToast("Task created ✅");
      }
      setTaskPanel(false);
    } catch(e) {
      showToast("Failed to save task. Check Supabase.", "error");
    }
    setSaving(false);
  };

  // ── SAVE CHECK-IN (Update task + log check-in row) ──
  const saveCI = async () => {
    setSaving(true);
    try {
      if (isConfigured) {
        await db.updateTask(ciTask.id, {
          status: ciForm.status,
          progress: ciForm.progress,
          blocker: ciForm.blocker,
          notes: ciForm.notes,
        });
        await db.insertCI({
          task_id: ciTask.id,
          member_name: ciTask.member,
          division: ciTask.division,
          status: ciForm.status,
          progress: ciForm.progress,
          blocker: ciForm.blocker,
          notes: ciForm.notes,
          checkin_date: new Date().toISOString().split("T")[0],
          event_id: eventId,
        });
      }
      setTasks(ts=>ts.map(t=>t.id===ciTask.id?{...t,...ciForm}:t));
      showToast("Check-in saved to database ✅");
      setCiTask(null);
    } catch(e) {
      showToast("Failed to save check-in.", "error");
    }
    setSaving(false);
  };

  // ── DELETE TASK ──
  const delTask = async (id) => {
    try {
      if (isConfigured) await db.deleteTask(id);
      setTasks(ts=>ts.filter(t=>t.id!==id));
      showToast("Task deleted", "warning");
    } catch(e) {
      showToast("Failed to delete task.", "error");
    }
  };

  // ── ADD MEMBER ──
  const addMember = async () => {
    const name  = newMember.trim();
    const email = memberEmail.trim() || null;
    if (!name || members.includes(name)) return;
    try {
      if (isConfigured) {
        const [row] = await db.insertMember(name, eventId, email);
        setMemberRows(r=>[...r, row]);
      }
      setMembers(m=>[...m, name]);
      setNewMember(""); setMemberEmail("");
      showToast("Member added ✅");
    } catch(e) {
      showToast("Failed to add member.", "error");
    }
  };

  // ── GENERATE AI REPORT (+ save to DB) ──
  const genAI = async () => {
    setAiLoading(true); setAiReport(""); setView("ai");
    const rows = tasks.map(t=>`Member:${t.member}|Division:${t.division}|Task:${t.title}|Status:${t.status}|Progress:${t.progress}%|Blocker:${t.blocker||"None"}`).join("\n");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ rows, projectName: project }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Edge function error");
      const reportText = d.text || "No response.";
      setAiReport(reportText);

      // Save report to Supabase
      if (isConfigured) {
        await db.insertReport({
          report_date: new Date().toISOString().split("T")[0],
          report_text: reportText,
          project_name: project,
          divisions_covered: [...new Set(tasks.map(t=>t.division))],
          event_id: eventId,
        });
        showToast("Report saved to database ✅");
      }
    } catch {
      setAiReport("Error generating report. Please try again.");
    }
    setAiLoading(false);
  };

  const filtered = useMemo(()=>tasks.filter(t=>
    (isMember ? t.member === currentUser.name : true)&&
    (fDiv==="All"||t.division===fDiv)&&
    (fMember==="All"||t.member===fMember)&&
    (fStatus==="All"||t.status===fStatus)
  ),[tasks,fDiv,fMember,fStatus,isMember,currentUser]);

  const stats = useMemo(()=>({
    total:tasks.length,
    blocked:tasks.filter(t=>t.status==="Blocked").length,
    atRisk:tasks.filter(t=>t.status==="At Risk").length,
    onTrack:tasks.filter(t=>t.status==="On Track").length,
    completed:tasks.filter(t=>t.status==="Completed").length,
  }),[tasks]);

  const mStats = useMemo(()=>members.map(m=>{
    const mt=tasks.filter(t=>t.member===m);
    return {name:m,total:mt.length,blocked:mt.filter(t=>t.status==="Blocked").length,
      atRisk:mt.filter(t=>t.status==="At Risk").length,
      completed:mt.filter(t=>t.status==="Completed").length,
      avg:mt.length?Math.round(mt.reduce((a,t)=>a+t.progress,0)/mt.length):0};
  }),[tasks,members]);

  const navItems = [["dashboard","📊 Dashboard"],["tasks","📋 Tasks"],["team","👥 Team"],["ai","🤖 AI Report"],...(isAdmin?[["divisions","⚙️ Divisions"]]:[]) ];
  const page   = {minHeight:"100vh",background:"#f8f9fb",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"#1f2937",fontSize:14};
  const header = {background:"#312e81",color:"#fff",padding:"12px 20px"};
  const nav    = {background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 20px",display:"flex"};
  const body   = {maxWidth:860,margin:"0 auto",padding:"20px 16px"};

  const CIForm = () => ciTask && (
    <Card style={{border:"2px solid #22c55e",marginBottom:16}}>
      <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Update: {ciTask.title}</div>
      <div style={{fontSize:11,color:"#6b7280",marginBottom:14}}>{ciTask.member} · {ciTask.division}</div>
      <div style={{fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Status</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        {STATUSES.map(s=>(
          <button key={s} onClick={()=>cf("status",s)} style={{padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:500,cursor:"pointer",
            border:`1.5px solid ${ciForm.status===s?S_CLR[s]:"#e5e7eb"}`,
            background:ciForm.status===s?S_BG[s]:"#fff",color:ciForm.status===s?S_CLR[s]:"#6b7280"}}>{s}</button>
        ))}
      </div>
      <div style={{fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Progress — {ciForm.progress}%</div>
      <input type="range" min="0" max="100" step="5" value={ciForm.progress} onChange={e=>cf("progress",Number(e.target.value))}
        style={{width:"100%",accentColor:"#4f46e5",marginBottom:14}}/>
      {(ciForm.status==="Blocked"||ciForm.status==="At Risk")&&(
        <Textarea label="Blocker / Risk Detail" value={ciForm.blocker} onChange={v=>cf("blocker",v)} placeholder="Describe the issue..."/>
      )}
      <Textarea label="Notes" value={ciForm.notes} onChange={v=>cf("notes",v)} placeholder="What was done today?"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",alignItems:"center"}}>
        {saving && <span style={{fontSize:11,color:"#9ca3af"}}>Saving…</span>}
        <Btn variant="ghost" onClick={()=>setCiTask(null)}>Cancel</Btn>
        <Btn variant="success" onClick={saveCI} disabled={saving}>
          {isConfigured ? "💾 Save to Database" : "Save Update"}
        </Btn>
      </div>
    </Card>
  );

  return (
    <div style={page}>
      <Toast {...toast}/>

      {/* ── LOGIN SCREEN ── */}
      {!currentUser && (
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8f9fb"}}>
          <div style={{width:360,background:"#fff",borderRadius:18,padding:32,boxShadow:"0 8px 32px rgba(0,0,0,.1)"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:8}}>🎪</div>
              <div style={{fontSize:20,fontWeight:700}}>Event Tracker</div>
              <div style={{fontSize:13,color:"#6b7280",marginTop:4}}>Sign in to continue</div>
            </div>
            <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1px solid #e5e7eb",marginBottom:20}}>
              {["admin","member"].map(t=>(
                <button key={t} onClick={()=>setLoginTab(t)} style={{flex:1,padding:"8px 0",fontSize:13,fontWeight:500,border:"none",cursor:"pointer",
                  background:loginTab===t?"#4f46e5":"#fff",color:loginTab===t?"#fff":"#6b7280"}}>
                  {t==="admin"?"Admin":"Team Member"}
                </button>
              ))}
            </div>
            {loginTab==="admin" ? (
              <>
                <div style={{fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Password</div>
                <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&adminPass===ADMIN_PASSWORD&&login("admin")}
                  placeholder="Enter admin password..."
                  style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
                <Btn style={{width:"100%"}} onClick={()=>{ if(adminPass===ADMIN_PASSWORD) login("admin"); else showToast("Incorrect password","error"); }}>
                  Sign in as Admin
                </Btn>
              </>
            ) : (
              <>
                <div style={{fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Your Name</div>
                <input value={memberInput} onChange={e=>setMemberInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&memberInput.trim()&&login("member",memberInput.trim())}
                  placeholder="Enter your full name..."
                  style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
                <Btn style={{width:"100%"}} onClick={()=>{ if(memberInput.trim()) login("member",memberInput.trim()); }}>
                  Sign in as Member
                </Btn>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN APP (after login) ── */}
      {currentUser && <>

      {/* Header */}
      <div style={header}>
        <div style={{maxWidth:860,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:"#a5b4fc",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>
              {isAdmin ? "Event Management · Admin" : `Team Member · ${currentUser.name}`}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{color:"#fff",fontSize:17,fontWeight:700}}>{project}</div>
              {eventId && (
                <button onClick={()=>setEventId(null)} style={{background:"#4338ca",border:"none",borderRadius:6,color:"#c7d2fe",fontSize:10,padding:"3px 8px",cursor:"pointer"}}>← Events</button>
              )}
            </div>
          </div>
          <div style={{textAlign:"right",fontSize:11,color:"#a5b4fc"}}>
            <div style={{marginBottom:2,display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
              {dot(isConfigured?"#22c55e":"#f59e0b",8)}
              <span>{isConfigured ? "Connected to Supabase" : "Local Mode (no DB)"}</span>
            </div>
            <div>{new Date().toDateString()}</div>
            {eventId && <div style={{marginTop:2}}>{tasks.length} tasks · {members.length} members</div>}
            <button onClick={logout} style={{marginTop:4,background:"transparent",border:"1px solid #6366f1",borderRadius:6,color:"#a5b4fc",fontSize:10,padding:"2px 8px",cursor:"pointer"}}>Sign out</button>
          </div>
        </div>
      </div>

      {/* Not configured banner */}
      {!isConfigured && (
        <div style={{background:"#fffbeb",borderBottom:"1px solid #fcd34d",padding:"8px 20px",textAlign:"center",fontSize:12,color:"#92400e"}}>
          ⚠️ Running in <strong>Local Mode</strong> — Replace <code>SUPABASE_URL</code> and <code>SUPABASE_KEY</code> at the top of the code to enable database saving.
        </div>
      )}

      {/* Nav — only shown when an event is open */}
      {eventId && (
        <div style={nav}>
          {navItems.map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"12px 16px",fontSize:13,fontWeight:500,border:"none",background:"transparent",cursor:"pointer",
              borderBottom:`2px solid ${view===v?"#4f46e5":"transparent"}`,color:view===v?"#4f46e5":"#6b7280"}}>{l}</button>
          ))}
        </div>
      )}

      <div style={body}>
        {loading && (
          <div style={{textAlign:"center",padding:"60px 0",color:"#9ca3af",fontSize:13}}>
            <div style={{fontSize:32,marginBottom:10}}>⏳</div>
            Loading…
          </div>
        )}

        {/* ── EVENT PICKER ── */}
        {!loading && !eventId && <>
          <div style={{textAlign:"center",padding:"40px 0 24px"}}>
            <div style={{fontSize:36,marginBottom:8}}>🎪</div>
            <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Select an Event</div>
            <div style={{fontSize:13,color:"#6b7280"}}>Choose an existing event or create a new one</div>
          </div>
          <Card>
            <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Create New Event</div>
            <div style={{display:"flex",gap:8}}>
              <input value={newEvent} onChange={e=>setNewEvent(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&createEvent()}
                placeholder="Event name (e.g. Annual Gala 2025)..."
                style={{flex:1,border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none"}}/>
              <Btn onClick={createEvent}>Create</Btn>
            </div>
          </Card>
          {events.length > 0 && <>
            <div style={{fontSize:12,fontWeight:600,color:"#6b7280",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Your Events</div>
            {events.map(e=>(
              <Card key={e.id} style={{padding:"12px 16px",cursor:"pointer"}} onClick={()=>selectEvent(e.id)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{e.name}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>{new Date(e.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <Btn variant="primary" small onClick={ev=>{ev.stopPropagation();selectEvent(e.id);}}>Open →</Btn>
                    <Btn variant="danger"  small onClick={ev=>{ev.stopPropagation();removeEvent(e.id);}}>Delete</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </>}
        </>}

        {!loading && eventId && <>

        {/* ── DASHBOARD ── */}
        {view==="dashboard" && <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[["Tasks",stats.total,"#e0e7ff","#3730a3"],["✅ On Track",stats.onTrack,"#dcfce7","#15803d"],["⚠️ At Risk",stats.atRisk,"#fef9c3","#a16207"],["🚨 Blocked",stats.blocked,"#fee2e2","#b91c1c"]].map(([l,v,bg,c])=>(
              <div key={l} style={{background:bg,borderRadius:12,padding:"14px 10px",textAlign:"center"}}>
                <div style={{fontSize:26,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:11,color:c,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{fontSize:12,fontWeight:600,color:"#6b7280",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Division Health</div>
          {divisions.map(div=>{
            const dt=tasks.filter(t=>t.division===div.name);
            const bl=dt.filter(t=>t.status==="Blocked").length;
            const ar=dt.filter(t=>t.status==="At Risk").length;
            const ot=dt.filter(t=>["On Track","In Progress"].includes(t.status)).length;
            const avg=dt.length?Math.round(dt.reduce((a,t)=>a+t.progress,0)/dt.length):0;
            return (
              <Card key={div.id} style={{padding:"10px 14px",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18,width:24}}>{div.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{div.name}</div>
                    <Bar pct={avg}/>
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af",width:32,textAlign:"right"}}>{avg}%</div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    {ot>0&&<span style={{fontSize:10,background:"#dcfce7",color:"#15803d",padding:"2px 7px",borderRadius:99}}>✅{ot}</span>}
                    {ar>0&&<span style={{fontSize:10,background:"#fef9c3",color:"#a16207",padding:"2px 7px",borderRadius:99}}>⚠️{ar}</span>}
                    {bl>0&&<span style={{fontSize:10,background:"#fee2e2",color:"#b91c1c",padding:"2px 7px",borderRadius:99}}>🚨{bl}</span>}
                    {dt.length===0&&<span style={{fontSize:10,color:"#d1d5db"}}>No tasks</span>}
                  </div>
                </div>
              </Card>
            );
          })}

          <div style={{fontSize:12,fontWeight:600,color:"#6b7280",margin:"16px 0 8px",textTransform:"uppercase",letterSpacing:.5}}>Member Overview</div>
          <Card style={{padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>
                  {["Member","Tasks","Avg Progress","Blocked","Done"].map(h=>(
                    <th key={h} style={{padding:"8px 14px",textAlign:h==="Member"?"left":"center",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:.4}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mStats.map((m,i)=>(
                  <tr key={m.name} style={{borderBottom:i<mStats.length-1?"1px solid #f3f4f6":"none"}}>
                    <td style={{padding:"10px 14px",fontWeight:500}}>{m.name}</td>
                    <td style={{padding:"10px 14px",textAlign:"center",color:"#6b7280"}}>{m.total}</td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{flex:1}}><Bar pct={m.avg}/></div>
                        <span style={{fontSize:11,color:"#9ca3af",width:30}}>{m.avg}%</span>
                      </div>
                    </td>
                    <td style={{textAlign:"center",padding:"10px 14px"}}>{m.blocked>0?<span style={{color:"#dc2626",fontWeight:600}}>{m.blocked}</span>:<span style={{color:"#d1d5db"}}>—</span>}</td>
                    <td style={{textAlign:"center",padding:"10px 14px"}}>{m.completed>0?<span style={{color:"#9333ea",fontWeight:600}}>{m.completed}</span>:<span style={{color:"#d1d5db"}}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <button onClick={genAI} style={{width:"100%",background:"#4f46e5",color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:600,cursor:"pointer",marginTop:8}}>
            🤖 Generate AI Project Report
          </button>
        </>}

        {/* ── TASKS ── */}
        {view==="tasks" && <>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14,alignItems:"center"}}>
            {[["fDiv",fDiv,setFDiv,["All",...divisions.map(d=>d.name)]],["fMember",fMember,setFMember,["All",...members]],["fStatus",fStatus,setFStatus,["All",...STATUSES]]].map(([k,val,set,opts])=>(
              <select key={k} value={val} onChange={e=>set(e.target.value)}
                style={{border:"1px solid #e5e7eb",borderRadius:8,padding:"7px 10px",fontSize:12,background:"#fff",outline:"none"}}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            ))}
            <button onClick={openAdd} style={{marginLeft:"auto",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              {isAdmin ? "+ Assign Task" : "+ Add My Task"}
            </button>
          </div>
          <div style={{fontSize:11,color:"#9ca3af",marginBottom:10}}>{filtered.length} task{filtered.length!==1?"s":""} shown</div>

          {taskPanel && (
            <Card style={{border:"2px solid #6366f1",marginBottom:16}}>
              <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>{editId?"Edit Task":"Assign New Task"}</div>
              <Input label="Task Title" value={taskForm.title} onChange={v=>tf("title",v)} placeholder="What needs to be done?"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {isMember
                  ? <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Assigned To</div><div style={{border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,background:"#f9fafb",color:"#6b7280"}}>{currentUser.name}</div></div>
                  : <Select label="Assign To" value={taskForm.member} onChange={v=>tf("member",v)} options={[{value:"",label:"Select member..."},...members.map(m=>({value:m,label:m}))]}/>
                }
                <Select label="Priority" value={taskForm.priority} onChange={v=>tf("priority",v)} options={PRIORITIES}/>
              </div>
              <Select label="Division" value={taskForm.division} onChange={v=>tf("division",v)} options={[{value:"",label:"Select division..."},...divisions.map(d=>({value:d.name,label:`${d.icon} ${d.name}`}))]}/>
              <Input  label="Due Date" type="date" value={taskForm.due} onChange={v=>tf("due",v)}/>
              <Textarea label="Notes" value={taskForm.notes} onChange={v=>tf("notes",v)} placeholder="Additional context..."/>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",alignItems:"center"}}>
                {saving && <span style={{fontSize:11,color:"#9ca3af"}}>Saving…</span>}
                <Btn variant="ghost" onClick={()=>setTaskPanel(false)}>Cancel</Btn>
                <Btn onClick={saveTask} disabled={saving||!taskForm.title||!taskForm.member||!taskForm.division}>
                  {saving ? "Saving…" : editId ? "Save Changes" : "Assign Task"}
                </Btn>
              </div>
            </Card>
          )}

          {CIForm()}

          {filtered.map(t=>(
            <Card key={t.id} style={{marginBottom:8,padding:"12px 14px"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                {dot(S_CLR[t.status],10)}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",marginBottom:4}}>
                    <span style={{fontWeight:600,fontSize:13}}>{t.title}</span>
                    {pill(t.status,S_BG[t.status],S_CLR[t.status])}
                    {pill(t.priority,"#f3f4f6",P_CLR[t.priority])}
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:6}}>{t.member} · {t.division}{t.due?` · Due ${t.due}`:""}</div>
                  {t.blocker&&<div style={{fontSize:11,color:"#ef4444",marginBottom:6}}>⚠ {t.blocker}</div>}
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1}}><Bar pct={t.progress} color={t.status==="Completed"?"#a855f7":"#6366f1"}/></div>
                    <span style={{fontSize:11,color:"#9ca3af",width:30}}>{t.progress}%</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                  {(isAdmin || t.member === currentUser?.name) && <Btn variant="success" small onClick={()=>openCI(t)}>Update</Btn>}
                  {isAdmin && <Btn variant="info"   small onClick={()=>openEdit(t)}>Edit</Btn>}
                  {isAdmin && <Btn variant="danger" small onClick={()=>delTask(t.id)}>Delete</Btn>}
                </div>
              </div>
            </Card>
          ))}
          {filtered.length===0&&<div style={{textAlign:"center",color:"#9ca3af",padding:"40px 0",fontSize:13}}>No tasks match your filters.</div>}
        </>}

        {/* ── TEAM ── */}
        {view==="team" && <>
          {isAdmin && <Card>
            <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Add Team Member</div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input value={newMember} onChange={e=>setNewMember(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addMember()}
                placeholder="Full name..."
                style={{flex:1,border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none"}}/>
              <input value={memberEmail} onChange={e=>setMemberEmail(e.target.value)}
                placeholder="Email (optional)..."
                style={{flex:1,border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none"}}/>
              <Btn onClick={addMember}>Add</Btn>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <Btn variant="info" small onClick={sendReminders} disabled={sending}>
                {sending ? "Sending…" : "📧 Send Reminders"}
              </Btn>
            </div>
          </Card>}
          {CIForm()}
          {mStats.map(m=>(
            <Card key={m.name}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>{m.name}</div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{m.total} tasks assigned</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:22,fontWeight:700,color:"#4f46e5"}}>{m.avg}%</div>
                  <div style={{fontSize:10,color:"#9ca3af"}}>avg progress</div>
                </div>
              </div>
              <Bar pct={m.avg} h={8}/>
              <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
                {tasks.filter(t=>t.member===m.name).map(t=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                    {dot(S_CLR[t.status])}
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</span>
                    <span style={{fontSize:10,color:"#9ca3af",flexShrink:0}}>{t.division.split(" ")[0]}</span>
                    <span style={{fontSize:11,color:"#9ca3af",width:28,flexShrink:0}}>{t.progress}%</span>
                    <Btn variant="success" small onClick={()=>openCI(t)}>Update</Btn>
                  </div>
                ))}
                {tasks.filter(t=>t.member===m.name).length===0&&<div style={{fontSize:11,color:"#d1d5db"}}>No tasks assigned</div>}
              </div>
            </Card>
          ))}
        </>}

        {/* ── AI REPORT ── */}
        {view==="ai" && (
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:600,fontSize:14}}>🤖 AI Project Report</div>
              <Btn small onClick={genAI} disabled={aiLoading}>{aiLoading?"Generating…":"Regenerate"}</Btn>
            </div>
            {aiLoading&&(
              <div style={{textAlign:"center",padding:"48px 0"}}>
                <div style={{fontSize:36,marginBottom:10}}>🤖</div>
                <div style={{fontSize:13,color:"#9ca3af"}}>Analysing all tasks and members…</div>
              </div>
            )}
            {aiReport&&!aiLoading&&(
              <div style={{fontSize:13,lineHeight:1.8,color:"#374151",whiteSpace:"pre-wrap"}}>{aiReport}</div>
            )}
            {!aiReport&&!aiLoading&&(
              <div style={{textAlign:"center",padding:"48px 0"}}>
                <div style={{fontSize:36,marginBottom:10}}>📊</div>
                <div style={{fontSize:13,color:"#9ca3af",marginBottom:16}}>Generate an intelligent report across all {tasks.length} tasks and {members.length} members</div>
                <Btn onClick={genAI}>Generate Report</Btn>
              </div>
            )}
          </Card>
        )}

        {/* ── DIVISIONS (admin only) ── */}
        {view==="divisions" && isAdmin && <>
          <Card>
            <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>{editDivId ? "Edit Division" : "Add Division"}</div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <div style={{width:64}}>
                <div style={{fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Icon</div>
                <input value={divForm.icon} onChange={e=>setDivForm(f=>({...f,icon:e.target.value}))}
                  style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px",fontSize:20,textAlign:"center",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Division Name</div>
                <input value={divForm.name} onChange={e=>setDivForm(f=>({...f,name:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&saveDivision()}
                  placeholder="e.g. Sponsorship"
                  style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <Btn onClick={saveDivision} disabled={!divForm.name.trim()}>{editDivId?"Save":"Add"}</Btn>
              {editDivId && <Btn variant="ghost" onClick={()=>{setEditDivId(null);setDivForm({name:"",icon:"📁"});}}>Cancel</Btn>}
            </div>
          </Card>

          <div style={{fontSize:12,fontWeight:600,color:"#6b7280",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>
            {divisions.length} Division{divisions.length!==1?"s":""}
          </div>
          {divisions.map(d=>(
            <Card key={d.id} style={{padding:"10px 16px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:22}}>{d.icon}</span>
                <span style={{flex:1,fontWeight:500,fontSize:14}}>{d.name}</span>
                <span style={{fontSize:11,color:"#9ca3af"}}>{tasks.filter(t=>t.division===d.name).length} tasks</span>
                <Btn variant="info"   small onClick={()=>{setEditDivId(d.id);setDivForm({name:d.name,icon:d.icon});}}>Edit</Btn>
                <Btn variant="danger" small onClick={()=>deleteDivision(d.id)}>Delete</Btn>
              </div>
            </Card>
          ))}
          {divisions.length===0 && <div style={{textAlign:"center",color:"#9ca3af",padding:"40px 0",fontSize:13}}>No divisions yet. Add one above.</div>}
        </>}

        </>}
      </div>
      </>}
    </div>
  );
}