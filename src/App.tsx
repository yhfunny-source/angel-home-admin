import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Portal from '@/pages/Portal';
import Admin from '@/pages/Admin';
import Cockpit from '@/pages/Cockpit';
import SendOrder from '@/pages/SendOrder';
import Dispatcher from '@/pages/Dispatcher';
import CustomerAssets from '@/pages/CustomerAssets';
import ConsultData from '@/pages/ConsultData';
import HR from '@/pages/HR';
import KnowledgeBase from '@/pages/KnowledgeBase';
import RolePermissions from '@/pages/RolePermissions';
import PermissionGuard from '@/components/PermissionGuard';

function App() {
  return (
    <HashRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/admin" element={<PermissionGuard path="/admin"><Admin /></PermissionGuard>} />
        <Route path="/cockpit" element={<PermissionGuard path="/cockpit"><Cockpit /></PermissionGuard>} />
        <Route path="/send-order" element={<PermissionGuard path="/send-order"><SendOrder /></PermissionGuard>} />
        <Route path="/dispatcher" element={<PermissionGuard path="/dispatcher"><Dispatcher /></PermissionGuard>} />
        <Route path="/customers" element={<PermissionGuard path="/customers"><CustomerAssets /></PermissionGuard>} />
        <Route path="/consult-data" element={<PermissionGuard path="/consult-data"><ConsultData /></PermissionGuard>} />
        <Route path="/hr" element={<PermissionGuard path="/hr"><HR /></PermissionGuard>} />
        <Route path="/knowledge" element={<PermissionGuard path="/knowledge"><KnowledgeBase /></PermissionGuard>} />
        <Route path="/role-permissions" element={<PermissionGuard path="/role-permissions"><RolePermissions /></PermissionGuard>} />
        <Route path="/" element={<Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
