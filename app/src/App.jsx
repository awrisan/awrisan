import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DemoProvider, isChainOnly, useDemo } from "./demo-state.jsx";
import { ChainBoard } from "./chain/ChainBoard.jsx";
import { AppShell } from "./ui.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { OnboardingPage, SignInPage } from "./pages/AuthPages.jsx";
import {
  ActivityPage,
  CreateRoomPage,
  DrawPage,
  HomePage,
  JoinRoomPage,
  ProfilePage,
  ReceiptPage,
  ResultPage,
  RoomPage,
} from "./pages/AppPages.jsx";

function ProductRoutes() {
  const { state } = useDemo();
  // The whole /app/* subtree switches, or none of it does. Not a branch inside
  // HomePage: a route survives a bookmark and a reload, so leaving
  // /app/room/stellar-5/hasil pointed at the tree below keeps every page it
  // reaches reachable, and each of those needed its own guard to say anything
  // true about a chain room. Zero of them are routed here instead.
  //
  // mode "stellar" is the gateway and falls straight through, unchanged, to the
  // exact tree it renders today. mode "local" and "checking" likewise.
  if (isChainOnly(state.network)) return <ChainBoard />;
  return (
    <AppShell>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="buat-room" element={<CreateRoomPage />} />
        <Route path="gabung" element={<JoinRoomPage />} />
        <Route path="room/:roomId" element={<RoomPage />} />
        <Route path="room/:roomId/kocok" element={<DrawPage />} />
        <Route path="room/:roomId/hasil" element={<ResultPage />} />
        <Route path="room/:roomId/tanda-terima" element={<ReceiptPage />} />
        <Route path="aktivitas" element={<ActivityPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <DemoProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/masuk" element={<SignInPage />} />
          <Route path="/verifikasi" element={<OnboardingPage />} />
          <Route path="/app/*" element={<ProductRoutes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DemoProvider>
    </BrowserRouter>
  );
}
