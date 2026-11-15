import type { Condition } from "@portfolio/shared";

/**
 * WeatherAPI condition codes grouped by the icon that shows them. Codes go up
 * in steps of 3, so they're listed explicitly rather than as ranges. Checked
 * against WeatherAPI's weather_conditions.json (fixtures/), 60 codes.
 */
const CODES_BY_CONDITION: Record<Condition, readonly number[]> = {
  clear: [1000],
  pcloudy: [1003],
  cloudy: [1006],
  mcloudy: [1009],
  // 1012–1048 (haze, dust, smoke, smog) have no icon of their own.
  fog: [1012, 1015, 1018, 1021, 1024, 1027, 1030, 1033, 1036, 1039, 1042, 1045, 1048, 1135, 1147],
  lightrain: [1063, 1150, 1153, 1180, 1183],
  rain: [1186, 1189, 1192, 1195],
  ishower: [1240],
  oshower: [1243, 1246],
  rainsnow: [1069, 1072, 1168, 1171, 1198, 1201, 1204, 1207, 1249, 1252],
  lightsnow: [1066, 1210, 1213, 1255],
  snow: [1114, 1117, 1216, 1219, 1222, 1225, 1237, 1258, 1261, 1264],
  tstorm: [1087],
  // Includes snow with thunder (1279, 1282): no dedicated icon.
  tsrain: [1273, 1276, 1279, 1282],
};

export const CODE_TO_CONDITION: ReadonlyMap<number, Condition> = new Map(
  Object.entries(CODES_BY_CONDITION).flatMap(([condition, codes]) =>
    codes.map((code) => [code, condition as Condition] as const),
  ),
);

/** Maps a WeatherAPI condition code to an icon, falling back to `cloudy`. */
export function toCondition(code: number): Condition {
  return CODE_TO_CONDITION.get(code) ?? "cloudy";
}
