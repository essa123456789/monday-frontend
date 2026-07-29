/**
 * Country and time-zone lookup data for the profile.
 *
 * Only the ISO codes are hard-coded — display names come from `Intl`, so the
 * list is always spelled the way the reader's own locale spells it and we never
 * ship a translation table that goes stale.
 */

/** ISO 3166-1 alpha-2 codes. */
const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
];

/** Fallback when a browser lacks Intl.supportedValuesOf (pre-2022 engines). */
const FALLBACK_ZONES = [
  "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
  "America/Bogota", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Mexico_City", "America/New_York", "America/Sao_Paulo", "America/Toronto",
  "Asia/Dhaka", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Jakarta", "Asia/Karachi",
  "Asia/Kolkata", "Asia/Manila", "Asia/Riyadh", "Asia/Seoul", "Asia/Shanghai",
  "Asia/Singapore", "Asia/Tokyo", "Australia/Melbourne", "Australia/Sydney",
  "Europe/Amsterdam", "Europe/Berlin", "Europe/Dublin", "Europe/Istanbul",
  "Europe/Lisbon", "Europe/London", "Europe/Madrid", "Europe/Moscow",
  "Europe/Paris", "Europe/Rome", "Europe/Stockholm", "Europe/Warsaw",
  "Pacific/Auckland", "UTC",
];

let countryNames: Intl.DisplayNames | null | undefined;

/** Human-readable country name for an ISO code, falling back to the code. */
export function countryLabel(code: string): string {
  if (!code) return "";
  if (countryNames === undefined) {
    try {
      countryNames = new Intl.DisplayNames(undefined, { type: "region" });
    } catch {
      countryNames = null;
    }
  }
  return countryNames?.of(code.toUpperCase()) ?? code.toUpperCase();
}

/** Regional-indicator flag emoji for an ISO code. */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

/** Every country, sorted by localised name. */
export function countryOptions(): CountryOption[] {
  return COUNTRY_CODES.map((code) => ({
    code,
    name: countryLabel(code),
    flag: countryFlag(code),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/** The browser's own time zone, or "UTC" if it can't be read. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Current UTC offset of a zone, formatted as "UTC+05:00". */
export function timezoneOffsetLabel(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    // "GMT+5" / "GMT" — normalise both to a padded UTC±HH:MM.
    const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
    if (!match) return "UTC+00:00";
    return `UTC${match[1]}${match[2].padStart(2, "0")}:${match[3] ?? "00"}`;
  } catch {
    return "";
  }
}

/** Local wall-clock time in a zone, e.g. "14:35". */
export function timezoneLocalTime(zone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  } catch {
    return "";
  }
}

export interface TimezoneOption {
  zone: string;
  /** "Asia/Karachi" with the underscores removed, for reading and searching. */
  label: string;
  offset: string;
  /** Minutes east of UTC — sorts the list the way a world clock reads. */
  offsetMinutes: number;
}

/** Every IANA zone the browser knows, ordered west to east. */
export function timezoneOptions(): TimezoneOption[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  ).supportedValuesOf;
  let zones: string[];
  try {
    zones = supported ? supported("timeZone") : FALLBACK_ZONES;
  } catch {
    zones = FALLBACK_ZONES;
  }
  return zones
    .map((zone) => {
      const offset = timezoneOffsetLabel(zone);
      const m = /UTC([+-])(\d{2}):(\d{2})/.exec(offset);
      const minutes = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
      return {
        zone,
        label: zone.replace(/_/g, " "),
        offset,
        offsetMinutes: minutes,
      };
    })
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.zone.localeCompare(b.zone));
}
