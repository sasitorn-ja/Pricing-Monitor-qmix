export const BASELINE_START = "2026-03-01";
export const BASELINE_END = "2026-03-24";
export const CAMPAIGN_START = "2026-03-25";
export const TARGET_INCREASE = 300;

export const metadataQuery = `
  SELECT
    COUNT(*) AS total_rows,
    COUNT(DISTINCT SITE_NO) AS total_sites,
    MIN(date(DP_DATE)) AS min_dp_date,
    MAX(date(DP_DATE)) AS max_dp_date
  FROM pricing_records
`;

const analyticsCte = `
WITH baseline AS (
  SELECT
    SITE_NO AS siteNo,
    MAX(SITE_NAME) AS siteName,
    MAX(DIVISION_NAME) AS divisionName,
    MAX(FC_NAME) AS fcName,
    MAX(SECT_NAME) AS sectName,
    MAX(SEGMENT) AS segment,
    MAX(CHANNEL) AS channel,
    SUM(NP_AVG * SUMQ) / NULLIF(SUM(SUMQ), 0) AS baselineNetPrice,
    SUM(SUMQ) AS baselineVolume
  FROM pricing_records
  WHERE date(DP_DATE) BETWEEN '${BASELINE_START}' AND '${BASELINE_END}'
  GROUP BY SITE_NO
),
post_daily AS (
  SELECT
    SITE_NO AS siteNo,
    date(DP_DATE) AS day,
    MAX(SITE_NAME) AS siteName,
    SUM(NP_AVG * SUMQ) / NULLIF(SUM(SUMQ), 0) AS postNetPrice,
    SUM(SUMQ) AS postVolume
  FROM pricing_records
  WHERE date(DP_DATE) >= '${CAMPAIGN_START}'
  GROUP BY SITE_NO, date(DP_DATE)
),
post_vs_baseline AS (
  SELECT
    p.siteNo,
    p.siteName,
    p.day,
    p.postNetPrice,
    p.postVolume,
    b.divisionName,
    b.fcName,
    b.sectName,
    b.segment,
    b.channel,
    b.baselineNetPrice,
    b.baselineVolume,
    (p.postNetPrice - b.baselineNetPrice) AS increaseAmount,
    ((p.postNetPrice - b.baselineNetPrice) / ${TARGET_INCREASE}) * 100.0 AS targetPercent,
    CASE
      WHEN (p.postNetPrice - b.baselineNetPrice) >= 300 THEN '300+'
      WHEN (p.postNetPrice - b.baselineNetPrice) >= 200 THEN '200-299'
      WHEN (p.postNetPrice - b.baselineNetPrice) >= 100 THEN '100-199'
      ELSE '0-99'
    END AS ladder
  FROM post_daily p
  INNER JOIN baseline b ON b.siteNo = p.siteNo
  WHERE b.baselineNetPrice IS NOT NULL
    AND p.postNetPrice IS NOT NULL
),
latest_day AS (
  SELECT siteNo, MAX(day) AS latestDay
  FROM post_vs_baseline
  GROUP BY siteNo
),
latest_status AS (
  SELECT pvb.*
  FROM post_vs_baseline pvb
  INNER JOIN latest_day ld
    ON ld.siteNo = pvb.siteNo
   AND ld.latestDay = pvb.day
)
`;

export const summaryQuery = `
${analyticsCte}
SELECT
  COUNT(*) AS comparableSites,
  SUM(CASE WHEN ladder = '300+' THEN 1 ELSE 0 END) AS ladder300,
  SUM(CASE WHEN ladder = '200-299' THEN 1 ELSE 0 END) AS ladder200,
  SUM(CASE WHEN ladder = '100-199' THEN 1 ELSE 0 END) AS ladder100,
  SUM(CASE WHEN ladder = '0-99' THEN 1 ELSE 0 END) AS ladder0,
  SUM(CASE WHEN increaseAmount < 300 THEN 1 ELSE 0 END) AS belowTargetSites,
  ROUND(AVG(increaseAmount), 2) AS avgIncrease,
  ROUND(AVG(targetPercent), 2) AS avgTargetPercent,
  ROUND(MIN(increaseAmount), 2) AS minIncrease,
  ROUND(MAX(increaseAmount), 2) AS maxIncrease
FROM latest_status
`;

export const trendQuery = `
${analyticsCte}
SELECT
  day,
  COUNT(*) AS siteCount,
  SUM(CASE WHEN ladder = '300+' THEN 1 ELSE 0 END) AS ladder300,
  SUM(CASE WHEN ladder = '200-299' THEN 1 ELSE 0 END) AS ladder200,
  SUM(CASE WHEN ladder = '100-199' THEN 1 ELSE 0 END) AS ladder100,
  SUM(CASE WHEN ladder = '0-99' THEN 1 ELSE 0 END) AS ladder0,
  ROUND(AVG(increaseAmount), 2) AS avgIncrease,
  ROUND(AVG(targetPercent), 2) AS avgTargetPercent
FROM post_vs_baseline
GROUP BY day
ORDER BY day
`;

export const projectStatusQuery = `
${analyticsCte}
SELECT
  siteNo,
  siteName,
  divisionName,
  fcName,
  sectName,
  segment,
  channel,
  latest_status.day AS latestDay,
  ROUND(baselineNetPrice, 2) AS baselineNetPrice,
  ROUND(postNetPrice, 2) AS currentNetPrice,
  ROUND(increaseAmount, 2) AS increaseAmount,
  ROUND(targetPercent, 2) AS targetPercent,
  ladder,
  baselineVolume,
  postVolume
FROM latest_status
ORDER BY increaseAmount ASC, siteName ASC
`;

export const projectTrendQuery = `
${analyticsCte}
SELECT
  siteNo,
  siteName,
  day,
  ROUND(baselineNetPrice, 2) AS baselineNetPrice,
  ROUND(postNetPrice, 2) AS postNetPrice,
  ROUND(increaseAmount, 2) AS increaseAmount,
  ROUND(targetPercent, 2) AS targetPercent,
  ladder
FROM post_vs_baseline
WHERE siteNo = ?
ORDER BY day
`;
