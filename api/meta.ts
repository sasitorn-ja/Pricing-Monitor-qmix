import { formatHandlerError, getMeta } from "../server/api-handlers.js";
import type { ApiRequest, ApiResponse } from "./_shared.js";
import { sendJson } from "./_shared.js";

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  try {
    return sendJson(res, await getMeta());
  } catch (error) {
    return sendJson(res, formatHandlerError(error), 502);
  }
}
