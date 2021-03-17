/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoieGF2aWVybWFsZG9uYWRvbnkiLCJhIjoiY2ttN2QxMjFtMGs2MDJwczl5dHFyZjR3OSJ9.-8r-q505TaEEkX80NDqvHw';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/xaviermaldonadony/ckm8ui9gh1uc519qo8lahxl7i',
    scrollZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bootom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map); // adds it to the map var defined previously

    // Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    //  Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
