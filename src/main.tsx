import React from 'react'
import ReactDOM from 'react-dom/client'
const App = () => (
  <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f3460,#16213e)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
    <div style={{textAlign:'center',color:'white',padding:'48px 32px',maxWidth:'560px'}}>
      <div style={{fontSize:'64px',marginBottom:'24px'}}>&#x1F1FA;&#x1F1E6;</div>
      <h1 style={{fontSize:'2.8rem',fontWeight:'800',marginBottom:'12px'}}>BridoConnect</h1>
      <p style={{fontSize:'1.1rem',opacity:0.65,marginBottom:'36px',lineHeight:1.6}}>P2P платформа прямої гуманітарної допомоги. Без посередників. Тільки люди.</p>
      <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'16px',padding:'20px 24px',marginBottom:'32px',textAlign:'left'}}>
        <p style={{margin:'6px 0'}}>&#x2705; 100% верифіковані профілі</p>
        <p style={{margin:'6px 0'}}>&#x2705; Escrow-захист кожної угоди</p>
        <p style={{margin:'6px 0'}}>&#x2705; Сервери в Німеччині (GDPR)</p>
        <p style={{margin:'6px 0'}}>&#x2705; Лише 5% комісія платформи</p>
      </div>
      <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
        <a href="/register" style={{background:'#e94560',color:'white',padding:'14px 28px',borderRadius:'12px',textDecoration:'none',fontWeight:'700',fontSize:'1rem'}}>Почати допомагати</a>
        <a href="/register?role=executor" style={{background:'rgba(255,255,255,0.1)',color:'white',padding:'14px 28px',borderRadius:'12px',textDecoration:'none',fontWeight:'600',fontSize:'1rem',border:'1px solid rgba(255,255,255,0.2)'}}>Мені потрібна допомога</a>
      </div>
      <p style={{marginTop:'28px',opacity:0.3,fontSize:'0.8rem'}}>BridoConnect GmbH · Deutschland · brido.de</p>
    </div>
  </div>
)
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)))