import { validDestination } from '../../supabase/functions/_shared/geo';
export function destinationFromTrip(trip) {
  return {
    placeId: trip.destination_place_id ?? trip.id,
    name: trip.destination.split(',')[0],
    displayName: trip.destination,
    latitude: trip.destination_lat ?? undefined,
    longitude: trip.destination_lon ?? undefined,
    imageUrl: trip.cover_image_url ?? undefined
  };
}
export function parseDestination(value) {
  try {
    const d = JSON.parse(value ?? 'null');
    return validDestination(d) ? d : null;
  } catch {
    return null;
  }
}
export function hasCoordinates(d) {
  return Number.isFinite(d.latitude) && Number.isFinite(d.longitude) && Math.abs(d.latitude) <= 90 && Math.abs(d.longitude) <= 180;
}
export function directionsUrl(place, destination) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, ${destination}`)}`;
}
export const guides = {
  'featured-kyoto': {
    overview: 'Temple gardens, quiet lanes and traditional teahouses. Take your time discovering Kyoto, from the eastern hills to the riverside.',
    bestTime: 'Spring and autumn are popular for blossoms and foliage. Visit major temples early and check seasonal opening hours.',
    highlights: [{
      name: 'Fushimi Inari Taisha',
      detail: 'Walk beneath the vermilion torii gates.',
      latitude: 34.9671,
      longitude: 135.7727
    }, {
      name: 'Kiyomizu-dera',
      detail: 'A hillside temple overlooking the city.',
      latitude: 34.9949,
      longitude: 135.785
    }]
  },
  'featured-bali': {
    overview: 'A lush island of rice terraces, Hindu temples and coastal villages. Balance slower days inland with time beside the ocean.',
    bestTime: 'The drier months usually run from April to October. Check local conditions before beach visits and mountain walks.',
    highlights: [{
      name: 'Uluwatu Temple',
      detail: 'A clifftop temple on the Bukit peninsula.',
      latitude: -8.8291,
      longitude: 115.0849
    }, {
      name: 'Tegallalang Rice Terrace',
      detail: 'Terraced fields north of Ubud.',
      latitude: -8.434,
      longitude: 115.279
    }]
  },
  'featured-jaipur': {
    overview: 'Discover the Pink City through ornate courtyards, historic forts and lively bazaars. Leave room for local food and crafts.',
    bestTime: 'October to March is generally more comfortable for sightseeing. Summer afternoons can be very hot.',
    highlights: [{
      name: 'Hawa Mahal',
      detail: 'The iconic sandstone Palace of Winds.',
      latitude: 26.9239,
      longitude: 75.8267
    }, {
      name: 'Amber Fort',
      detail: 'Hilltop courtyards and grand architecture.',
      latitude: 26.9858,
      longitude: 75.8513
    }]
  },
  'featured-paris': {
    overview: 'Neighborhood cafés, river walks and extraordinary art. Mix a landmark or two with a day exploring at your own pace.',
    bestTime: 'Spring and autumn suit walking. Reserve popular museums ahead and check weekly closure days.',
    highlights: [{
      name: 'Eiffel Tower',
      detail: 'The city landmark beside the Seine.',
      latitude: 48.8584,
      longitude: 2.2945
    }, {
      name: 'Louvre Museum',
      detail: 'Art collections in a former royal palace.',
      latitude: 48.8606,
      longitude: 2.3376
    }]
  },
  'featured-zermatt': {
    overview: 'An alpine village beneath the Matterhorn, with mountain paths and railway viewpoints. Choose activities that suit the season.',
    bestTime: 'Summer favors hiking and winter favors skiing. Mountain weather changes quickly; check trail and lift conditions.',
    highlights: [{
      name: 'Gornergrat',
      detail: 'A mountain railway viewpoint.',
      latitude: 45.9836,
      longitude: 7.7847
    }, {
      name: 'Matterhorn Museum',
      detail: 'Stories of the village and its mountaineers.',
      latitude: 46.0194,
      longitude: 7.7469
    }]
  },
  'featured-cape-town': {
    overview: 'Mountain scenery, coastal drives and colorful neighborhoods. Explore a varied city between the Atlantic and Table Mountain.',
    bestTime: 'The warmer months are generally November to March. Wind can affect cableway and boat operations.',
    highlights: [{
      name: 'Table Mountain',
      detail: 'A landmark plateau above the city.',
      latitude: -33.9628,
      longitude: 18.4098
    }, {
      name: 'Kirstenbosch Gardens',
      detail: 'Indigenous gardens at the mountain’s foot.',
      latitude: -33.988,
      longitude: 18.4327
    }]
  }
};