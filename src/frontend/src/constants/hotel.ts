export const HOTEL = {
  name: "Sann's Tropicana Hotel",
  address:
    "New No: 7, 2, Vishveshvaraiyar St, Srinivasapuram, Guduvancheri, Tamil Nadu 603202",
  phone: "074489 39627",
  gstNo: "33AJIPA9057C2ZJ",
  email: "enquiry@sannstropicana.com",
  website: "www.sannstropicana.com",
  tagline: "Experience Comfort & Hospitality",
} as const;

export const ROOM_CATEGORIES = [
  "Single Executive",
  "Standard Double",
  "Deluxe Double",
  "Twin Double Bed",
] as const;
export type RoomCategory = (typeof ROOM_CATEGORIES)[number];

export const ROOM_CODE_MAP: Record<string, RoomCategory> = {
  "601": "Single Executive",
  "602": "Standard Double",
  "608": "Standard Double",
  "612": "Standard Double",
  "618": "Standard Double",
  "603": "Deluxe Double",
  "604": "Deluxe Double",
  "605": "Deluxe Double",
  "606": "Deluxe Double",
  "607": "Deluxe Double",
  "613": "Deluxe Double",
  "614": "Deluxe Double",
  "615": "Deluxe Double",
  "616": "Deluxe Double",
  "617": "Deluxe Double",
  "609": "Twin Double Bed",
  "610": "Twin Double Bed",
  "619": "Twin Double Bed",
  "620": "Twin Double Bed",
};

export const ROOM_RATES: Record<
  RoomCategory,
  { withoutBreakfast: number; withBreakfast: number }
> = {
  "Single Executive": { withoutBreakfast: 1600, withBreakfast: 1800 },
  "Standard Double": { withoutBreakfast: 2300, withBreakfast: 2500 },
  "Deluxe Double": { withoutBreakfast: 2800, withBreakfast: 3000 },
  "Twin Double Bed": { withoutBreakfast: 3600, withBreakfast: 3800 },
};

export const ROOM_TYPES = ROOM_CATEGORIES;
export type RoomType = RoomCategory;
