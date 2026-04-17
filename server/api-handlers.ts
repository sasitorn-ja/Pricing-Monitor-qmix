import { buildAnalytics, type PricingRecord, type ProjectRow } from "./analytics.js";
import {
  BASELINE_END,
  BASELINE_START,
  CAMPAIGN_START,
  TARGET_INCREASE
} from "./queries.js";
import { getCsvPath, readPricingRecordsFromCsv } from "./csv-data.js";

type AnalyticsSnapshot = ReturnType<typeof buildAnalytics>;

type FilterParams = {
  divisions?: string[];
  segments?: string[];
};

type CachedFilteredSnapshot = {
  expiresAt: number;
  snapshot: AnalyticsSnapshot;
};

const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000;

const csvCache = {
  expiresAt: 0,
  signature: "",
  snapshot: null as AnalyticsSnapshot | null,
  records: null as PricingRecord[] | null
};
const filteredSnapshotCache = new Map<string, CachedFilteredSnapshot>();
let pendingCsvSnapshot:
  | Promise<{
      snapshot: AnalyticsSnapshot;
      records: PricingRecord[];
    }>
  | null = null;

function applyCsvCache(records: PricingRecord[], signature: string) {
  const snapshot = buildAnalytics(records);
  filteredSnapshotCache.clear();
  csvCache.records = records;
  csvCache.snapshot = snapshot;
  csvCache.signature = signature;
  csvCache.expiresAt = Date.now() + MEMORY_CACHE_TTL_MS;
  return { snapshot, records };
}

async function loadCsvSnapshot() {
  const { records, signature } = await readPricingRecordsFromCsv();

  if (
    csvCache.snapshot &&
    csvCache.records &&
    csvCache.signature === signature &&
    csvCache.expiresAt > Date.now()
  ) {
    return {
      snapshot: csvCache.snapshot,
      records: csvCache.records
    };
  }

  return applyCsvCache(records, signature);
}

async function getCsvSnapshot() {
  if (csvCache.snapshot && csvCache.records && csvCache.expiresAt > Date.now()) {
    return {
      snapshot: csvCache.snapshot,
      records: csvCache.records
    };
  }

  if (!pendingCsvSnapshot) {
    pendingCsvSnapshot = loadCsvSnapshot();

    pendingCsvSnapshot.finally(() => {
      pendingCsvSnapshot = null;
    });
  }

  return pendingCsvSnapshot;
}

function normalizeFilterValues(values: string[] = []) {
  return values
    .map((value) => value.trim())
    .filter(Boolean);
}

function filterRecords(records: PricingRecord[], filters: FilterParams) {
  const divisions = new Set(normalizeFilterValues(filters.divisions));
  const segments = new Set(normalizeFilterValues(filters.segments));

  if (divisions.size === 0 && segments.size === 0) {
    return records;
  }

  return records.filter((record) => {
    const matchesDivision =
      divisions.size === 0 || divisions.has(String(record.DIVISION_NAME ?? ""));
    const matchesSegment =
      segments.size === 0 || segments.has(String(record.SEGMENT ?? ""));

    return matchesDivision && matchesSegment;
  });
}

function buildFilterCacheKey(filters: FilterParams) {
  const divisions = normalizeFilterValues(filters.divisions).sort();
  const segments = normalizeFilterValues(filters.segments).sort();

  return JSON.stringify({ divisions, segments, signature: csvCache.signature });
}

async function getFilteredSnapshot(filters: FilterParams = {}) {
  const { snapshot, records } = await getCsvSnapshot();
  const cacheKey = buildFilterCacheKey(filters);
  const cached = filteredSnapshotCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const filteredRecords = filterRecords(records, filters);

  if (filteredRecords === records) {
    return snapshot;
  }

  const filteredSnapshot = buildAnalytics(filteredRecords);
  filteredSnapshotCache.set(cacheKey, {
    snapshot: filteredSnapshot,
    expiresAt: csvCache.expiresAt
  });

  return filteredSnapshot;
}

export async function getMeta() {
  const { snapshot, records } = await getCsvSnapshot();
  const divisions = [
    ...new Set(
      records
        .map((record) => String(record.DIVISION_NAME ?? "").trim())
        .filter(Boolean)
    )
  ].sort();
  const segments = [
    ...new Set(
      records.map((record) => String(record.SEGMENT ?? "").trim()).filter(Boolean)
    )
  ].sort();

  return {
    metadata: snapshot.metadata,
    config: {
      baselineStart: BASELINE_START,
      baselineEnd: BASELINE_END,
      campaignStart: CAMPAIGN_START,
      targetIncrease: TARGET_INCREASE
    },
    filters: {
      divisions,
      segments
    }
  };
}

export async function getSummary(filters: FilterParams = {}) {
  const snapshot = await getFilteredSnapshot(filters);
  return snapshot.summary;
}

export async function getTrend(filters: FilterParams = {}) {
  const snapshot = await getFilteredSnapshot(filters);
  return snapshot.trend;
}

export async function getProjects(params: {
  search?: string;
  ladder?: string;
  day?: string;
  divisions?: string[];
  segments?: string[];
  page?: number;
  pageSize?: number;
}) {
  const {
    search = "",
    ladder = "",
    day = "",
    divisions = [],
    segments = [],
    page = 1,
    pageSize = 20
  } = params;
  const normalizedSearch = search.trim().toLowerCase();
  let rows: ProjectRow[];

  const snapshot = await getFilteredSnapshot({ divisions, segments });
  rows = day
    ? snapshot.dailyProjects.filter((row) => row.latestDay === day)
    : [...snapshot.projects];

  if (normalizedSearch) {
    rows = rows.filter((row) => {
      return (
        row.siteNo.toLowerCase().includes(normalizedSearch) ||
        row.siteName.toLowerCase().includes(normalizedSearch) ||
        row.divisionName.toLowerCase().includes(normalizedSearch) ||
        row.fcName.toLowerCase().includes(normalizedSearch)
      );
    });
  }

  if (ladder) {
    rows = rows.filter((row) => row.ladder === ladder);
  }

  const total = rows.length;
  const normalizedPageSize = Number.isFinite(pageSize) ? Math.max(1, pageSize) : 20;
  const normalizedPage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const startIndex = (normalizedPage - 1) * normalizedPageSize;
  const pagedRows = rows.slice(startIndex, startIndex + normalizedPageSize);

  return {
    rows: pagedRows,
    total
  };
}

export async function getProjectTrend(siteNo: string, filters: FilterParams = {}) {
  const snapshot = await getFilteredSnapshot(filters);
  return snapshot.projectTrendMap.get(siteNo) ?? [];
}

export function formatHandlerError(error: unknown) {
  if (error instanceof Error) {
    if ("code" in error && error.code === "ENOENT") {
      return {
        error: `Cannot find CSV file at ${getCsvPath()}`
      };
    }

    return {
      error: error.message
    };
  }

  return {
    error: "Unknown CSV data error"
  };
}

export function warmRemoteSnapshot() {
  void getCsvSnapshot().catch(() => {
    // Warm-up should never crash the server; request handlers still surface errors.
  });
}
