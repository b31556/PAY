import { ShieldAlert } from "lucide-react";

const BackendOfflineOverlay = () => (
  <div style={{
    position: "fixed",
    zIndex: 9999,
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(255,255,255,0.98)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <ShieldAlert className="w-16 h-16 text-red-600 mb-6" />
    <h1 className="text-3xl font-bold mb-2 text-red-700">A szerver nem elérhető</h1>
    <p className="text-lg text-muted-foreground mb-4 text-center max-w-lg">
      Sajnos nem sikerült csatlakozni a banki szerverhez.<br />
      Kérjük, ellenőrizze az internetkapcsolatát, frissítse az oldalt, vagy vegye fel a kapcsolatot az ügyfélszolgálattal.<br />
      <span className="font-semibold text-red-600">A szolgáltatás jelenleg nem használható.</span>
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-6 py-3 rounded bg-gradient-to-r from-red-500 to-red-700 text-white font-bold shadow-lg"
    >
      Oldal újratöltése
    </button>
    <div className="mt-8 text-sm text-muted-foreground">
      <span>Ügyfélszolgálat: support@corporatebank.hu</span>
    </div>
  </div>
);

export default BackendOfflineOverlay;
