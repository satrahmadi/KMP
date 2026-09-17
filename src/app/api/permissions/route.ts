import { getSession } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/api";
import { PERMISSION_CATALOG, MODULE_LABELS } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  return jsonOk({ catalog: PERMISSION_CATALOG, moduleLabels: MODULE_LABELS });
}
