async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  const elem = document.getElementById('gawsworth-map');
  if (elem === null) return;

  const center = { lat: 53.2305637, lng: -2.168794 };

  const map = new Map(elem, {
    zoom: 15,
    center: center,
    mapId: '696202b44bbd260d4ae016f2',
  });

  const infowindow = new google.maps.InfoWindow({
    content: `<div><strong>Wild About Pilates</strong><br>
      Gawsworth Village Hall<br>
      Church Lane<br>
      Macclesfield<br>
      SK11 9RJ</div>`
  });

  const marker = new AdvancedMarkerElement({
    map: map,
    position: center
  });

  marker.addListener('gmp-click', () => {
    infowindow.open(map, marker);
  });
}
