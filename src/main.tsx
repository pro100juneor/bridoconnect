import React from "react"
import { createRoot } from "react-dom/client"
const App = () => React.createElement("div", {style:{padding:"40px",fontFamily:"sans-serif",maxWidth:"600px",margin:"0 auto"}},
  React.createElement("h1", {style:{fontSize:"2rem",marginBottom:"16px"}}, "🇺🇦 BridoConnect"),
  React.createElement("p", {style:{color:"#666",marginBottom:"24px"}}, "P2P платформа прямої гуманітарної допомоги. Реєстрація скоро відкриється."),
  React.createElement("div", {style:{background:"#f5f5f5",padding:"20px",borderRadius:"12px"}},
    React.createElement("p", null, "✅ Сайт завантажується"),
    React.createElement("p", null, "🔧 Повна версія в розробці")
  )
)
const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))