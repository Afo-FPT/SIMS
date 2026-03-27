import SystemSetting from "../models/SystemSetting";

const SPACE_LIMITS_KEY = "space_limits";

export interface SpaceLimitsDTO {
  zone_area_percent_of_warehouse: number;
  shelf_area_percent_of_zone: number;
}

function normalizePercent(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    throw new Error(`${field} must be a number between 0 and 100`);
  }
  return Math.round(value * 100) / 100;
}

export async function getOrCreateSpaceLimits(): Promise<SpaceLimitsDTO> {
  let doc = await SystemSetting.findOne({ key: SPACE_LIMITS_KEY });
  if (!doc) {
    doc = await SystemSetting.create({
      key: SPACE_LIMITS_KEY,
      zoneAreaPercentOfWarehouse: 80,
      shelfAreaPercentOfZone: 80,
    });
  }
  return {
    zone_area_percent_of_warehouse: doc.zoneAreaPercentOfWarehouse,
    shelf_area_percent_of_zone: doc.shelfAreaPercentOfZone,
  };
}

export async function updateSpaceLimits(payload: {
  zone_area_percent_of_warehouse: number;
  shelf_area_percent_of_zone: number;
}): Promise<SpaceLimitsDTO> {
  const zonePct = normalizePercent(payload.zone_area_percent_of_warehouse, "zone_area_percent_of_warehouse");
  const shelfPct = normalizePercent(payload.shelf_area_percent_of_zone, "shelf_area_percent_of_zone");

  const doc = await SystemSetting.findOneAndUpdate(
    { key: SPACE_LIMITS_KEY },
    {
      $set: {
        zoneAreaPercentOfWarehouse: zonePct,
        shelfAreaPercentOfZone: shelfPct,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    zone_area_percent_of_warehouse: doc.zoneAreaPercentOfWarehouse,
    shelf_area_percent_of_zone: doc.shelfAreaPercentOfZone,
  };
}
