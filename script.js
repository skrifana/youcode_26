
    // Try to center on user's location, fall back to world view
    const map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Try to get user's location on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => map.setView([pos.coords.latitude, pos.coords.longitude], 12),
        () => {} // silently fall back to world view if denied
      );
    }

    let marker = null;

    async function searchLocation() {
      const query = document.getElementById('searchInput').value.trim();
      if (!query) return;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      const data = await res.json();

      if (!data.length) {
        alert('Location not found.');
        return;
      }

      const { lat, lon, display_name } = data[0];
      const latlng = [parseFloat(lat), parseFloat(lon)];

      map.setView(latlng, 12);

      if (marker) marker.remove();
      marker = L.marker(latlng).addTo(map).bindPopup(display_name).openPopup();
    }

    document.getElementById('searchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') searchLocation();
    });
  