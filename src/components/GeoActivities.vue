
<template>
  <section class="geo-panel" aria-labelledby="geo-title">
    <h2 id="geo-title">Explore Melbourne green activities</h2>
    <p>Explore activity markers, search for places, and plan a trip. Location access is optional. Some activity markers use approximate suburb centres, not verified venue addresses.</p>

    <div class="geo-controls">
      <button type="button" @click="locate" :disabled="locating">{{ locating ? 'Locating…' : '📍 Use my location' }}</button>
      <button v-if="position" type="button" @click="clearLocation">Clear location</button>
      <button type="button" @click="resetMap">Show Melbourne activities</button>
    </div>

    <form class="place-search" @submit.prevent="searchPlaces">
      <label for="geo-search">Search places of interest in Melbourne</label>
      <div class="search-line">
        <input id="geo-search" v-model.trim="searchText" type="search" maxlength="120" placeholder="e.g. Royal Botanic Gardens, Melbourne" autocomplete="off" />
        <button type="submit" :disabled="searching || searchText.length < 3">{{ searching ? 'Searching…' : 'Search places' }}</button>
      </div>
      <small>Search uses OpenStreetMap Nominatim. Search only when needed; results may be incomplete.</small>
    </form>

    <p role="status" aria-live="polite" aria-atomic="true" class="geo-status">{{ status }}</p>
    <div v-if="mapError" role="alert" class="geo-error">{{ mapError }}. You can still use the activity links below.</div>
    <p id="geo-map-help" class="map-help">Keyboard users: use the activity list or place-search results below to select a destination. The map also supports zoom controls. Use the directions link for detailed navigation.</p>
    <div ref="mapElement" class="geo-map" aria-label="Interactive map of Melbourne green activities and places" aria-describedby="geo-map-help" role="region"></div>
    <p class="map-credit">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>. Map tiles require internet access.</p>

    <div v-if="searchResults.length" class="geo-results" aria-labelledby="geo-results-heading">
      <h3 id="geo-results-heading">Place search results</h3>
      <ul>
        <li v-for="place in searchResults" :key="place.place_id">
          <button type="button" @click="selectPlace(place)">{{ place.display_name }}</button>
        </li>
      </ul>
    </div>

    <div class="geo-grid">
      <div>
        <h3>Activities</h3>
        <label for="geo-sort">Sort activities</label>
        <select id="geo-sort" v-model="sortMode">
          <option value="default">Original order</option>
          <option value="nearest" :disabled="!position">Nearest first</option>
        </select>
        <ul class="geo-list">
          <li v-for="item in listed" :key="item.id || item.name">
            <button type="button" @click="selectActivity(item)"><strong>{{ item.name }}</strong></button>
            <span> — {{ item.location || 'Location not specified' }}</span>
            <span v-if="position && validCoords(item)"> · {{ distance(position.lat, position.lng, Number(item.lat), Number(item.lng)).toFixed(1) }} km straight-line</span>
            <span v-if="!validCoords(item)" class="geo-note"> · No map coordinates</span>
            <span v-else-if="item.approximateLocation || !item.verifiedCoordinates" class="geo-note"> · Approximate location</span>
          </li>
        </ul>
      </div>
      <div class="trip-panel" aria-labelledby="geo-trip-heading">
        <h3 id="geo-trip-heading">Selected destination & trip</h3>
        <template v-if="destination">
          <p><strong>{{ destination.name }}</strong></p>
          <p>{{ destination.description }}</p>
          <p v-if="destination.approximate" class="geo-note">⚠ Approximate destination: verify the exact venue before travelling.</p>
          <p v-if="position">Straight-line distance: {{ distance(position.lat, position.lng, destination.lat, destination.lng).toFixed(1) }} km</p>
          <label for="travel-mode">Travel mode</label>
          <select id="travel-mode" v-model="travelMode" @change="calculateRoute">
            <option value="driving">Driving</option>
            <option value="walking">Walking</option>
            <option value="cycling">Cycling</option>
          </select>
          <div class="geo-controls">
            <button type="button" @click="calculateRoute" :disabled="!position || routing">{{ routing ? 'Planning…' : 'Show route & trip information' }}</button>
            <a :href="directionsUrl" target="_blank" rel="noopener noreferrer">Open directions ↗</a>
          </div>
          <p v-if="!position">Enable your location to estimate a route from your position.</p>
          <p v-if="routeInfo" role="status" aria-live="polite">Route: <strong>{{ routeInfo.km.toFixed(1) }} km</strong> · Estimated travel time: <strong>{{ Math.ceil(routeInfo.minutes) }} min</strong> ({{ travelMode }}; estimate only).</p>
          <p v-if="routeError" class="geo-note" role="alert">{{ routeError }}</p>
        </template>
        <p v-else>Select an activity marker or a place-search result to view details and directions.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

const props = defineProps({ events: { type: Array, required: true } })
const MELBOURNE = [-37.8136, 144.9631]
const position = ref(null)
const locating = ref(false)
const searching = ref(false)
const routing = ref(false)
const status = ref('Select an activity or search for a place. Location permission has not been requested.')
const mapError = ref('')
const sortMode = ref('default')
const searchText = ref('')
const searchResults = ref([])
const destination = ref(null)
const travelMode = ref('driving')
const routeInfo = ref(null)
const routeError = ref('')
const mapElement = ref(null)
let map, leaflet, markerLayer, positionMarker, destinationMarker, routeLayer
let disposed = false

function validCoords(item) {
  return item.lat !== null && item.lat !== undefined && item.lat !== '' &&
    item.lng !== null && item.lng !== undefined && item.lng !== '' &&
    Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)) &&
    Math.abs(Number(item.lat)) <= 90 && Math.abs(Number(item.lng)) <= 180
}
function distance(a, b, c, d) {
  const rad = n => n * Math.PI / 180
  const deltaLat = rad(c - a), deltaLng = rad(d - b)
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(deltaLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}
const listed = computed(() => {
  const items = [...props.events]
  if (position.value && sortMode.value === 'nearest') {
    return items.sort((a, b) => {
      const da = validCoords(a) ? distance(position.value.lat, position.value.lng, Number(a.lat), Number(a.lng)) : Infinity
      const db = validCoords(b) ? distance(position.value.lat, position.value.lng, Number(b.lat), Number(b.lng)) : Infinity
      return da - db
    })
  }
  return items
})
const directionsUrl = computed(() => {
  if (!destination.value) return 'https://www.openstreetmap.org/'
  const d = destination.value
  const dest = `${d.lat},${d.lng}`
  const start = position.value ? `${position.value.lat},${position.value.lng}` : ''
  const engine = travelMode.value === 'walking' ? 'fossgis_osrm_foot' : travelMode.value === 'cycling' ? 'fossgis_osrm_bike' : 'fossgis_osrm_car'
  return `https://www.openstreetmap.org/directions?engine=${engine}&route=${encodeURIComponent(start + ';' + dest)}`
})
function addStyle() {
  if (document.getElementById('greenlink-leaflet-css')) return
  const link = document.createElement('link')
  link.id = 'greenlink-leaflet-css'
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (window.__greenlinkLeafletPromise) return window.__greenlinkLeafletPromise
  window.__greenlinkLeafletPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('Leaflet did not initialise'))
    script.onerror = () => reject(new Error('Map library could not load'))
    document.head.appendChild(script)
  }).catch(err => { window.__greenlinkLeafletPromise = null; throw err })
  return window.__greenlinkLeafletPromise
}
function renderMarkers() {
  if (!map || !leaflet) return
  markerLayer.clearLayers()
  const points = []
  props.events.filter(validCoords).forEach(item => {
    const lat = Number(item.lat), lng = Number(item.lng)
    const marker = leaflet.marker([lat, lng]).addTo(markerLayer)
    marker.bindTooltip(item.name || 'Activity')
    marker.on('click', () => selectActivity(item))
    points.push([lat, lng])
  })
  if (points.length && !position.value && !destination.value) map.fitBounds(points, { padding: [35, 35], maxZoom: 12 })
}
function updatePositionMarker() {
  if (!map) return
  if (positionMarker) { map.removeLayer(positionMarker); positionMarker = null }
  if (position.value) {
    positionMarker = leaflet.circleMarker([position.value.lat, position.value.lng], {
      radius: 9, color: '#1254a0', fillColor: '#4285f4', fillOpacity: 0.9
    }).addTo(map).bindPopup('Your approximate current location')
  }
}
function selectDestination(next) {
  destination.value = next
  routeInfo.value = null
  routeError.value = ''
  if (map) {
    if (destinationMarker) map.removeLayer(destinationMarker)
    destinationMarker = leaflet.circleMarker([next.lat, next.lng], {
      radius: 11, color: '#175f37', fillColor: '#5ac486', fillOpacity: 0.8, weight: 3
    }).addTo(map).bindTooltip(next.name)
    map.setView([next.lat, next.lng], 13)
  }
  if (routeLayer && map) { map.removeLayer(routeLayer); routeLayer = null }
  status.value = `${next.name} selected. ${next.approximate ? 'Location is approximate.' : 'You can now plan a route.'}`
}
function selectActivity(item) {
  if (!validCoords(item)) { status.value = `${item.name} has no coordinates in Firestore. Add latitude and longitude to enable map navigation.`; return }
  selectDestination({ name: item.name, lat: Number(item.lat), lng: Number(item.lng),
    description: item.location || 'Activity location', approximate: item.approximateLocation || !item.verifiedCoordinates })
}
function selectPlace(place) {
  selectDestination({ name: place.display_name.split(',')[0], lat: Number(place.lat), lng: Number(place.lon),
    description: place.display_name, approximate: false })
}
async function searchPlaces() {
  if (searchText.value.length < 3 || searching.value) return
  searching.value = true
  searchResults.value = []
  status.value = 'Searching OpenStreetMap places…'
  try {
    const q = searchText.value.toLowerCase().includes('melbourne') ? searchText.value : `${searchText.value}, Melbourne, Victoria, Australia`
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=au&q=${encodeURIComponent(q)}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Search service returned ${response.status}`)
    const results = await response.json()
    searchResults.value = results.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
    status.value = searchResults.value.length ? `${searchResults.value.length} places found. Select one to view it on the map.` : 'No matching places found. Try a more specific Melbourne place name.'
  } catch (err) { status.value = `Place search unavailable: ${err.message}. Please try again later.` }
  finally { searching.value = false }
}
function locate() {
  if (!navigator.geolocation) { status.value = 'This browser does not support geolocation.'; return }
  if (!window.isSecureContext) { status.value = 'Location requires HTTPS or localhost.'; return }
  locating.value = true
  status.value = 'Waiting for location permission…'
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    if (disposed) return
    position.value = { lat: coords.latitude, lng: coords.longitude }
    sortMode.value = 'nearest'
    locating.value = false
    updatePositionMarker()
    if (map) map.setView([coords.latitude, coords.longitude], 12)
    status.value = 'Location acquired. Activities are sorted by straight-line distance.'
  }, err => {
    if (disposed) return
    locating.value = false
    status.value = err.code === 1 ? 'Location permission denied. Search and activity markers remain available.' : 'Location unavailable or timed out. Try again.'
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 })
}
function clearLocation() {
  position.value = null
  sortMode.value = 'default'
  routeInfo.value = null
  if (routeLayer && map) { map.removeLayer(routeLayer); routeLayer = null }
  updatePositionMarker()
  status.value = 'Your location has been cleared from this page.'
}
function resetMap() {
  status.value = 'Map reset to Melbourne activities. Select an activity from the list below.'
  if (map) map.setView(MELBOURNE, 10)
  destination.value = null
  routeInfo.value = null
  routeError.value = ''
  if (map && destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null }
  if (map && routeLayer) { map.removeLayer(routeLayer); routeLayer = null }
  renderMarkers()
}
async function calculateRoute() {
  if (!position.value || !destination.value || routing.value) return
  routing.value = true
  routeInfo.value = null
  routeError.value = ''
  if (routeLayer && map) { map.removeLayer(routeLayer); routeLayer = null }
  try {
    // OSRM public demo supports driving only. For walking/cycling, use the external directions link.
    if (travelMode.value !== 'driving') {
      routeError.value = 'Walking and cycling route estimates are not available in the embedded map. Use Open directions for the selected mode.'
      return
    }
    const a = position.value, b = destination.value
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Routing service returned ${response.status}`)
    const data = await response.json()
    const route = data.routes?.[0]
    if (!route?.geometry?.coordinates?.length) throw new Error('No drivable route found')
    routeInfo.value = { km: route.distance / 1000, minutes: route.duration / 60 }
    if (map && leaflet) {
      routeLayer = leaflet.geoJSON(route.geometry, { style: { color: '#2175b5', weight: 5 } }).addTo(map)
      map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] })
    }
    status.value = `Driving route loaded: ${routeInfo.value.km.toFixed(1)} kilometres, approximately ${Math.ceil(routeInfo.value.minutes)} minutes. See the trip panel for details.`
  } catch (err) { routeError.value = `Embedded routing unavailable (${err.message}). Use Open directions instead.` }
  finally { routing.value = false }
}
watch(() => props.events, () => nextTick(renderMarkers), { deep: true })
onMounted(async () => {
  try {
    addStyle()
    leaflet = await loadLeaflet()
    if (disposed || !mapElement.value) return
    map = leaflet.map(mapElement.value).setView(MELBOURNE, 10)
    leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(map)
    markerLayer = leaflet.layerGroup().addTo(map)
    renderMarkers()
    setTimeout(() => { if (!disposed && map) map.invalidateSize() }, 200)
  } catch (err) { if (!disposed) mapError.value = `Interactive map could not load (${err.message})` }
})
onBeforeUnmount(() => { disposed = true; if (map) { map.remove(); map = null } })
</script>

<style scoped>
.geo-panel{background:#fff;padding:22px;margin:24px 0;border-radius:12px;color:#172b1c}
.geo-panel h2,.geo-panel h3{margin-top:0}.geo-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}
.geo-panel button,.geo-panel select,.geo-panel input{padding:9px 12px;border:1px solid #9aaea0;border-radius:6px;font:inherit}
.geo-panel button{cursor:pointer;background:#e5f4e8;color:#164d2c}.geo-panel button:disabled{opacity:.6;cursor:not-allowed}
.geo-panel a{color:#124f8c;text-decoration:underline}.place-search{margin:16px 0}.place-search label{display:block;font-weight:600;margin-bottom:5px}
.search-line{display:flex;gap:8px;flex-wrap:wrap}.search-line input{flex:1;min-width:200px}.place-search small,.map-credit,.geo-note{font-size:.86rem;color:#655324}
.map-help{background:#f4f8f4;border-left:4px solid #315c3a;padding:10px 12px;overflow-wrap:anywhere}.geo-status{min-height:1.6em}.geo-error{color:#9c2323}.geo-map{height:440px;min-height:320px;width:100%;border:1px solid #c8d7c9;border-radius:9px;z-index:0}
.map-credit{margin:6px 0 20px}.geo-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}
.geo-list,.geo-results ul{padding-left:22px}.geo-list li,.geo-results li{margin:10px 0}.geo-list button,.geo-results button{background:transparent;border:0;text-align:left;color:#124f8c;text-decoration:underline;padding:2px}
.trip-panel{background:#f4f8f4;border-radius:9px;padding:16px}.trip-panel p{overflow-wrap:anywhere}
:focus-visible{outline:3px solid #b45309;outline-offset:3px}.geo-map:focus-within{outline:3px solid #b45309;outline-offset:3px}@media(max-width:720px){.geo-grid{grid-template-columns:1fr}.geo-map{height:340px}.geo-panel{padding:14px}}
</style>
