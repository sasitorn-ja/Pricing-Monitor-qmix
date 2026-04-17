import {
  formatHandlerError,
  getProjectTrend
} from "../../../server/api-handlers.js";
import type { ApiRequest, ApiResponse } from "../../_shared.js";
import { readQueryValue, sendJson } from "../../_shared.js";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const siteNo =
    readQueryValue(req.query, "siteNo") || readQueryValue(req.params, "siteNo");

  if (!siteNo) {
    return sendJson(res, { error: "Missing siteNo" }, 400);
  }

  try {
    return sendJson(
      res,
      await getProjectTrend(siteNo, {
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
