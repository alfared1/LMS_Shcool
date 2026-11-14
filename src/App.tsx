import { BrowserRouter, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { TenantAndDemoProvider, useTenantAndDemo } from './context/TenantAndDemoContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DemoPresentationBar } from './components/layout/DemoPresentationBar';
import { FloatingAiTutorDrawer } from './components/ai-tutor/FloatingAiTutorDrawer';
import { PublicStatelessVerifyPage } from './components/erapor/PublicStatelessVerifyPage';
import { LandingPage } from './pages/LandingPage';
import { GamesCatalogPage } from './pages/GamesCatalogPage';
import { GamePlayerPage } from './pages/GamePlayerPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { VirtualLabPage } from './pages/VirtualLabPage';
import { CbtLobbyPage } from './pages/CbtLobbyPage';
import { CbtRoomPage } from './pages/CbtRoomPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import { ProctorDashboardPage } from './pages/ProctorDashboardPage';
import { WhiteLabelAdminPage } from './pages/WhiteLabelAdminPage';
import { EraporPage } from './pages/EraporPage';
import { VerifyHashPage } from './pages/VerifyHashPage';
import { LoginPage } from './pages/LoginPage';
import { ParentDashboardPage } from './pages/ParentDashboardPage';

function AppShell() {
  const { isInCbtRoom, isInGameArena, config } = useTenantAndDemo();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(
    location.search || (typeof window !== 'undefined' ? window.location.search : '')
  );
  if (searchParams.get('verify') === 'true') {
    return (
      <PublicStatelessVerifyPage
        params={searchParams}
        onBackHome={() => navigate('/', { replace: true })}
      />
    );
  }

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/games" element={<GamesCatalogPage />} />
            <Route path="/games/:slug" element={<GamePlayerPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/virtual-lab" element={<VirtualLabPage />} />
            <Route path="/cbt" element={<CbtLobbyPage />} />
            <Route path="/cbt/:examId/room" element={<CbtRoomPage />} />
            <Route path="/dashboard/student" element={<StudentDashboardPage />} />
            <Route path="/dashboard/teacher" element={<TeacherDashboardPage />} />
            <Route path="/dashboard/proctor" element={<ProctorDashboardPage />} />
            <Route path="/dashboard/admin/white-label" element={<WhiteLabelAdminPage />} />
            <Route path="/dashboard/parent" element={<ParentDashboardPage />} />
            <Route path="/erapor" element={<EraporPage />} />
            <Route path="/verify/:hash" element={<VerifyHashPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {!isInCbtRoom && !isInGameArena && !isLoginPage && (
        <footer className="no-print print:hidden border-t border-slate-200 bg-white px-6 pt-5 pb-16 text-xs text-slate-500">
          <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3">
            <span>
              {config.schoolName} · NPSN {config.npsn}
            </span>
            <span>Ekosistem Pembelajaran Digital, CBT Berintegritas & E-Rapor Terverifikasi</span>
          </div>
        </footer>
      )}

      <DemoPresentationBar />
      {!isLoginPage && <FloatingAiTutorDrawer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TenantAndDemoProvider>
        <AppShell />
      </TenantAndDemoProvider>
    </BrowserRouter>
  );
}
