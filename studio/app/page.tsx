export default function StudioHome() {
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#101512",color:"#f2f3e9",fontFamily:"Arial,sans-serif"}}>
    <section style={{maxWidth:560,textAlign:"center",border:"1px solid #35443a",borderRadius:16,padding:32,background:"#171f1a"}}>
      <div style={{fontWeight:900,letterSpacing:3,fontSize:20}}>ROBLOX HUB <span style={{color:"#a5df65"}}>STUDIO</span></div>
      <h1 style={{fontSize:34,marginBottom:8}}>YOUR WORLD STARTS HERE.</h1>
      <p style={{color:"#aab7aa",lineHeight:1.7}}>Buka project dari ROBLOX HUB untuk masuk ke editor landscape. Studio akan memuat dunia dan menyimpan perubahan ke akun yang sama.</p>
      <a href="https://roblox-hub-project-of-zakss.vercel.app/creator" style={{display:"inline-block",marginTop:18,padding:"13px 18px",borderRadius:7,background:"#a5df65",color:"#172014",fontWeight:800,textDecoration:"none"}}>KEMBALI KE ROBLOX HUB</a>
    </section>
  </main>;
}
