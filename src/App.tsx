import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Portal from '@/pages/Portal';
import Admin from '@/pages/Admin';
import Cockpit from '@/pages/Cockpit';
import SendOrder from '@/pages/SendOrder';
import Dispatcher from '@/pages/Dispatcher';
import CustomerAssets from '@/pages/CustomerAssets';

function App() {
  return (
    <HashRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/cockpit" element={<Cockpit />} />
        <Route path="/send-order" element={<SendOrder />} />
        <Route path="/dispatcher" element={<Dispatcher />} />
        <Route path="/customers" element={<CustomerAssets />} />
        <Route path="/" element={<Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
