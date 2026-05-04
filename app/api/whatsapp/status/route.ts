import { NextResponse } from "next/server";

const EVOLUTION_URL = "https://proyecto-evolution-api.zhmz81.easypanel.host";
const EVOLUTION_KEY = "429683C4C977415CAAFCCE10F7D57E11";
const INSTANCE = "diego-mejia-demo";

export async function GET() {
  try {
    // Estado de la instancia
    const [statusRes, qrRes] = await Promise.all([
      fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
        headers: { apikey: EVOLUTION_KEY },
        cache: "no-store",
      }),
      fetch(`${EVOLUTION_URL}/instance/connect/${INSTANCE}`, {
        headers: { apikey: EVOLUTION_KEY },
        cache: "no-store",
      }),
    ]);

    const statusData = await statusRes.json().catch(() => ({}));
    const qrData = await qrRes.json().catch(() => ({}));

    // Buscar la instancia en la lista
    const instances = Array.isArray(statusData) ? statusData : [];
    const instance = instances.find((i: { instance?: { instanceName?: string } }) =>
      i?.instance?.instanceName === INSTANCE
    );
    const connected = instance?.instance?.state === "open";

    return NextResponse.json({
      connected,
      state: instance?.instance?.state ?? "unknown",
      instance: INSTANCE,
      qr: qrData?.code ?? null,
      pairingCode: qrData?.pairingCode ?? null,
      qrBase64: qrData?.base64 ?? qrData?.code ?? null,
    });
  } catch (e) {
    return NextResponse.json({ connected: false, error: String(e) }, { status: 500 });
  }
}
