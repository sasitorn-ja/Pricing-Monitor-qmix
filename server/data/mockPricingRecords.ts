import {
  BASELINE_END,
  BASELINE_START,
  CAMPAIGN_START
} from "../config/pricing.js";
import type { PricingRecord } from "../services/analytics/index.js";

type MockProjectConfig = {
  siteNo: string;
  siteName: string;
  divisionName: string;
  fcName: string;
  sectName: string;
  segment: string;
  channel: string;
  discountType: string;
  customerNo: string;
  customerName: string;
  memberType: string;
  basePrice: number;
  targetLift: number;
  volume: number;
  baselineDisc: number;
  discountDrop: number;
  postStartOffsetDays?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const mockProjects: MockProjectConfig[] = [
  {
    siteNo: "S001",
    siteName: "Saraburi Ready Mix Hub",
    divisionName: "Central",
    fcName: "FC Ayutthaya",
    sectName: "North Ring",
    segment: "Infrastructure",
    channel: "Direct",
    discountType: "Standard",
    customerNo: "C001",
    customerName: "Thai Civil Alliance",
    memberType: "Corporate",
    basePrice: 1685,
    targetLift: 540,
    volume: 82,
    baselineDisc: 14,
    discountDrop: 8
  },
  {
    siteNo: "S002",
    siteName: "Bangna Metro Plant",
    divisionName: "Central",
    fcName: "FC Bangkok East",
    sectName: "Metro",
    segment: "Residential",
    channel: "Dealer",
    discountType: "Campaign",
    customerNo: "C002",
    customerName: "Urban Living Co.",
    memberType: "Key Account",
    basePrice: 1720,
    targetLift: 360,
    volume: 64,
    baselineDisc: 11,
    discountDrop: 5
  },
  {
    siteNo: "S003",
    siteName: "Khon Kaen Express Yard",
    divisionName: "Northeast",
    fcName: "FC Khon Kaen",
    sectName: "Upper Isan",
    segment: "Infrastructure",
    channel: "Project",
    discountType: "Tender",
    customerNo: "C003",
    customerName: "Regional Works Group",
    memberType: "Corporate",
    basePrice: 1605,
    targetLift: 285,
    volume: 71,
    baselineDisc: 15,
    discountDrop: 9
  },
  {
    siteNo: "S004",
    siteName: "Rayong Seaboard Plant",
    divisionName: "East",
    fcName: "FC Rayong",
    sectName: "EEC",
    segment: "Industrial",
    channel: "Direct",
    discountType: "Standard",
    customerNo: "C004",
    customerName: "Seaboard Industrial Builder",
    memberType: "Corporate",
    basePrice: 1775,
    targetLift: 455,
    volume: 88,
    baselineDisc: 13,
    discountDrop: 12
  },
  {
    siteNo: "S005",
    siteName: "Chiang Mai Urban Mix",
    divisionName: "North",
    fcName: "FC Chiang Mai",
    sectName: "City Zone",
    segment: "Residential",
    channel: "Dealer",
    discountType: "Campaign",
    customerNo: "C005",
    customerName: "Lanna Property Builder",
    memberType: "SME",
    basePrice: 1650,
    targetLift: 190,
    volume: 53,
    baselineDisc: 10,
    discountDrop: 4
  },
  {
    siteNo: "S006",
    siteName: "Phuket Coastal Plant",
    divisionName: "South",
    fcName: "FC Phuket",
    sectName: "Coastal",
    segment: "Hospitality",
    channel: "Project",
    discountType: "Tender",
    customerNo: "C006",
    customerName: "Andaman Resort Construction",
    memberType: "Key Account",
    basePrice: 1825,
    targetLift: 320,
    volume: 47,
    baselineDisc: 12,
    discountDrop: 6
  },
  {
    siteNo: "S007",
    siteName: "Nakhon Pathom West Plant",
    divisionName: "West",
    fcName: "FC Nakhon Pathom",
    sectName: "Outer West",
    segment: "Commercial",
    channel: "Direct",
    discountType: "Contract",
    customerNo: "C007",
    customerName: "Commercial Works Partner",
    memberType: "Corporate",
    basePrice: 1705,
    targetLift: 120,
    volume: 60,
    baselineDisc: 9,
    discountDrop: 3
  },
  {
    siteNo: "S008",
    siteName: "Chonburi Gateway Plant",
    divisionName: "East",
    fcName: "FC Chonburi",
    sectName: "Gateway",
    segment: "Infrastructure",
    channel: "Dealer",
    discountType: "Standard",
    customerNo: "C008",
    customerName: "Eastern Transit Contractor",
    memberType: "Corporate",
    basePrice: 1760,
    targetLift: 610,
    volume: 92,
    baselineDisc: 14,
    discountDrop: 15
  },
  {
    siteNo: "S009",
    siteName: "Udon Growth Center",
    divisionName: "Northeast",
    fcName: "FC Udon Thani",
    sectName: "Upper Isan",
    segment: "Commercial",
    channel: "Project",
    discountType: "Contract",
    customerNo: "C009",
    customerName: "Isan Commercial Estate",
    memberType: "SME",
    basePrice: 1620,
    targetLift: 260,
    volume: 58,
    baselineDisc: 11,
    discountDrop: 7
  },
  {
    siteNo: "S010",
    siteName: "Hat Yai Fresh Start",
    divisionName: "South",
    fcName: "FC Hat Yai",
    sectName: "Urban South",
    segment: "Residential",
    channel: "Direct",
    discountType: "Campaign",
    customerNo: "C010",
    customerName: "Southern Home Development",
    memberType: "Corporate",
    basePrice: 1695,
    targetLift: 340,
    volume: 44,
    baselineDisc: 10,
    discountDrop: 5,
    postStartOffsetDays: 5
  },
  {
    siteNo: "S011",
    siteName: "Pattaya New Launch",
    divisionName: "East",
    fcName: "FC Pattaya",
    sectName: "Tourism Belt",
    segment: "Hospitality",
    channel: "Dealer",
    discountType: "Launch",
    customerNo: "C011",
    customerName: "Sunrise Hospitality Works",
    memberType: "Key Account",
    basePrice: 1810,
    targetLift: 0,
    volume: 36,
    baselineDisc: 0,
    discountDrop: 0,
    postStartOffsetDays: 11
  }
];

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function createDateRange(start: string, end: string) {
  const dates: string[] = [];
  for (
    let current = parseDate(start);
    current.getTime() <= parseDate(end).getTime();
    current = new Date(current.getTime() + DAY_MS)
  ) {
    dates.push(formatDate(current));
  }
  return dates;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function getCampaignProgress(day: string, postStartDay: string) {
  if (day < postStartDay) {
    return 0;
  }

  const totalDays = Math.max(
    1,
    Math.round((parseDate("2026-04-20").getTime() - parseDate(postStartDay).getTime()) / DAY_MS)
  );
  const elapsed = Math.max(
    0,
    Math.round((parseDate(day).getTime() - parseDate(postStartDay).getTime()) / DAY_MS)
  );

  return clamp(elapsed / totalDays, 0, 1);
}

function createRecord(config: MockProjectConfig, day: string): PricingRecord {
  const postStartDay = formatDate(
    new Date(parseDate(CAMPAIGN_START).getTime() + (config.postStartOffsetDays ?? 0) * DAY_MS)
  );
  const projectSeed = Number(config.siteNo.replace(/\D/g, "")) || 1;
  const daySeed = Number(day.slice(-2));
  const microSwing = ((daySeed + projectSeed * 3) % 5) - 2;
  const volumeSwing = ((daySeed + projectSeed) % 4) - 1.5;
  const progress = getCampaignProgress(day, postStartDay);
  const baselinePeriod = day >= BASELINE_START && day <= BASELINE_END;
  const rawLift = progress * config.targetLift;
  const lift = round2(Math.max(0, rawLift + microSwing * 4));
  const npAvg = round2(config.basePrice + (baselinePeriod ? microSwing * 3 : lift));
  const dcAvg = round2(
    clamp(
      baselinePeriod
        ? config.baselineDisc + microSwing * 0.2
        : config.baselineDisc - progress * config.discountDrop + microSwing * 0.1,
      0,
      25
    )
  );
  const sumQ = round2(Math.max(18, config.volume + volumeSwing * 4 + progress * 6));

  return {
    DIVISION_NAME: config.divisionName,
    FC_NAME: config.fcName,
    SECT_NAME: config.sectName,
    SITE_NO: config.siteNo,
    SITE_NAME: config.siteName,
    SEGMENT: config.segment,
    CREATE_DATE: `${day}T08:00:00.000Z`,
    DISCOUNT_DATE: `${day}T08:00:00.000Z`,
    FUTURE_DISCOUNT_DATE: `${day}T08:00:00.000Z`,
    DP_DATE: `${day}T00:00:00.000Z`,
    DISCOUNT_TYPE: config.discountType,
    COUNTSITE: 1,
    SUMQ: sumQ,
    NP_AVG: npAvg,
    NETCON: round2(npAvg * sumQ),
    DC_AVG: dcAvg,
    LP_AVG: round2(npAvg + 120),
    CHANNEL: config.channel,
    CUSTOMER_NO: config.customerNo,
    CUSTOMER_NAME: config.customerName,
    CUSTOMER_MEMBER_TYPE: config.memberType,
    SUBCUSTOMER_NO: `${config.customerNo}-01`,
    SUBCUSTOMER_NAME: `${config.customerName} Unit A`,
    SUBCUSTOMER_MEMBER_TYPE: config.memberType
  };
}

function buildMockPricingRecords() {
  const baselineAndPostDays = createDateRange(BASELINE_START, "2026-04-20");

  return mockProjects.flatMap((project) => {
    const postStartDay = formatDate(
      new Date(parseDate(CAMPAIGN_START).getTime() + (project.postStartOffsetDays ?? 0) * DAY_MS)
    );

    return baselineAndPostDays
      .filter((day) => {
        if (project.postStartOffsetDays && day >= CAMPAIGN_START) {
          return day >= postStartDay;
        }

        return true;
      })
      .filter((day) => {
        if (project.postStartOffsetDays && project.targetLift === 0) {
          return day >= postStartDay;
        }

        return true;
      })
      .map((day) => createRecord(project, day));
  });
}

export const mockPricingRecords = buildMockPricingRecords();
