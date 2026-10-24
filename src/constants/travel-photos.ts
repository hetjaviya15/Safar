import type { Destination } from '@/types/models';
import type { PlacePhoto } from '@/services/destination-info';
import { distanceKm } from '../../supabase/functions/_shared/destination-provider';
export type CuratedPhoto = PlacePhoto & { id: string; name: string; country: string; latitude: number; longitude: number; licenseUrl: string };
export const travelPhotos: CuratedPhoto[] = [
  {
    id: 'manali',
    name: 'Manali',
    country: 'India',
    latitude: 32.2396,
    longitude: 77.1887,
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Manali_mountains_India.jpg/1280px-Manali_mountains_India.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Manali_mountains_India.jpg',
    credit: 'Awwal Siwach',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  },
  {
    "id": "paris",
    "name": "Paris",
    "country": "France",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg/1280px-La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques,_Paris_ao%C3%BBt_2014_(2).jpg",
    "credit": "Yann Caradec from Paris, France",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0"
  },
  {
    "id": "kyoto",
    "name": "Kyoto",
    "country": "Japan",
    "latitude": 35.0116,
    "longitude": 135.7681,
    "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Kyoto%2C_Japan_%2849667780482%29.jpg/1280px-Kyoto%2C_Japan_%2849667780482%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kyoto,_Japan_(49667780482).jpg",
    "credit": "Nina R from Africa",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0"
  },
  {
    "id": "bali",
    "name": "Bali",
    "country": "Indonesia",
    "latitude": -8.3405,
    "longitude": 115.092,
    "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/Pura_Ulun_Danu_Bratan_3.JPG/1280px-Pura_Ulun_Danu_Bratan_3.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Pura_Ulun_Danu_Bratan_3.JPG",
    "credit": "Manuae",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0"
  },
  {
    "id": "zermatt",
    "name": "Zermatt",
    "country": "Switzerland",
    "latitude": 46.0207,
    "longitude": 7.7491,
    "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/1_zermatt_evening_2022.jpg/1280px-1_zermatt_evening_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:1_zermatt_evening_2022.jpg",
    "credit": "Chensiyuan",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  {
    "id": "jaipur",
    "name": "Jaipur",
    "country": "India",
    "latitude": 26.9124,
    "longitude": 75.7873,
    "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg/1280px-East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:East_facade_Hawa_Mahal_Jaipur_from_ground_level_(July_2022)_-_img_01.jpg",
    "credit": "Chainwit.",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  {
    "id": "cape-town",
    "name": "Cape Town",
    "country": "South Africa",
    "latitude": -33.9249,
    "longitude": 18.4241,
    "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Camps_bay_%2853460319478%29_%28cropped%29.jpg/1280px-Camps_bay_%2853460319478%29_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Camps_bay_(53460319478)_(cropped).jpg",
    "credit": "Der Berzerker from Washington, DC, USA",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0"
  }
];

export function curatedPhoto(destination: Destination): CuratedPhoto | undefined {
  return travelPhotos.find(photo => {
    if (destination.name.trim().toLowerCase() !== photo.name.toLowerCase()) return false;
    const coordinates = Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude);
    if (coordinates) return distanceKm(destination.latitude!, destination.longitude!, photo.latitude, photo.longitude) < (photo.id === 'bali' ? 80 : 30);
    // A custom name alone must not silently match a city in another country.
    return destination.country?.toLowerCase() === photo.country.toLowerCase() || destination.displayName.toLowerCase().split(',').map(s => s.trim()).includes(photo.country.toLowerCase());
  });
}
