async function initMap() {
  loadMap({
    elementId: 'gawsworth-map',
    center: { lat: 53.2305637, lng: -2.168794 },
    infoContent: `
      <div><strong>Wild About Pilates</strong><br>
      Gawsworth Village Hall<br>
      Church Lane<br>
      Macclesfield<br>
      SK11 9RJ</div>`
  });

  loadMap({
    elementId: 'substation-map',
    center: { lat: 53.268268, lng: -2.118140 },
    infoContent: `
      <div><strong>Wild About Pilates</strong><br>
      Substation<br>
      Queen&lsquo;s Avenue<br>
      Macclesfield<br>
      SK10 2BN</div>`
  });
}

async function loadMap({ elementId, center, infoContent }) {
  const elem = document.getElementById(elementId);
  if (elem === null) return;

  const { Map } = await google.maps.importLibrary("maps");

  const map = new Map(elem, {
    zoom: 15,
    center: center,
    mapId: elementId,
  });

  const infowindow = new google.maps.InfoWindow({
    content: infoContent
  });

  const {AdvancedMarkerElement} = await google.maps.importLibrary("marker");

  const marker = new AdvancedMarkerElement({
    map: map,
    position: center
  });

  marker.addListener('gmp-click', () => {
    infowindow.open(map, marker);
  });
}
