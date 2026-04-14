import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
const queryClient = new QueryClient();
const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div style={{padding:'40px',fontFamily:'sans-serif'}}><h1>🇺🇦 BridoConnect</h1><p>Платформа прямої гуманітарної допомоги</p><p><a href="/app">Відкрити застосунок</a></p></div>} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
export default App;