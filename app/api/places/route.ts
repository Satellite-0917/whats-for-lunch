import { NextResponse } from 'next/server';
import { fetchSheet } from '../../lib/sheets';

type PlaceRow = {
  place_id: string | null;
  name: string | null;
  group: string | null;
  category: string | null;
  lat: string | number | null;
  lng: string | number | null;
  map_url: string | null;
  status: string | null;
  updated_at: string | null;
};

type CategoryColorRow = {
  category: string | null;
  color: string | null;
};

export async function GET() {
  try {
    const [placesData, colorsData] = await Promise.all([
      fetchSheet('places', { next: { revalidate: 300 } }),
      fetchSheet('category_colors', { next: { revalidate: 300 } }),
    ]);

    const places = (placesData as PlaceRow[])
      .map((place) => ({
        place_id: place.place_id ? String(place.place_id) : '',
        name: place.name ? String(place.name) : '',
        group: place.group ? String(place.group) : '',
        category: place.category ? String(place.category) : '기타',
        lat: Number(place.lat),
        lng: Number(place.lng),
        map_url: place.map_url ? String(place.map_url) : '',
        status: place.status ? String(place.status) : '',
        updated_at: place.updated_at ? String(place.updated_at) : null,
      }))
      .filter((place) => place.place_id && place.name)
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));

    const categoryColors = (colorsData as CategoryColorRow[]).reduce<Record<string, string>>((acc, item) => {
      if (item.category && item.color) {
        acc[String(item.category)] = String(item.color);
      }
      return acc;
    }, {});

    return NextResponse.json({ places, categoryColors });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.',
      },
      { status: 500 },
    );
  }
}
