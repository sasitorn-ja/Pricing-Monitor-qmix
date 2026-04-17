import { formatHandlerError, getSummary } from "../server/api-handlers.js";
import type { ApiRequest, ApiResponse } from "./_shared.js";
import { readQueryValue, sendJson } from "./_shared.js";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    return sendJson(
      res,
      await getSummary({
        divisions: readQueryValue(req.query, "divisions")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        segments: readQueryValue(req.query, "segments")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      })
    );
  } catch (error) {
    return sendJson(res, formatHandlerError(error), 502);
  }
}
