"use client";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, Box, Check, Circle, Coins, Cuboid, Globe2, Layers3, LockKeyhole, LogIn, Play, RotateCcw, Save, Trash2, TreePine } from "lucide-react";
import SceneViewport3D from "../../../components/scene-viewport-3d";

type Engine = "2d" | "3d";
type Kind = "block" | "platform" | "coin" | "checkpoint" | "tree";
type SceneObject = { id: string; type: Kind; x: number; y: number; z: number; w: number; h: number; d: number; color: string; rotationY?: number };
type Scene = { schemaVersion: 1; objects: SceneObject[] };
type Project = { id: string; owner_id: string; title: string; description: string; engine: Engine; template: string; scene: Scene };
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
let browserClient: SupabaseClient | null = null;
function getSupabase() { if (!supabaseUrl || !supabaseKey) return null; if (!browserClient) browserClient = createClient(supabaseUrl, supabaseKey); return browserClient; }
const colors = ["#f2bd45", "#e65d37", "#9acb4a", "#5b8fe8", "#a98bd8", "#f4efe5"];
const starterGround = (engine: Engine): Scene => ({ schemaVersion: 1, objects: [] });
export default function StudioEditor() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [transformMode,setTransformMode]=useState<"translate"|"rotate"|"scale">("translate");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(false);
  const [message, setMessage] = useState("");
  const [builderPrompt, setBuilderPrompt] = useState("");
  const [builderBusy, setBuilderBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useMemo(() => objects.find(o => o.id === selected) ?? null, [objects, selected]);
  const handleSceneSelect = useCallback((objectId: string | null) => setSelected(objectId), []);
  const handleSceneTransform = useCallback((objectId:string,position:{x:number;y:number;z:number},scale:{x:number;y:number;z:number},rotationY:number)=>{
    setObjects(items=>items.map(item=>item.id===objectId?{...item,x:Number(position.x.toFixed(3)),y:Number((position.y-scale.y/2).toFixed(3)),z:Number(position.z.toFixed(3)),w:Number(Math.max(.25,scale.x).toFixed(3)),h:Number(Math.max(.25,scale.y).toFixed(3)),d:Number(Math.max(.25,scale.z).toFixed(3)),rotationY:Number(rotationY.toFixed(3))}:item));
    setSaved(false);
  },[]);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setError("Konfigurasi Supabase Studio belum dipasang."); setLoading(false); return; }
    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) { setAuthRequired(true); setLoading(false); return; }
    setUserId(user.id);
    const { data, error: projectError } = await sb.from("hub_creator_projects")
      .select("id,owner_id,title,description,engine,template,scene")
      .eq("id", id).eq("owner_id", user.id).single();
    if (projectError || !data) { setError("Project tidak ditemukan, atau akun ini bukan pemiliknya."); setLoading(false); return; }
    const scene = (data.scene ?? starterGround(data.engine)) as Scene;
    if (data.engine !== "3d") {
      const { error: engineError } = await sb.from("hub_creator_projects").update({ engine: "3d" }).eq("id", id).eq("owner_id", user.id);
      if (engineError) { setError("Gagal mengubah project lama ke mode 3D: " + engineError.message); setLoading(false); return; }
    }
    setProject({ ...data, engine: "3d" } as Project);
    setObjects(Array.isArray(scene.objects) ? scene.objects : []);
    const { data: pub } = await sb.from("hub_creator_publications").select("project_id").eq("project_id", id).maybeSingle();
    setPublished(Boolean(pub));
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || project.engine === "3d") return;
    const W = 1200, H = 700;
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = "#b9d5e5"; ctx.fillRect(0, 0, W, H);
    // The 3D engine is rendered by SceneViewport3D; this canvas is 2D-only.

      ctx.fillStyle = "#85bb6c"; ctx.fillRect(0, 520, W, 180); ctx.strokeStyle = "#24352d"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0,520); ctx.lineTo(W,520); ctx.stroke();
      ctx.strokeStyle = "rgba(28,52,39,.13)"; ctx.lineWidth = 1;
      for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,520); ctx.lineTo(x,700); ctx.stroke(); }
      for (const o of objects) {
        const x = 600 + o.x * 42, y = 520 - o.y * 35, w = o.w * 30, h = o.h * 30;
        ctx.fillStyle = o.color; ctx.strokeStyle = selected === o.id ? "#fff16a" : "#24352d"; ctx.lineWidth = selected === o.id ? 5 : 2.5;
        if (o.type === "coin") { ctx.beginPath(); ctx.arc(x,y-24,19,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
        else if (o.type === "checkpoint") { ctx.fillRect(x-5,y-65,10,65); ctx.fillStyle="#e65d37"; ctx.fillRect(x+5,y-65,45,28); ctx.strokeRect(x+5,y-65,45,28); }
        else { ctx.fillRect(x-w/2,y-h,w,h); ctx.strokeRect(x-w/2,y-h,w,h); }
      }
    ctx.fillStyle = "rgba(15,27,22,.7)"; ctx.fillRect(20,20,220,38);
    ctx.fillStyle = "#f5f7e8"; ctx.font = "bold 16px Arial"; ctx.fillText("2D WORLD / SIDE VIEW", 34,45);
  }, [project, objects, selected]);

  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * 1200 / rect.width, y: (e.clientY - rect.top) * 700 / rect.height };
  }
  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!project) return;
    const p = canvasPoint(e);
    let nearest: SceneObject | null = null, best = 105 * 105;
    for (const o of objects) {
      const cx = project.engine === "3d" ? 600 + (o.x - o.z) * 34 : 600 + o.x * 42;
      const cy = project.engine === "3d" ? 365 + (o.x + o.z) * 17 : 520 - o.y * 35;
      const d = (p.x - cx) ** 2 + (p.y - cy) ** 2;
      if (d < best) { best = d; nearest = o; }
    }
    if (!nearest) { setSelected(null); return; }
    setSelected(nearest.id);
    const world = project.engine === "3d"
      ? { x: ((p.x - 600) / 34 + (p.y - 365) / 17) / 2, z: ((p.y - 365) / 17 - (p.x - 600) / 34) / 2 }
      : { x: (p.x - 600) / 42, z: (520 - p.y) / 35 };
    dragRef.current = { id: nearest.id, offsetX: nearest.x - world.x, offsetY: (project.engine === "3d" ? nearest.z : nearest.y) - world.z };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || !project) return;
    const p = canvasPoint(e);
    const world = project.engine === "3d"
      ? { x: ((p.x - 600) / 34 + (p.y - 365) / 17) / 2, z: ((p.y - 365) / 17 - (p.x - 600) / 34) / 2 }
      : { x: (p.x - 600) / 42, z: (520 - p.y) / 35 };
    setObjects(items => items.map(o => o.id === drag.id ? {
      ...o, x: Number((world.x + drag.offsetX).toFixed(2)),
      ...(project.engine === "3d" ? { z: Number((world.z + drag.offsetY).toFixed(2)) } : { y: Number((world.z + drag.offsetY).toFixed(2)) })
    } : o));
    setSaved(false);
  }
  function pointerUp() { dragRef.current = null; }

  async function signIn(e: FormEvent) {
    e.preventDefault(); setError(""); const sb = getSupabase(); if (!sb) return;
    const { error: signError } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (signError) { setError("Login gagal. Periksa email dan password akun ROBLOX HUB."); return; }
    setLoading(true); setAuthRequired(false); await load();
  }
  function add(type: Kind) {
    const n = objects.length;
    const item: SceneObject = { id: crypto.randomUUID(), type, x: (n % 5) - 2, y: type === "coin" ? 2 : 0, z: Math.floor(n / 5), w: type === "platform" ? 2.5 : type === "tree" ? 1.5 : 1, h: type === "platform" ? .5 : type === "tree" ? 3 : 1, d: type === "platform" ? 2.5 : type === "tree" ? 1.5 : 1, color: type === "coin" ? "#f4bd38" : type === "checkpoint" ? "#e65d37" : type === "tree" ? "#3d8d43" : colors[n % colors.length] };
    setObjects(v => [...v, item]); setSelected(item.id); setSaved(false); setMessage("");
  }
  function patch(values: Partial<SceneObject>) { if (!selected) return; setObjects(v => v.map(o => o.id === selected ? { ...o, ...values } : o)); setSaved(false); setMessage(""); }
  async function buildWithZakssAI(e: FormEvent) {
    e.preventDefault();
    if (builderBusy || !builderPrompt.trim()) return;
    if (objects.length >= 200) { setError("Maksimal 200 objek per dunia."); return; }
    setBuilderBusy(true); setError(""); setMessage("Zakss AI sedang memahami perintah dan scene...");
    try {
      const response = await fetch("/api/zakss-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: builderPrompt.trim(),
          existingCount: objects.length,
          existingObjects: objects.slice(-200),
          selectedObjectId: selected,
        }),
      });
      type BuilderOperation =
        | { action: "add"; object: Omit<SceneObject, "id"> }
        | { action: "update"; id: string; changes: Partial<Omit<SceneObject, "id">> }
        | { action: "delete"; id: string };
      const data = await response.json() as { operations?: BuilderOperation[]; summary?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Zakss AI Builder gagal.");

      const operations = Array.isArray(data.operations) ? data.operations.slice(0, 40) : [];
      const normalized: BuilderOperation[] = [];
      const created: SceneObject[] = [];
      for (const operation of operations) {
        if (operation.action === "add") {
          if (objects.length + created.length >= 200) continue;
          const item: SceneObject = { ...operation.object, id: crypto.randomUUID() };
          created.push(item);
          normalized.push({ action: "add", object: item });
        } else if ((operation.action === "update" || operation.action === "delete") && objects.some(item => item.id === operation.id)) {
          normalized.push(operation);
        }
      }
      if (!normalized.length) throw new Error(data.summary || "Belum ada perubahan yang bisa diterapkan. Coba jelaskan objek atau perintahnya lebih detail.");

      setObjects(current => {
        let next = [...current];
        for (const operation of normalized) {
          if (operation.action === "add") next.push(operation.object as SceneObject);
          else if (operation.action === "update") next = next.map(item => item.id === operation.id ? { ...item, ...operation.changes } : item);
          else if (operation.action === "delete") next = next.filter(item => item.id !== operation.id);
        }
        return next.slice(0, 200);
      });
      if (created.length) setSelected(created[0].id);
      else if (normalized.some(operation => operation.action === "delete" && operation.id === selected)) setSelected(null);
      setSaved(false);
      const addCount = normalized.filter(operation => operation.action === "add").length;
      const updateCount = normalized.filter(operation => operation.action === "update").length;
      const deleteCount = normalized.filter(operation => operation.action === "delete").length;
      const actionReport = [addCount ? `+${addCount} objek` : "", updateCount ? `${updateCount} diubah` : "", deleteCount ? `${deleteCount} dihapus` : ""].filter(Boolean).join(" · ");
      setMessage(`${data.summary || "Selesai!"} ${actionReport ? "(" + actionReport + ")" : ""}`.trim());
      setBuilderPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zakss AI Builder gagal.");
      setMessage("");
    } finally { setBuilderBusy(false); }
  }

  async function save() {
    const sb = getSupabase(); if (!sb || !project || !userId) return;
    if (objects.length > 200) { setError("Maksimal 200 objek per dunia."); return; }
    setSaving(true); setError(""); setMessage("");
    const { error: saveError } = await sb.from("hub_creator_projects").update({ engine: "3d", scene: { schemaVersion: 1, objects }, updated_at: new Date().toISOString() }).eq("id", project.id).eq("owner_id", userId);
    if (saveError) setError("Gagal menyimpan: " + saveError.message); else { setSaved(true); setMessage("Perubahan dunia tersimpan."); }
    setSaving(false);
  }
  async function publish() {
    const sb = getSupabase(); if (!sb || !project || !userId) return;
    setPublishing(true); setError(""); setMessage("");
    const { error: saveError } = await sb.from("hub_creator_projects").update({ scene: { schemaVersion: 1, objects }, updated_at: new Date().toISOString() }).eq("id", project.id).eq("owner_id", userId);
    if (saveError) { setError("Simpan sebelum publish gagal: " + saveError.message); setPublishing(false); return; }
    const { error: pubError } = await sb.from("hub_creator_publications").upsert({ project_id: project.id, owner_id: userId, title: project.title, description: project.description, engine: "3d", template: project.template, scene: { schemaVersion: 1, objects }, published_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "project_id" });
    if (pubError) setError("Publish gagal: " + pubError.message); else { setPublished(true); setSaved(true); setMessage("Game berhasil dipublikasikan. Buka Community Worlds di ROBLOX HUB untuk memainkannya."); }
    setPublishing(false);
  }

  if (loading) return <main className="studio-loading">CONNECTING TO YOUR WORLD...</main>;
  if (authRequired) return <main className="studio-login"><div className="login-card"><div className="brand-mark">RH<span>STUDIO</span></div><LockKeyhole size={30}/><h1>MASUK KE STUDIO</h1><p>Gunakan email dan password akun ROBLOX HUB yang sama. Studio memakai database dan akun yang sama.</p><form onSubmit={signIn}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{error&&<p className="error-text">{error}</p>}<button className="primary-btn"><LogIn size={17}/> LOGIN & OPEN PROJECT</button></form><a href="https://roblox-hub-project-of-zakss.vercel.app/creator">KEMBALI KE ROBLOX HUB</a></div></main>;
  if (!project) return <main className="studio-loading"><p>{error || "Project tidak tersedia."}</p><a href="https://roblox-hub-project-of-zakss.vercel.app/creator">Kembali ke ROBLOX HUB</a></main>;

  return <main className="studio-app">
    <header className="studio-topbar"><a href="https://roblox-hub-project-of-zakss.vercel.app/creator" className="back-link"><ArrowLeft size={17}/> HUB</a><div className="brand-mark">ROBLOX HUB <span>STUDIO</span></div><div className="project-name"><i/>{project.title}</div><div className="top-actions"><a className="play-test-btn" href={`https://roblox-hub-project-of-zakss.vercel.app/creator/play/${project.id}`}><Play size={16}/>PLAY TEST</a><button onClick={()=>void save()} disabled={saving}><Save size={16}/>{saving?"SAVING":saved?"SAVED":"SAVE"}</button><button className="publish-btn" onClick={()=>void publish()} disabled={publishing}><Globe2 size={16}/>{publishing?"PUBLISHING":published?"UPDATE PUBLISH":"PUBLISH"}</button></div></header>
    <div className="studio-workspace"><aside className="tool-panel"><div style={{padding:"12px",marginBottom:"12px",border:"1px solid rgba(95,255,125,.35)",borderRadius:"12px",background:"linear-gradient(145deg,rgba(15,45,27,.96),rgba(8,15,12,.96))"}}><div style={{display:"flex",alignItems:"center",gap:"8px",fontWeight:800,color:"#8cff9c",fontSize:"13px",marginBottom:"8px"}}>✦ ZAKSS AI BUILDER <span style={{fontSize:"10px",color:"#b9d8bf",marginLeft:"auto"}}>3D</span></div><form onSubmit={buildWithZakssAI}><textarea value={builderPrompt} onChange={e=>setBuilderPrompt(e.target.value)} maxLength={500} rows={3} placeholder="Contoh: Tambahkan tanah dan rumput..." disabled={builderBusy} style={{width:"100%",resize:"vertical",boxSizing:"border-box",background:"#07100b",color:"#e9ffed",border:"1px solid #315d3c",borderRadius:"8px",padding:"9px",font:"inherit",fontSize:"12px"}}/><button type="submit" disabled={builderBusy||!builderPrompt.trim()} style={{width:"100%",marginTop:"8px",padding:"10px",border:0,borderRadius:"8px",background:builderBusy?"#34523b":"#45d66b",color:"#061008",fontWeight:800,cursor:builderBusy?"wait":"pointer"}}>{builderBusy?"✦ SEDANG MEMBANGUN...":"✦ BUILD WITH ZAKSS AI"}</button></form><p style={{fontSize:"10px",lineHeight:1.5,color:"#9db9a3",margin:"8px 0 0"}}>AI menambahkan objek 3D ke scene. Objek lama tetap aman.</p></div><div className="panel-heading"><span>BUILD TOOLS</span><small>ADD TO WORLD</small></div><button onClick={()=>add("block")}><Box/> <span>Block</span><kbd>B</kbd></button><button onClick={()=>add("platform")}><Layers3/> <span>Platform</span><kbd>P</kbd></button><button onClick={()=>add("coin")}><Coins/> <span>Coin</span><kbd>C</kbd></button><button onClick={()=>add("checkpoint")}><Circle/> <span>Checkpoint</span><kbd>K</kbd></button><button onClick={()=>add("tree")}><TreePine/> <span>Tree</span><kbd>T</kbd></button><div className="panel-divider"/><div className="panel-heading"><span>WORLD OBJECTS</span><small>{objects.length}/200</small></div><div className="object-list">{objects.map((o,i)=><button key={o.id} className={selected===o.id?"active":""} onClick={()=>setSelected(o.id)}><i style={{background:o.color}}/>{o.type.toUpperCase()} {i+1}</button>)}{objects.length===0&&<p className="empty-list">Tanah sudah tersedia. Tambahkan objek untuk mulai membangun.</p>}</div></aside>
    <section className="viewport-wrap"><div className="viewport-toolbar"><span>WORLD EDITOR <b>● LIVE SCENE</b></span><div className="transform-tools"><button className={transformMode==="translate"?"active":""} onClick={()=>setTransformMode("translate")}>MOVE</button><button className={transformMode==="rotate"?"active":""} onClick={()=>setTransformMode("rotate")}>ROTATE</button><button className={transformMode==="scale"?"active":""} onClick={()=>setTransformMode("scale")}>SCALE</button></div><span>{project.engine.toUpperCase()} MODE · AUTO TERRAIN</span></div>{project.engine === "3d" ? <SceneViewport3D objects={objects} selected={selected} onSelect={handleSceneSelect} onTransform={handleSceneTransform} mode={transformMode}/> : <canvas ref={canvasRef} className="world-canvas" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}/>}<div className="viewport-footer"><span>DRAG OBJECTS: SELECT IN LIST · TRANSFORM: RIGHT PANEL</span><span>SCENE V1</span></div></section>
    <aside className="properties-panel"><div className="panel-heading"><span>INSPECTOR</span><small>{active?"OBJECT SELECTED":"NO SELECTION"}</small></div>{active?<><label>OBJECT TYPE<input value={active.type.toUpperCase()} readOnly/></label><div className="property-group"><b>POSITION</b><label>X<input type="number" value={active.x} onChange={e=>patch({x:Number(e.target.value)})}/></label><label>Y<input type="number" value={active.y} onChange={e=>patch({y:Number(e.target.value)})}/></label>{project.engine==="3d"&&<label>Z<input type="number" value={active.z} onChange={e=>patch({z:Number(e.target.value)})}/></label>}</div><div className="property-group"><b>SIZE</b><label>WIDTH<input type="number" min=".25" max="10" step=".25" value={active.w} onChange={e=>patch({w:Number(e.target.value)})}/></label><label>HEIGHT<input type="number" min=".25" max="10" step=".25" value={active.h} onChange={e=>patch({h:Number(e.target.value)})}/></label>{project.engine==="3d"&&<label>DEPTH<input type="number" min=".25" max="10" step=".25" value={active.d} onChange={e=>patch({d:Number(e.target.value)})}/></label>}</div><label>COLOR<input className="color-input" type="color" value={active.color} onChange={e=>patch({color:e.target.value})}/></label><button className="delete-btn" onClick={()=>{setObjects(v=>v.filter(o=>o.id!==selected));setSelected(null);setSaved(false);}}><Trash2 size={15}/> DELETE OBJECT</button></>:<div className="inspector-empty"><Cuboid size={34}/><p>Pilih objek dari daftar untuk mengatur posisi, ukuran, dan warna.</p></div>}<div className="terrain-note"><Check size={15}/> AUTO TERRAIN ACTIVE<br/><small>Tanah dasar selalu muncul dan tidak bisa terhapus.</small></div></aside></div>
    <footer className="studio-status"><span><i/> ALL SYSTEMS READY</span><span>{objects.length} OBJECTS · {project.engine.toUpperCase()} WORLD</span><span>{published?"PUBLIC WORLD":"PRIVATE DRAFT"}</span></footer>
    {(error||message)&&<div className={error?"toast error-toast":"toast"}>{error||message}</div>}
  </main>;
}
