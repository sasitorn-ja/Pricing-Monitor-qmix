import cors from "cors";
import express from "express";
import { db } from "./db.js";
import {
  BASELINE_END,
  BASELINE_START,
  CAMPAIGN_START,
  TARGET_INCREASE,
  metadataQuery,
  projectStatusQuery,
  projectTrendQuery,
  summaryQuery,
  trendQuery
} from "./queries.js";

type ProjectRow = {
  siteNo: string;
  siteName: string;
  divisionName: string;
  fcName: string;
  sectName: string;
  segment: string;
  channel: string;
  latestDay: string;
  baselineNetPrice: number;
  currentNetPrice: number;
  increaseAmount: number;
  targetPercent: number;
  ladder: string;
  baselineVolume: number;
  postVolume: number;
};

const app = express();
app.use(cors());

app.get("/api/meta", (_req, res) => {
  const metadata = db.prepare(metadataQuery).get();

  res.json({
    metadata,
    config: {
      baselineStart: BASELINE_START,
      baselineEnd: BASELINE_END,
      campaignStart: CAMPAIGN_START,
      targetIncrease: TARGET_INCREASE
    }
  });
});

app.get("/api/summary", (_req, res) => {
  const summary = db.prepare(summaryQuery).get();
  res.json(summary);
});

app.get("/api/trend", (_req, res) => {
  const trend = db.prepare(trendQuery).all();
  res.json(trend);
});

app.get("/api/projects", (req, res) => {
  const search = String(req.query.search ?? "").trim().toLowerCase();
  const ladder = String(req.query.ladder ?? "").trim();
  const onlyBelowTarget = String(req.query.onlyBelowTarget ?? "") === "true";

  let rows = db.prepare(projectStatusQuery).all() as ProjectRow[];

  if (search) {
    rows = rows.filter((row) => {
      return (
        row.siteNo.toLowerCase().includes(search) ||
        row.siteName.toLowerCase().includes(search) ||
        row.divisionName.toLowerCase().includes(search) ||
        row.fcName.toLowerCase().includes(search)
      );
    });
  }

  if (ladder) {
    rows = rows.filter((row) => row.ladder === ladder);
  }

  if (onlyBelowTarget) {
    rows = rows.filter((row) => row.increaseAmount < TARGET_INCREASE);
  }

  const leaderboard = [...rows]
    .sort((a, b) => a.targetPercent - b.targetPercent)
    .slice(0, 15);

  res.json({
    rows,
    leaderboard
  });
});

app.get("/api/projects/:siteNo/trend", (req, res) => {
  const siteNo = req.params.siteNo;
  const trend = db.prepare(projectTrendQuery).all(siteNo);
  res.json(trend);
});

const port = Number(process.env.PORT ?? 8787);

app.listen(port, () => {
  console.log(`Pricing monitor API listening on http://localhost:${port}`);
});
