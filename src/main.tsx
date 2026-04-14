import React from 'react'
import ReactDOM from 'react-dom/client'

const App = () => (
  <div style={{minHeight:'100vh',background:'#0f3460',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui'}}>
    <div style={{textAlign:'center',color:'white',padding:'40px'}}>
      <div style={{fontSize:'48px',marginBottom:'16px'}}>🇺🇦</div>
      <h1 style={{fontSize:'2.5rem',fontWeight:'bold',marginBottom:'16px'}}>BridoConnect</h1>
      <p style={{fontSize:'1.1rem',opacity:0.7,marginBottom:'32px'}}>P2P платформа прямої гуманітарної допомоги</p>
      <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'16px',padding:'24px',marginBottom:'24px'}}>
        <p style={{opacity:0.9}}>✅ Сервери в Німеччині (GDPR)</p>
        <p style={{opacity:0.9}}>✅ Escrow-захист кожної угоди</p>
        <p style={{opacity:0.9}}>✅ 100% верифіковані профілі</p>
        <p style={{opacity:0.9}}>✅ 5% комісія платформи</p>
      </div>
      <a href="/auth" style={{background:'#e94560',color:'white',padding:'14px 32px',borderRadius:'12px',textDecoration:'none',fontWeight:'bold',fontSize:'1.1rem'}}>
        Допомогти зараз →
      </a>
      <p style={{marginTop:'16px',opacity:0.4,fontSize:'0.8rem'}}>Повна версія платформи — скоро</p>
    </div>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)