import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { renderPercentBarLabel } from "./components/chartLabels";
import {
  bucketColors,
  bucketLabels,
  discountDropSeries,
  MULTI_LADDER_FETCH_SIZE,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  tableColumnHelp,
  trendBucketDetailSeries,
  trendBucketSeries
} from "./constants";
import { useDelayedFlag } from "./hooks/useDelayedFlag";
import { fetchJson } from "./lib/api";
import {
  formatBaht,
  formatDiscountDropPercent,
  formatNumber,
  formatPercent,
  formatPercentTick,
  formatShortDate,
  formatSummaryDateRange,
  formatThaiDate,
  formatThaiDateShort,
  getDateRange,
  getPaginationItems
} from "./lib/format";
import type {
  CalcHelpKey,
  DashboardResponse,
  MetaResponse,
  PriceLadderMode,
  ProjectResponse,
  ProjectRow,
  ProjectTrendChartPoint,
  ProjectTrendPoint,
  ShareTrendPoint,
  SummaryResponse,
  TrendPoint,
  TrendRange
} from "./types";

function HeaderWithHint({
  hintKey,
  label,
  hint,
  activeHint,
  onToggle
}: {
  hintKey: keyof typeof tableColumnHelp;
  label: string;
  hint: string;
  activeHint: keyof typeof tableColumnHelp | null;
  onToggle: (key: keyof typeof tableColumnHelp) => void;
}) {
  const isOpen = activeHint === hintKey;

  return (
    <span className="thLabel">
      {label}
      <button
        type="button"
        className={`hintDot ${isOpen ? "open" : ""}`}
        aria-label={hint}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(hintKey);
        }}
      >
        i
      </button>
      {isOpen ? <span className="hintPopup">{hint}</span> : null}
    </span>
  );
}

function summarizeMultiSelect(selectedValues: string[], fallbackLabel: string) {
  if (selectedValues.length === 0) {
    return fallbackLabel;
  }

  if (selectedValues.length === 1) {
    return selectedValues[0];
  }

  return `${selectedValues[0]} +${selectedValues.length - 1}`;
}

function SingleSelectDropdown({
  label,
  options,
  selectedValue,
  fallbackLabel,
  onSelect
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  fallbackLabel: string;
  onSelect: (value: string) => void;
}) {
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.open) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        dropdownRef.current.open = false;
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && dropdownRef.current?.open) {
        dropdownRef.current.open = false;
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label ?? fallbackLabel;

  const closeDropdown = () => {
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
  };

  return (
    <details ref={dropdownRef} className="singleSelectDropdown">
      <summary>
        <span>{label}</span>
        <strong>{selectedLabel}</strong>
      </summary>
      <div className="singleSelectMenu">
        <button
          type="button"
          className={`singleSelectOption ${selectedValue === "" ? "selected" : ""}`}
          onClick={() => {
            onSelect("");
            closeDropdown();
          }}
        >
          {fallbackLabel}
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`singleSelectOption ${selectedValue === option.value ? "selected" : ""}`}
            onClick={() => {
              onSelect(option.value);
              closeDropdown();
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  fallbackLabel,
  onToggle,
  onClear
}: {
  label: string;
  options: string[];
  selectedValues: string[];
  fallbackLabel: string;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.open) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        dropdownRef.current.open = false;
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && dropdownRef.current?.open) {
        dropdownRef.current.open = false;
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeDropdown = () => {
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
  };

  return (
    <details ref={dropdownRef} className="multiSelectDropdown">
      <summary>
        <span>{label}</span>
        <strong>{summarizeMultiSelect(selectedValues, fallbackLabel)}</strong>
      </summary>
      <div className="multiSelectMenu">
        <button
          type="button"
          className={`compactFilterChip ${selectedValues.length === 0 ? "selected" : ""}`}
          onClick={() => {
            onClear();
            closeDropdown();
          }}
        >
          ทั้งหมด
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`compactFilterChip ${selectedValues.includes(option) ? "selected" : ""}`}
            onClick={() => {
              onToggle(option);
              closeDropdown();
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </details>
  );
}

function DiscountTypeCheckboxGroup({
  options,
  selectedValues,
  onToggle,
  onClear
}: {
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="discountTypeCheckboxes">
      <label className={`discountTypeOption ${selectedValues.length === 0 ? "selected" : ""}`}>
        <input
          type="checkbox"
          checked={selectedValues.length === 0}
          onChange={onClear}
        />
        <span>ทั้งหมด</span>
      </label>
      {options.map((option) => (
        <label
          key={option}
          className={`discountTypeOption ${selectedValues.includes(option) ? "selected" : ""}`}
        >
          <input
            type="checkbox"
            checked={selectedValues.includes(option)}
            onChange={() => onToggle(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function DivisionFcFilter({
  divisions,
  fcNamesByDivision,
  selectedDivisions,
  selectedFcNames,
  onToggleDivision,
  onClearDivisions,
  onToggleFcName,
  onClearFcNames
}: {
  divisions: string[];
  fcNamesByDivision: Record<string, string[]>;
  selectedDivisions: string[];
  selectedFcNames: string[];
  onToggleDivision: (value: string) => void;
  onClearDivisions: () => void;
  onToggleFcName: (value: string) => void;
  onClearFcNames: () => void;
}) {
  const [openDivision, setOpenDivision] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target as Node)) {
        return;
      }

      setOpenDivision(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDivision(null);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="divisionFcSplit">
      <div className="divisionDropdownRow">
        <button
          type="button"
          className={`compactFilterChip ${selectedDivisions.length === 0 && selectedFcNames.length === 0 ? "selected" : ""}`}
          onClick={() => {
            onClearDivisions();
            onClearFcNames();
          }}
        >
          ทั้งหมด
        </button>
        {selectedFcNames.length > 0 ? (
          <button type="button" className="clearFilterButton mini" onClick={onClearFcNames}>
            ล้าง FC
          </button>
        ) : null}
        {divisions.map((division) => {
          const fcNames = fcNamesByDivision[division] ?? [];
          const isDivisionSelected = selectedDivisions.includes(division);
          const selectedFcCount = fcNames.filter((fcName) =>
            selectedFcNames.includes(fcName)
          ).length;

          return (
            <details
              key={division}
              className={`divisionMiniDropdown ${
                isDivisionSelected || selectedFcCount > 0 ? "selected" : ""
              }`}
              open={openDivision === division}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenDivision(isOpen ? division : null);
              }}
            >
              <summary>
                <span>{division}</span>
                {selectedFcCount > 0 ? <em>{selectedFcCount}</em> : null}
              </summary>
              <div className="divisionMiniMenu">
                <label className={`divisionCheck ${isDivisionSelected ? "selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isDivisionSelected}
                    onChange={() => onToggleDivision(division)}
                  />
                  <span>ทั้งหมดใน {division}</span>
                </label>
                <div className="fcCheckboxGrid">
                  {fcNames.map((fcName) => (
                    <label
                      key={fcName}
                      className={`fcCheck ${selectedFcNames.includes(fcName) ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFcNames.includes(fcName)}
                        onChange={() => onToggleFcName(fcName)}
                      />
                      <span>{fcName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

export function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedFcNames, setSelectedFcNames] = useState<string[]>([]);
  const [selectedDiscountTypes, setSelectedDiscountTypes] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedTrend, setSelectedTrend] = useState<ProjectTrendPoint[]>([]);
  const [trendRange, setTrendRange] = useState<TrendRange>("all");
  const [priceLadderMode, setPriceLadderMode] = useState<PriceLadderMode>("summary");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasLoadedSummary, setHasLoadedSummary] = useState(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [activeHint, setActiveHint] = useState<keyof typeof tableColumnHelp | null>(
    null
  );
  const [activeCalcHelp, setActiveCalcHelp] = useState<CalcHelpKey | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState("");
  const showDashboardSlowNotice = useDelayedFlag(metaLoading || dashboardLoading, 1400);
  const showProjectSlowNotice = useDelayedFlag(projectLoading, 1400);

  const buildFilterQuery = () => {
    const params = new URLSearchParams();

    if (selectedDivisions.length > 0) {
      params.set("divisions", selectedDivisions.join(","));
    }

    if (selectedSegments.length > 0) {
      params.set("segments", selectedSegments.join(","));
    }

    if (selectedChannels.length > 0) {
      params.set("channels", selectedChannels.join(","));
    }

    if (selectedFcNames.length > 0) {
      params.set("fcNames", selectedFcNames.join(","));
    }

    if (selectedDiscountTypes.length > 0) {
      params.set("discountTypes", selectedDiscountTypes.join(","));
    }

    return params;
  };

  const toggleValue = (
    value: string,
    setter: Dispatch<SetStateAction<string[]>>
  ) => {
    setter((items) =>
      items.includes(value) ? items.filter((item) => item !== value) : [...items, value]
    );
  };

  const clearDivisions = () => {
    setSelectedDivisions([]);
    setSelectedFcNames([]);
  };

  const toggleDivision = (value: string) => {
    toggleValue(value, setSelectedDivisions);
    setSelectedFcNames([]);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    async function loadInitialDashboard() {
      try {
        setMetaLoading(true);
        setError("");
        const dashboardResponse = await fetchJson<DashboardResponse>("/api/dashboard");
        setMeta(dashboardResponse.meta);
        setSummary(dashboardResponse.summary);
        setTrend(dashboardResponse.trend);
        setHasLoadedSummary(true);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      } finally {
        setMetaLoading(false);
      }
    }

    void loadInitialDashboard();
  }, []);

  useEffect(() => {
    async function loadFilteredDashboard() {
      if (!meta) {
        return;
      }

      if (
        hasLoadedSummary &&
        !selectedDay &&
        selectedDivisions.length === 0 &&
        selectedSegments.length === 0 &&
        selectedChannels.length === 0 &&
        selectedFcNames.length === 0 &&
        selectedDiscountTypes.length === 0
      ) {
        return;
      }

      try {
        setDashboardLoading(true);
        setError("");
        const params = buildFilterQuery();
        if (selectedDay) {
          params.set("day", selectedDay);
        }
        const query = params.toString();
        const suffix = query ? `?${query}` : "";

        const [summaryResponse, trendResponse] = await Promise.all([
          fetchJson<SummaryResponse>(`/api/summary${suffix}`),
          fetchJson<TrendPoint[]>(`/api/trend${suffix}`)
        ]);

        setSummary(summaryResponse);
        setTrend(trendResponse);
        setHasLoadedSummary(true);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      } finally {
        setDashboardLoading(false);
      }
    }

    void loadFilteredDashboard();
  }, [
    hasLoadedSummary,
    meta,
    selectedDay,
    selectedDivisions,
    selectedSegments,
    selectedChannels,
    selectedFcNames,
    selectedDiscountTypes
  ]);

  useEffect(() => {
    async function loadProjects() {
      if (!hasLoadedSummary || !meta) {
        return;
      }

      try {
        setProjectLoading(true);
        setProjectError("");
        const baseParams = buildFilterQuery();

        if (selectedDay) {
          baseParams.set("day", selectedDay);
        }

        if (debouncedSearch) {
          baseParams.set("search", debouncedSearch);
        }

        let projectResponse: ProjectResponse;

        if (selectedBuckets.length > 1) {
          const responses = await Promise.all(
            selectedBuckets.map((bucket) => {
              const params = new URLSearchParams(baseParams);
              params.set("ladder", bucket);
              params.set("page", "1");
              params.set("pageSize", String(MULTI_LADDER_FETCH_SIZE));
              const query = params.toString();

              return fetchJson<ProjectResponse>(`/api/projects?${query}`);
            })
          );
          const rows = responses
            .flatMap((response) => response.rows)
            .sort((a, b) => {
              if (a.latestDay === b.latestDay) {
                if (a.increaseAmount === b.increaseAmount) {
                  return a.siteName.localeCompare(b.siteName);
                }

                return a.increaseAmount - b.increaseAmount;
              }

              return a.latestDay.localeCompare(b.latestDay);
            });
          const startIndex = (currentPage - 1) * PAGE_SIZE;

          projectResponse = {
            rows: rows.slice(startIndex, startIndex + PAGE_SIZE),
            total: rows.length
          };
        } else {
          const params = new URLSearchParams(baseParams);

          if (selectedBuckets.length === 1) {
            params.set("ladder", selectedBuckets[0]);
          }

          params.set("page", String(currentPage));
          params.set("pageSize", String(PAGE_SIZE));

          const query = params.toString();
          projectResponse = await fetchJson<ProjectResponse>(
            `/api/projects${query ? `?${query}` : ""}`
          );
        }

        setProjectRows(projectResponse.rows);
        setProjectTotal(projectResponse.total);
        setHasLoadedProjects(true);

        const stillExists = projectResponse.rows.some(
          (row) => row.siteNo === selectedSite
        );

        if (!stillExists) {
          setSelectedSite(projectResponse.rows[0]?.siteNo ?? "");
        }
      } catch (requestError) {
        setProjectError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      } finally {
        setProjectLoading(false);
      }
    }

    void loadProjects();
  }, [
    currentPage,
    debouncedSearch,
    hasLoadedSummary,
    meta,
    selectedBuckets,
    selectedDay,
    selectedDivisions,
    selectedChannels,
    selectedFcNames,
    selectedDiscountTypes,
    selectedSegments
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedBuckets,
    selectedDay,
    selectedDivisions,
    selectedSegments,
    selectedChannels,
    selectedFcNames,
    selectedDiscountTypes
  ]);

  useEffect(() => {
    async function loadSelectedTrend() {
      if (!selectedSite) {
        setSelectedTrend([]);
        return;
      }

      try {
        const params = buildFilterQuery();
        const query = params.toString();
        const projectTrend = await fetchJson<ProjectTrendPoint[]>(
          `/api/projects/${encodeURIComponent(selectedSite)}/trend${query ? `?${query}` : ""}`
        );

        setSelectedTrend(projectTrend);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      }
    }

    void loadSelectedTrend();
  }, [
    selectedSite,
    selectedDivisions,
    selectedSegments,
    selectedChannels,
    selectedFcNames,
    selectedDiscountTypes
  ]);

  const selectedTrendChartData = useMemo<ProjectTrendChartPoint[]>(() => {
    if (!meta || !selectedSite || selectedTrend.length === 0) {
      return selectedTrend.map((point) => ({
        ...point,
        increaseAmount:
          point.day >= (meta?.config.campaignStart ?? "9999-12-31")
            ? point.increaseAmount
            : 0,
        hasRecord: true,
        isBaselinePeriod: point.day < (meta?.config.campaignStart ?? "0000-01-01")
      }));
    }

    const trendByDay = new Map(selectedTrend.map((point) => [point.day, point]));
    const template = selectedTrend[0];
    const lastDay = meta.metadata.max_dp_date || selectedTrend.at(-1)?.day || template.day;

    return getDateRange(meta.config.baselineStart, lastDay).map((day) => {
      const point = trendByDay.get(day);

      if (point) {
        return {
          ...point,
          increaseAmount: day >= meta.config.campaignStart ? point.increaseAmount : 0,
          targetPercent: day >= meta.config.campaignStart ? point.targetPercent : 0,
          hasRecord: true,
          isBaselinePeriod: day < meta.config.campaignStart
        };
      }

      return {
        siteNo: selectedSite,
        siteName: template.siteName,
        day,
        baselineNetPrice: template.baselineNetPrice,
        postNetPrice: 0,
        increaseAmount: 0,
        targetPercent: 0,
        ladder: "ไม่มีข้อมูลขาย",
        hasRecord: false,
        isBaselinePeriod: day < meta.config.campaignStart
      };
    });
  }, [meta, selectedSite, selectedTrend]);

  const post25TrendData = useMemo(() => {
    if (!meta) {
      return trend;
    }

    return trend.filter((point) => point.day >= meta.config.campaignStart);
  }, [meta, trend]);

  const proportionTrendData = useMemo<ShareTrendPoint[]>(() => {
    return post25TrendData.map((point) => {
      const denominator = point.siteCount || 1;
      const volumeDenominator = point.volumeTotal || 1;
      const ladder300Plus = point.ladder300 + point.ladder400 + point.ladder500;

      return {
        ...point,
        ladder300Plus,
        ladder300PlusShare: (ladder300Plus / denominator) * 100,
        ladder500Share: (point.ladder500 / denominator) * 100,
        ladder400Share: (point.ladder400 / denominator) * 100,
        ladder300Share: (point.ladder300 / denominator) * 100,
        ladder250Share: (point.ladder250 / denominator) * 100,
        ladder200Share: (point.ladder200 / denominator) * 100,
        ladder100Share: (point.ladder100 / denominator) * 100,
        ladder0Share: (point.ladder0 / denominator) * 100,
        noBaselineShare: (point.noBaseline / denominator) * 100,
        volumeLadder500Share: (point.volumeLadder500 / volumeDenominator) * 100,
        volumeLadder400Share: (point.volumeLadder400 / volumeDenominator) * 100,
        volumeLadder300Share: (point.volumeLadder300 / volumeDenominator) * 100,
        volumeLadder250Share: (point.volumeLadder250 / volumeDenominator) * 100,
        volumeLadder200Share: (point.volumeLadder200 / volumeDenominator) * 100,
        volumeLadder100Share: (point.volumeLadder100 / volumeDenominator) * 100,
        volumeLadder0Share: (point.volumeLadder0 / volumeDenominator) * 100,
        volumeNoBaselineShare: (point.volumeNoBaseline / volumeDenominator) * 100,
        disc0Share: (point.disc0 / denominator) * 100,
        disc3Share: (point.disc3 / denominator) * 100,
        disc6Share: (point.disc6 / denominator) * 100,
        disc9Share: (point.disc9 / denominator) * 100,
        disc12Share: (point.disc12 / denominator) * 100,
        disc15Share: (point.disc15 / denominator) * 100
      };
    });
  }, [post25TrendData]);
  const activeTrendBucketSeries =
    priceLadderMode === "summary" ? trendBucketSeries : trendBucketDetailSeries;

  const filteredAverageTrend = useMemo(() => {
    if (!meta) {
      return trend;
    }

    if (trendRange === "post25") {
      return trend.filter((point) => point.day >= meta.config.campaignStart);
    }

    if (trendRange === "last14") {
      return trend.slice(-14);
    }

    if (trendRange === "last7") {
      return trend.slice(-7);
    }

    return trend;
  }, [meta, trend, trendRange]);

  const availableDays = useMemo(() => {
    return post25TrendData.map((point) => point.day);
  }, [post25TrendData]);

  const availableDivisions = meta?.filters?.divisions ?? [];
  const availableSegments = meta?.filters?.segments ?? [];
  const availableChannels = meta?.filters?.channels ?? [];
  const fcNamesByDivision = meta?.filters?.fcNamesByDivision ?? {};
  const availableDiscountTypes = meta?.filters?.discountTypes ?? [];

  const totalPages = Math.max(1, Math.ceil(projectTotal / PAGE_SIZE));
  const firstProjectIndex = projectTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastProjectIndex = Math.min(currentPage * PAGE_SIZE, projectTotal);
  const paginationItems = getPaginationItems(currentPage, totalPages);
  const activeTableFilters: Array<{ label: string; value: string }> = [];

  if (selectedBuckets.length > 0) {
    activeTableFilters.push({ label: "Ladder", value: selectedBuckets.join(", ") });
  }

  if (selectedDay) {
    activeTableFilters.push({
      label: "วันที่",
      value: formatThaiDateShort(selectedDay)
    });
  }

  if (selectedDivisions.length > 0) {
    activeTableFilters.push({
      label: "Division",
      value: selectedDivisions.join(", ")
    });
  }

  if (selectedSegments.length > 0) {
    activeTableFilters.push({
      label: "Segment",
      value: selectedSegments.join(", ")
    });
  }

  if (selectedChannels.length > 0) {
    activeTableFilters.push({
      label: "Channel",
      value: selectedChannels.join(", ")
    });
  }

  if (selectedFcNames.length > 0) {
    activeTableFilters.push({
      label: "FC",
      value: selectedFcNames.join(", ")
    });
  }

  if (selectedDiscountTypes.length > 0) {
    activeTableFilters.push({
      label: "Discount type",
      value: selectedDiscountTypes.join(", ")
    });
  }

  if (search.trim()) {
    activeTableFilters.push({
      label: "Search",
      value: search.trim()
    });
  }

  if (!error && (metaLoading || !hasLoadedSummary)) {
    return (
      <div className="shell">
        <div className="loadingScreen">
          <strong>กำลังโหลด dashboard...</strong>
          <span>
            {showDashboardSlowNotice
              ? "ข้อมูลชุดนี้ใช้เวลานานกว่าปกติ ระบบยังโหลดต่ออยู่"
              : "กำลังเตรียมข้อมูลล่าสุด"}
          </span>
        </div>
      </div>
    );
  }

  if (error || !meta || !summary) {
    return <div className="shell">Cannot load dashboard: {error || "missing data"}</div>;
  }

  const latestTrendDay = post25TrendData.at(-1)?.day ?? meta.metadata.max_dp_date;
  const targetHitSites = summary.comparableSites - summary.belowTargetSites;
  const targetHitShare = Number.isFinite(summary.targetHitShare)
    ? summary.targetHitShare
    : summary.comparableSites > 0
      ? (targetHitSites / summary.comparableSites) * 100
      : 0;
  const summaryDateRange = formatSummaryDateRange(summary, latestTrendDay);
  const calcHelpContent: Record<CalcHelpKey, { title: string; lines: string[] }> = {
    baselineDefinition: {
      title: "ระบบคำนวณ Baseline",
      lines: [
        "ระบบคำนวณ Baseline แยกเป็นรายโครงการ จากข้อมูลช่วง 1-24 มี.ค. 2026",
        "สูตร: SUM(NP_AVG x SUMQ) / SUM(SUMQ)",
        "แปลว่า record ที่มีปริมาณขายมากกว่าจะมีน้ำหนักกับราคา Baseline มากกว่า record ที่ขายน้อย",
        "หลังวันที่ 25 มี.ค. ระบบจะเอาราคาของแต่ละวันมาเทียบกับ Baseline ของโครงการเดียวกัน",
        "ถ้าโครงการไม่มีข้อมูลในช่วง 1-24 มี.ค. จะแสดงเป็น 'ไม่มี baseline' สีเทา เพราะยังเทียบราคาไม่ได้"
      ]
    },
    totalIncrease: {
      title: "Avg increase คืออะไร",
      lines: [
        "ตัวเลขนี้คือราคาเพิ่มเฉลี่ยต่อ B/Q ของวันที่กำลังดู ไม่ใช่ยอดรวมบาทของทุกโครงการ",
        "เริ่มจากคำนวณแต่ละโครงการก่อน: ราคาเพิ่มขึ้น = ราคา NP_AVG ของวันนั้น - ราคา Baseline",
        "ถ้าราคาวันนั้นต่ำกว่า Baseline จะนับราคาเพิ่มขึ้นเป็น 0 เพื่อไม่ให้ค่าลบมาดึงภาพรวมลง",
        "จากนั้นถ่วงน้ำหนักด้วยปริมาณขาย: SUM(ราคาเพิ่มขึ้น x SUMQ) / SUM(SUMQ)",
        `ข้อมูลที่ใช้คำนวณคือ ${summaryDateRange}`
      ]
    },
    averageToTarget: {
      title: "Average to target คืออะไร",
      lines: [
        "ตัวเลขนี้บอกว่าวันที่กำลังดู มีโครงการกี่เปอร์เซ็นต์ที่ขึ้นราคาถึงเป้า 300 บาทขึ้นไป",
        "นับเฉพาะโครงการที่มีทั้งราคา Baseline และราคาของวันนั้น จึงเปรียบเทียบได้จริง",
        "สูตร: จำนวนโครงการที่ราคาเพิ่มขึ้นตั้งแต่ 300 บาทขึ้นไป / จำนวนโครงการที่เปรียบเทียบได้ทั้งหมด x 100",
        `ตอนนี้คือ ${formatNumber(targetHitSites)} จาก ${formatNumber(summary.comparableSites)} โครงการ`,
        `ข้อมูลที่ใช้คำนวณคือ ${summaryDateRange}`
      ]
    },
    proportionChart: {
      title: "% สัดส่วนตามราคา อ่านยังไง",
      lines: [
        "กราฟนี้ตอบว่าในแต่ละวัน โครงการกระจายอยู่ในช่วงราคาเพิ่มขึ้นช่วงไหนบ้าง",
        "หนึ่งแท่งคือหนึ่งวัน และทุกสีในแท่งรวมกันเป็น 100%",
        "กราฟนี้นับจำนวนโครงการเป็นหลัก ไม่ได้ถ่วงด้วยปริมาณขาย",
        "ตัวอย่างเช่น สี 300-399 หมายถึงสัดส่วนโครงการที่ราคาวันนั้นสูงกว่า Baseline 300-399 บาท",
        "สีเทา 'ไม่มี baseline' คือโครงการที่มีข้อมูลวันนั้น แต่ไม่มีข้อมูลช่วง 1-24 มี.ค. จึงยังเปรียบเทียบราคาไม่ได้"
      ]
    },
    discountDropChart: {
      title: "% สัดส่วน Disc ที่ลดลง อ่านยังไง",
      lines: [
        "กราฟนี้ดูว่าส่วนลดเฉลี่ยของโครงการลดลงจากช่วง Baseline มากแค่ไหน",
        "คำนวณทีละโครงการ: % Disc ที่ลดลง = (Disc Baseline - Disc วันนั้น) / Disc Baseline x 100",
        "ถ้า Disc วันนั้นไม่ได้ลดลง หรือสูงกว่า Baseline จะนับเป็น 0%",
        "จากนั้นจัดกลุ่มเป็นช่วง 0-2.9%, 3.0-5.9%, 6.0-8.9%, 9.0-11.9%, 12.0-14.9%, และ 15% ขึ้นไป",
        "สีเทา 'ไม่มี baseline' คือโครงการที่มีข้อมูลวันนั้น แต่ไม่มีข้อมูลช่วง 1-24 มี.ค. จึงไม่มี Baseline ให้เปรียบเทียบ"
      ]
    },
    averageTrend: {
      title: "ค่าเฉลี่ยการขึ้นราคารายวัน อ่านยังไง",
      lines: [
        "กราฟเส้นนี้แสดงราคาเพิ่มเฉลี่ยของแต่ละวัน เพื่อดูแนวโน้มว่าราคาเพิ่มขึ้นมากขึ้นหรือลดลง",
        "แต่ละจุดใช้สูตรเดียวกับ Avg increase: SUM(ราคาเพิ่มขึ้น x SUMQ) / SUM(SUMQ)",
        "ราคาเพิ่มขึ้นของแต่ละโครงการ = ราคา NP_AVG ของวันนั้น - ราคา Baseline",
        "ถ้าราคาวันนั้นต่ำกว่า Baseline จะนับเป็น 0",
        "เมื่อเลือก Division, Segment หรือ DISCOUNT_TYPE กราฟนี้จะคำนวณใหม่เฉพาะกลุ่มที่เลือก"
      ]
    },
    projectTrend: {
      title: "Project trend อ่านยังไง",
      lines: [
        "กราฟนี้แสดงเฉพาะโครงการที่คลิกเลือกจากตาราง เพื่อดูการเปลี่ยนแปลงของโครงการนั้นรายวัน",
        "เส้นราคาขายคือราคา NP_AVG รายวันของโครงการนั้น โดยถ่วงน้ำหนักด้วย SUMQ ถ้าวันนั้นมีหลาย record",
        "ช่วง 1-24 มี.ค. ใช้สร้าง Baseline จึงยังไม่ตีความว่าเป็นการขึ้นราคา",
        "ตั้งแต่ 25 มี.ค. เป็นต้นไป เส้นขึ้นราคาคือราคาขายรายวัน - ราคา Baseline ของโครงการเดียวกัน",
        "ถ้าราคาขายรายวันหลัง 25 มี.ค. ต่ำกว่า Baseline จะนับการขึ้นราคาเป็น 0",
        "วันที่ไม่มีข้อมูลขายจะแสดงราคาขายและเส้นขึ้นราคาเป็น 0 เพื่อให้กราฟต่อเนื่อง",
        "กราฟรายโครงการแสดงแกนวันตั้งแต่ 1 มี.ค. ถึงวันล่าสุดของข้อมูล"
      ]
    },
    projectTable: {
      title: "Project table อ่านยังไง",
      lines: [
        "ตารางนี้แสดงรายละเอียดรายโครงการหลังใช้ตัวกรอง เช่น วันที่, Division, Segment, DISCOUNT_TYPE และ Ladder",
        "Baseline คือราคาอ้างอิงของโครงการ คำนวณจาก NP_AVG เฉลี่ยถ่วง SUMQ ช่วง 1-24 มี.ค.",
        "Current คือราคา NP_AVG ของวันที่แสดงในแต่ละแถว ถ้าไม่ได้เลือกวัน ตารางจะแสดงข้อมูลรายวันทั้งหมด",
        "Increase vs Baseline = Current - Baseline และถ้าติดลบจะนับเป็น 0",
        "Disc Baseline และ Disc Current คือ DC_AVG เฉลี่ยถ่วง SUMQ ของช่วง baseline และวันที่แสดงในแถว",
        `ตารางแสดงทีละ ${formatNumber(PAGE_SIZE)} รายการต่อหน้า จากจำนวนแถวรายวันที่ผ่านตัวกรองทั้งหมด`
      ]
    }
  };
  const activeCalcContent = activeCalcHelp ? calcHelpContent[activeCalcHelp] : null;

  return (
    <div className="shell" onClick={() => setActiveHint(null)}>
      <header className="hero heroSingle">
        <div>
          <p className="eyebrow">Pricing Monitor</p>
          <h1>Dashboard ติดตามการขึ้นราคา</h1>
          <p className="subtle">
            ใช้ NP_AVG เป็น net price เพื่อนำไปเทียบกับ Baseline
            {" "}ซึ่งอ้างอิงช่วง {meta.config.baselineStart} ถึง {meta.config.baselineEnd}
            {" "}และติดตามผลตั้งแต่ {meta.config.campaignStart} เป็นต้นไป
            <button
              type="button"
              className="baselineHelpButton"
              onClick={() => setActiveCalcHelp("baselineDefinition")}
            >
              ระบบคำนวณ Baseline
            </button>
          </p>
        </div>
      </header>

      <section className="baselineModePanel">
        <div>
          <span className="compactFilterLabel">DISCOUNT_TYPE</span>
          <strong>โหมดคำนวณ Baseline</strong>
        </div>
        {availableDiscountTypes.length > 0 ? (
          <DiscountTypeCheckboxGroup
            options={availableDiscountTypes}
            selectedValues={selectedDiscountTypes}
            onToggle={(value) => toggleValue(value, setSelectedDiscountTypes)}
            onClear={() => setSelectedDiscountTypes([])}
          />
        ) : (
          <span className="discountTypeEmpty">ไม่พบค่า DISCOUNT_TYPE ในข้อมูล</span>
        )}
      </section>

      <section className="gridStats">
        <article className="statCard">
          <button type="button" className="calcHelpButton" onClick={() => setActiveCalcHelp("totalIncrease")}>
            วิธีคำนวณ
          </button>
          <span>Avg increase</span>
          <strong>{formatNumber(summary.avgIncrease)} บาท B/Q</strong>
          <p>คำนวณจากข้อมูล {summaryDateRange}</p>
        </article>
        <article className="statCard">
          <button type="button" className="calcHelpButton" onClick={() => setActiveCalcHelp("averageToTarget")}>
            วิธีคำนวณ
          </button>
          <span>Average to target</span>
          <strong>{formatPercent(targetHitShare)}</strong>
          <p>สัดส่วนโครงการที่ขึ้นถึง 300 บาท B/Q ขึ้นไป {summaryDateRange}</p>
        </article>
      </section>

      {dashboardLoading ? (
        <div className="slowDataNotice">
          {showDashboardSlowNotice
            ? "ข้อมูลกำลังคำนวณนานกว่าปกติ แสดงข้อมูลเดิมไว้ก่อนจนกว่าจะโหลดเสร็จ"
            : "กำลังอัปเดตข้อมูลตาม filter..."}
        </div>
      ) : null}

      <section className="chartStack sectionPanel">
        <article className="panel chartPanel">
          <div className="panelHeader">
            <div>
              <h2>% สัดส่วนโครงการตามระดับการขึ้นราคา</h2>
              <p>
                มุมมองนี้แสดงเป็น 100% stacked bar เพื่อให้เห็นสัดส่วนแต่ละ ladder ต่อวัน
                หลังวันที่ 25 และเปลี่ยนตามฟิลเตอร์ที่เลือก
              </p>
            </div>
            <div className="chartSummaryPills">
              <div className="segmentedControl" aria-label="รูปแบบการแสดงช่วง 300 บาทขึ้นไป">
                <button
                  type="button"
                  className={priceLadderMode === "summary" ? "active" : ""}
                  onClick={() => setPriceLadderMode("summary")}
                >
                  สรุป 300+
                </button>
                <button
                  type="button"
                  className={priceLadderMode === "detail" ? "active" : ""}
                  onClick={() => setPriceLadderMode("detail")}
                >
                  แยก 300+
                </button>
              </div>
              <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("proportionChart")}>
                วิธีคำนวณ
              </button>
              <button
                type="button"
                className="clearFilterButton"
                onClick={() => {
                  clearDivisions();
                  setSelectedSegments([]);
                  setSelectedChannels([]);
                  setSelectedFcNames([]);
                  setSelectedDiscountTypes([]);
                }}
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>

          <div className="compactFilterDock">
            <div className="compactFilterRow">
              <span className="compactFilterLabel">DIVISION</span>
              <DivisionFcFilter
                divisions={availableDivisions}
                fcNamesByDivision={fcNamesByDivision}
                selectedDivisions={selectedDivisions}
                selectedFcNames={selectedFcNames}
                onToggleDivision={toggleDivision}
                onClearDivisions={clearDivisions}
                onToggleFcName={(value) => toggleValue(value, setSelectedFcNames)}
                onClearFcNames={() => setSelectedFcNames([])}
              />
            </div>

            <div className="compactFilterRow">
              <span className="compactFilterLabel">SEGMENT</span>
              <div className="compactFilterChips">
                <button
                  type="button"
                  className={`compactFilterChip ${selectedSegments.length === 0 ? "selected" : ""}`}
                  onClick={() => setSelectedSegments([])}
                >
                  ทั้งหมด
                </button>
                {availableSegments.map((segment) => (
                  <button
                    key={segment}
                    type="button"
                    className={`compactFilterChip ${selectedSegments.includes(segment) ? "selected" : ""}`}
                    onClick={() => toggleValue(segment, setSelectedSegments)}
                  >
                    {segment}
                  </button>
                ))}
              </div>
            </div>

            <div className="compactFilterRow">
              <span className="compactFilterLabel">CHANNEL</span>
              <div className="compactFilterChips">
                <button
                  type="button"
                  className={`compactFilterChip ${selectedChannels.length === 0 ? "selected" : ""}`}
                  onClick={() => setSelectedChannels([])}
                >
                  ทั้งหมด
                </button>
                {availableChannels.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    className={`compactFilterChip ${selectedChannels.includes(channel) ? "selected" : ""}`}
                    onClick={() => toggleValue(channel, setSelectedChannels)}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <div className="compactFilterRow">
              <span className="compactFilterLabel">DISCOUNT_TYPE</span>
              <DiscountTypeCheckboxGroup
                options={availableDiscountTypes}
                selectedValues={selectedDiscountTypes}
                onToggle={(value) => toggleValue(value, setSelectedDiscountTypes)}
                onClear={() => setSelectedDiscountTypes([])}
              />
            </div>
          </div>

          <div className="chartWrap proportionChart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proportionTrendData} barCategoryGap="10%">
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis dataKey="day" tickFormatter={formatShortDate} stroke="#9fb0d0" />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={formatPercentTick}
                  stroke="#9fb0d0"
                />
                <Tooltip
                  labelFormatter={(label, payload) => {
                    const point = payload?.[0]?.payload as ShareTrendPoint | undefined;
                    return `${formatThaiDateShort(String(label))}${
                      point ? ` • ${formatNumber(point.siteCount)} โครงการ` : ""
                    }`;
                  }}
                  formatter={(value, name, item) => {
                    const countKey = String(item.dataKey).replace("Share", "") as keyof ShareTrendPoint;
                    const point = item.payload as ShareTrendPoint;
                    return [
                      `${formatNumber(Number(value))}% (${formatNumber(Number(point[countKey] ?? 0))} โครงการ)`,
                      String(name)
                    ];
                  }}
                />
                <Legend
                  content={() => (
                    <div className="customChartLegend">
                      {activeTrendBucketSeries.map((series) => (
                        <span key={series.shareKey}>
                          <i style={{ backgroundColor: series.fill }} />
                          {series.name}
                        </span>
                      ))}
                    </div>
                  )}
                />
                {activeTrendBucketSeries.map((series) => (
                  <Bar
                    key={series.shareKey}
                    dataKey={series.shareKey}
                    stackId="share"
                    fill={series.fill}
                    name={series.name}
                  >
                    <LabelList dataKey={series.shareKey} content={renderPercentBarLabel} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chartPanel">
          <div className="panelHeader">
            <div>
              <h2>% สัดส่วน Disc ที่ลดลง</h2>
              <p>
                เปอร์เซ็นต์นี้คือ Disc ของวันนั้นลดลงจาก Disc ช่วงก่อนปรับกี่ %
                แล้วแบ่งช่วงลดลงทีละ 3%; สีเทาคือโครงการที่ไม่มีข้อมูลก่อนปรับให้เทียบ
              </p>
            </div>
            <div className="chartSummaryPills">
              <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("discountDropChart")}>
                วิธีคำนวณ
              </button>
              <button
                type="button"
                className="clearFilterButton"
                onClick={() => {
                  clearDivisions();
                  setSelectedSegments([]);
                  setSelectedChannels([]);
                  setSelectedFcNames([]);
                  setSelectedDiscountTypes([]);
                }}
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>

          <div className="compactFilterDock">
            <div className="compactFilterRow">
              <span className="compactFilterLabel">DIVISION</span>
              <DivisionFcFilter
                divisions={availableDivisions}
                fcNamesByDivision={fcNamesByDivision}
                selectedDivisions={selectedDivisions}
                selectedFcNames={selectedFcNames}
                onToggleDivision={toggleDivision}
                onClearDivisions={clearDivisions}
                onToggleFcName={(value) => toggleValue(value, setSelectedFcNames)}
                onClearFcNames={() => setSelectedFcNames([])}
              />
            </div>

            <div className="compactFilterRow">
              <span className="compactFilterLabel">SEGMENT</span>
              <div className="compactFilterChips">
                <button
                  type="button"
                  className={`compactFilterChip ${selectedSegments.length === 0 ? "selected" : ""}`}
                  onClick={() => setSelectedSegments([])}
                >
                  ทั้งหมด
                </button>
                {availableSegments.map((segment) => (
                  <button
                    key={segment}
                    type="button"
                    className={`compactFilterChip ${selectedSegments.includes(segment) ? "selected" : ""}`}
                    onClick={() => toggleValue(segment, setSelectedSegments)}
                  >
                    {segment}
                  </button>
                ))}
              </div>
            </div>

            <div className="compactFilterRow">
              <span className="compactFilterLabel">CHANNEL</span>
              <div className="compactFilterChips">
                <button
                  type="button"
                  className={`compactFilterChip ${selectedChannels.length === 0 ? "selected" : ""}`}
                  onClick={() => setSelectedChannels([])}
                >
                  ทั้งหมด
                </button>
                {availableChannels.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    className={`compactFilterChip ${selectedChannels.includes(channel) ? "selected" : ""}`}
                    onClick={() => toggleValue(channel, setSelectedChannels)}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <div className="compactFilterRow">
              <span className="compactFilterLabel">DISCOUNT_TYPE</span>
              <DiscountTypeCheckboxGroup
                options={availableDiscountTypes}
                selectedValues={selectedDiscountTypes}
                onToggle={(value) => toggleValue(value, setSelectedDiscountTypes)}
                onClear={() => setSelectedDiscountTypes([])}
              />
            </div>
          </div>

          <div className="chartWrap proportionChart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proportionTrendData} barCategoryGap="10%">
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis dataKey="day" tickFormatter={formatShortDate} stroke="#9fb0d0" />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={formatPercentTick}
                  stroke="#9fb0d0"
                />
                <Tooltip
                  labelFormatter={(label, payload) => {
                    const point = payload?.[0]?.payload as ShareTrendPoint | undefined;
                    return `${formatThaiDateShort(String(label))}${
                      point ? ` • ${formatNumber(point.siteCount)} โครงการ` : ""
                    }`;
                  }}
                  formatter={(value, name, item) => {
                    const countKey = String(item.dataKey).replace("Share", "") as keyof ShareTrendPoint;
                    const point = item.payload as ShareTrendPoint;
                    return [
                      `${formatNumber(Number(value))}% (${formatNumber(Number(point[countKey] ?? 0))} โครงการ)`,
                      String(name)
                    ];
                  }}
                />
                <Legend
                  content={() => (
                    <div className="customChartLegend">
                      {discountDropSeries.map((series) => (
                        <span key={series.shareKey}>
                          <i style={{ backgroundColor: series.fill }} />
                          {series.name}
                        </span>
                      ))}
                    </div>
                  )}
                />
                {discountDropSeries.map((series) => (
                  <Bar
                    key={series.shareKey}
                    dataKey={series.shareKey}
                    stackId="share"
                    fill={series.fill}
                    name={series.name}
                  >
                    <LabelList dataKey={series.shareKey} content={renderPercentBarLabel} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chartPanel">
          <div className="panelHeader">
            <div>
              <h2>ค่าเฉลี่ยการขึ้นราคาเทียบ Baseline รายวัน</h2>
              <p>
                เส้นนี้ยังคงช่วยดู momentum ว่าค่าเฉลี่ยการขึ้นราคาเคลื่อนไปทางไหน
                ภายใต้ฟิลเตอร์เดียวกับกราฟสัดส่วนด้านบน
              </p>
            </div>
            <div className="panelHeaderActions">
              <label className="chartRangeField">
                <span>เลือกช่วงเวลา</span>
                <select
                  value={trendRange}
                  onChange={(event) => setTrendRange(event.target.value as TrendRange)}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="post25">หลังวันที่ 25</option>
                  <option value="last14">14 วันล่าสุด</option>
                  <option value="last7">7 วันล่าสุด</option>
                </select>
              </label>
              <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("averageTrend")}>
                วิธีคำนวณ
              </button>
            </div>
          </div>
          <div className="chartWrap lineInsightChart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredAverageTrend} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis dataKey="day" tickFormatter={formatShortDate} stroke="#9fb0d0" />
                <YAxis stroke="#9fb0d0" tickFormatter={formatNumber} />
                <Tooltip
                  formatter={(value, name) => [
                    formatBaht(Number(value ?? 0)),
                    String(name)
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgIncrease"
                  stroke="#fb7185"
                  strokeWidth={3}
                  dot
                  name="Average increase"
                >
                  <LabelList
                    dataKey="avgIncrease"
                    position="top"
                    formatter={(value) => formatNumber(Number(value ?? 0))}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="twoColumn">
        <article className="panel">
          <div className="panelHeader">
            <div>
              <h2>แนวโน้มรายโครงการ</h2>
              <p>
                {selectedTrend[0]?.siteName ?? "เลือกไซต์จากตารางด้านล่าง"}{" "}
                {selectedSite ? `(${selectedSite})` : ""}
              </p>
              <p className="chartNote">
                1-24 มี.ค. = ช่วงก่อนปรับราคา; หลัง 25 มี.ค. = ช่วงติดตามผล
              </p>
            </div>
            <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("projectTrend")}>
              วิธีคำนวณ
            </button>
          </div>
          <div className="chartWrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedTrendChartData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatShortDate}
                  stroke="#9fb0d0"
                  minTickGap={18}
                />
                <YAxis
                  yAxisId="price"
                  stroke="#7dd3fc"
                  tick={{ fill: "#7dd3fc", fontWeight: 700 }}
                  tickFormatter={formatNumber}
                  width={84}
                  tickCount={5}
                  allowDecimals={false}
                  label={{
                    value: "ราคาขาย",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#7dd3fc",
                    fontSize: 12,
                    fontWeight: 700
                  }}
                />
                <YAxis
                  yAxisId="increase"
                  orientation="right"
                  stroke={bucketColors.top}
                  tick={{ fill: bucketColors.top, fontWeight: 700 }}
                  tickFormatter={formatNumber}
                  width={84}
                  tickCount={5}
                  allowDecimals={false}
                  label={{
                    value: "ขึ้นราคา",
                    angle: 90,
                    position: "insideRight",
                    fill: bucketColors.top,
                    fontSize: 12,
                    fontWeight: 700
                  }}
                />
                <Tooltip
                  formatter={(value, name, item) => {
                    const point = item.payload as ProjectTrendChartPoint;

                    if (!point.hasRecord) {
                      return [
                        name === "ราคาขาย (บาท)"
                          ? "0 บาท (ไม่มีข้อมูลขาย)"
                          : "ไม่มีข้อมูลขาย (นับเป็น 0)",
                        String(name)
                      ];
                    }

                    if (point.isBaselinePeriod && name === "ขึ้นราคา (บาท)") {
                      return ["ช่วง Baseline ยังไม่คำนวณการขึ้นราคา", String(name)];
                    }

                    if (value === null || value === undefined) {
                      return ["ไม่มีข้อมูล", String(name)];
                    }

                    return [formatBaht(Number(value)), String(name)];
                  }}
                />
                <Legend />
                {meta ? (
                  <ReferenceLine
                    x={meta.config.baselineEnd}
                    yAxisId="price"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="6 5"
                    label={{
                      value: "24 มี.ค.",
                      position: "insideTop",
                      offset: 8,
                      fill: "#ef4444",
                      fontSize: 13,
                      fontWeight: 700
                    }}
                  />
                ) : null}
                <Line
                  type="monotone"
                  yAxisId="price"
                  dataKey="postNetPrice"
                  stroke="#7dd3fc"
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                  name="ราคาขาย (บาท)"
                />
                <Line
                  type="monotone"
                  yAxisId="increase"
                  dataKey="increaseAmount"
                  stroke={bucketColors.top}
                  strokeWidth={3}
                  dot
                  name="ขึ้นราคา (บาท)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="panel sectionPanel">
        <div className="panelHeader controls">
          <div>
            <h2>Project table</h2>
            <p>คลิกแถวเพื่อดูกราฟรายโครงการ และกรองข้อมูลด้วยวันร่วมกับ ladder ได้</p>
          </div>
          <div className="tableHeaderActions">
            <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("projectTable")}>
              วิธีคำนวณ
            </button>
          </div>
        </div>

        <div className="filterShell projectFilterShell">
          <div className="tableFilterTop">
            <div className="tableFilterPrimary">
              <input
                className="searchField"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหา SITE_NAME, SITE_NO, division, segment"
              />
            </div>

            <div className="tableFilterInputs">
              <SingleSelectDropdown
                label="วันที่"
                options={availableDays.map((day) => ({
                  value: day,
                  label: formatThaiDate(day)
                }))}
                selectedValue={selectedDay}
                fallbackLabel="ทุกวัน"
                onSelect={setSelectedDay}
              />
              <MultiSelectDropdown
                label="Segment"
                options={availableSegments}
                selectedValues={selectedSegments}
                fallbackLabel="ทุก segment"
                onToggle={(value) => toggleValue(value, setSelectedSegments)}
                onClear={() => setSelectedSegments([])}
              />
              <MultiSelectDropdown
                label="Channel"
                options={availableChannels}
                selectedValues={selectedChannels}
                fallbackLabel="ทุก channel"
                onToggle={(value) => toggleValue(value, setSelectedChannels)}
                onClear={() => setSelectedChannels([])}
              />
            </div>
          </div>

          <div className="tableCompactRow divisionFcTableRow">
            <span className="tableCompactLabel">DIVISION / FC</span>
            <DivisionFcFilter
              divisions={availableDivisions}
              fcNamesByDivision={fcNamesByDivision}
              selectedDivisions={selectedDivisions}
              selectedFcNames={selectedFcNames}
              onToggleDivision={toggleDivision}
              onClearDivisions={clearDivisions}
              onToggleFcName={(value) => toggleValue(value, setSelectedFcNames)}
              onClearFcNames={() => setSelectedFcNames([])}
            />
          </div>

          <div className="tableCompactRow">
            <span className="tableCompactLabel">DISCOUNT_TYPE</span>
            <DiscountTypeCheckboxGroup
              options={availableDiscountTypes}
              selectedValues={selectedDiscountTypes}
              onToggle={(value) => toggleValue(value, setSelectedDiscountTypes)}
              onClear={() => setSelectedDiscountTypes([])}
            />
          </div>

          <div className="tableCompactRow">
            <span className="tableCompactLabel">LADDER</span>
            <div className="bucketFilterGroup tableBucketRow">
              <button
                type="button"
                className={`bucketFilter ${selectedBuckets.length === 0 ? "selected" : ""}`}
                onClick={() => setSelectedBuckets([])}
              >
                ทั้งหมด
              </button>
              {bucketLabels.map((bucket) => (
                <button
                  key={bucket.key}
                  type="button"
                  className={`bucketFilter ${selectedBuckets.includes(bucket.key) ? "selected" : ""}`}
                  onClick={() =>
                    setSelectedBuckets((current) =>
                      current.includes(bucket.key)
                        ? current.filter((key) => key !== bucket.key)
                        : [...current, bucket.key]
                    )
                  }
                >
                  {bucket.key}
                </button>
              ))}
            </div>
          </div>

          <div className="tableFilterFooter">
            {activeTableFilters.length > 0 ? (
              <div className="tableActiveFilters">
                {activeTableFilters.map((filter) => (
                  <span key={`${filter.label}-${filter.value}`} className="tableActivePill">
                    <strong>{filter.label}</strong>
                    {filter.value}
                  </span>
                ))}
              </div>
            ) : (
              <div className="tableActiveFiltersHint">ยังไม่ได้เลือกตัวกรองเพิ่มเติม</div>
            )}
            <button
              type="button"
              className="clearFilterButton"
              onClick={() => {
                setSearch("");
                setSelectedDay("");
                setSelectedBuckets([]);
                clearDivisions();
                setSelectedSegments([]);
                setSelectedChannels([]);
                setSelectedFcNames([]);
                setSelectedDiscountTypes([]);
                setCurrentPage(1);
              }}
            >
              รีเซ็ต filter ตาราง
            </button>
          </div>
        </div>

        <div className="tableWrap">
          {projectError ? (
            <div className="tableLoadingState">
              โหลดรายการโครงการไม่สำเร็จ: {projectError}
            </div>
          ) : hasLoadedProjects ? (
            <>
              {projectLoading ? (
                <div className="tableRefreshNotice">
                  {showProjectSlowNotice
                    ? "รายการโครงการใช้เวลานานกว่าปกติ กำลังโหลดต่อ..."
                    : "กำลังอัปเดตรายการโครงการ..."}
                </div>
              ) : null}
            <table>
              <thead>
                <tr>
                  <th>SITE_NO</th>
                  <th>SITE_NAME</th>
                  <th>
                    <HeaderWithHint
                      hintKey="division"
                      label="Division"
                      hint={tableColumnHelp.division}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="segment"
                      label="Segment"
                      hint={tableColumnHelp.segment}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="ladder"
                      label="Ladder"
                      hint={tableColumnHelp.ladder}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="baseline"
                      label="Baseline"
                      hint={tableColumnHelp.baseline}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="current"
                      label="Current"
                      hint={
                        selectedDay
                          ? "net price ของโครงการในวันที่เลือก"
                          : tableColumnHelp.current
                      }
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="increase"
                      label="Increase vs Baseline"
                      hint={tableColumnHelp.increase}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="baselineDisc"
                      label="Disc Baseline"
                      hint={tableColumnHelp.baselineDisc}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="currentDisc"
                      label="Disc Current"
                      hint={tableColumnHelp.currentDisc}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="discount"
                      label="Discount"
                      hint={tableColumnHelp.discount}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="latestDay"
                      label={selectedDay ? "Selected day" : "Day"}
                      hint={
                        selectedDay
                          ? "วันที่ที่ใช้กรองในตารางนี้"
                          : tableColumnHelp.latestDay
                      }
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectRows.map((row) => (
                  <tr
                    key={row.siteNo}
                    onClick={() => setSelectedSite(row.siteNo)}
                    className={selectedSite === row.siteNo ? "activeRow" : ""}
                  >
                    <td>{row.siteNo}</td>
                    <td>
                      <div className="siteCell">
                        <strong>{row.siteName}</strong>
                        <span>
                          {row.divisionName} / {row.fcName}
                        </span>
                      </div>
                    </td>
                    <td>{row.divisionName || "-"}</td>
                    <td>{row.segment || "-"}</td>
                    <td>{row.ladder}</td>
                    <td>{formatNumber(row.baselineNetPrice)}</td>
                    <td>{formatNumber(row.currentNetPrice)}</td>
                    <td>{formatNumber(row.increaseAmount)}</td>
                    <td>{formatNumber(row.baselineDisc)}</td>
                    <td>{formatNumber(row.currentDisc)}</td>
                    <td>{formatDiscountDropPercent(row.baselineDisc, row.currentDisc)}</td>
                    <td>{row.latestDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          ) : (
            <div className="tableLoadingState">
              {showProjectSlowNotice
                ? "กำลังโหลดรายการโครงการ ข้อมูลชุดนี้อาจใช้เวลานาน"
                : "กำลังโหลดรายการโครงการ..."}
            </div>
          )}
        </div>

        <div className="paginationBar">
          <button
            type="button"
            className="pagerButton"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            ‹ Previous
          </button>
          <div className="paginationPages" aria-label="เลือกหน้า">
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="paginationEllipsis">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`pageNumberButton ${currentPage === item ? "active" : ""}`}
                  onClick={() => setCurrentPage(item)}
                  aria-current={currentPage === item ? "page" : undefined}
                >
                  {formatNumber(item)}
                </button>
              )
            )}
          </div>
          <div className="paginationSummary">
            แสดง {formatNumber(firstProjectIndex)}-{formatNumber(lastProjectIndex)}
            {" "}จาก {formatNumber(projectTotal)} sites
          </div>
          <button
            type="button"
            className="pagerButton"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            Next ›
          </button>
        </div>
      </section>

      {activeCalcContent ? (
        <div
          className="calcModalBackdrop"
          role="presentation"
          onClick={() => setActiveCalcHelp(null)}
        >
          <section
            className="calcModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calc-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="calcModalHeader">
              <h2 id="calc-modal-title">{activeCalcContent.title}</h2>
              <button
                type="button"
                className="calcModalClose"
                aria-label="ปิดวิธีคำนวณ"
                onClick={() => setActiveCalcHelp(null)}
              >
                ปิด
              </button>
            </div>
            <div className="calcModalBody">
              {activeCalcContent.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
