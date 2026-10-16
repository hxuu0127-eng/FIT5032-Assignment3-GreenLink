<template>
  <section class="geo-panel" aria-labelledby="geo-title">
    <h2 id="geo-title">Find nearby green activities</h2>
    <p>Use your location to find the nearest activity. Location permission is optional. Activity pins are approximate suburb centres, not verified venue coordinates.</p>
    <button type="button" @click="locate" :disabled="loading">
      {{ loading ? 'Finding location…' : 'Use my current location' }}
    </button>
    <button v-if="position" type="button" @click="clearLocation">Clear my location</button>
    <p role="status" aria-live="polite">{{ status }}</p>
    <label for="geo-sort">Sort activities</label>
    <select id="geo-sort" v-model="sortMode">
      <option value="default">Original order</option>
      <option value="nearest" :disabled="!position">Nearest first</option>
    </select>
    <ul class="geo-list">
      <li v-for="item in listed" :key="item.name">
        <strong>{{ item.name }}</strong> — {{ item.location }}
        <span v-if="position"> · {{ distance(position.lat, position.lng, item.lat, item.lng).toFixed(1) }} km (straight-line estimate)</span>
        <a :href="mapUrl(item)" target="_blank" rel="noopener noreferrer" :aria-label="`View approximate ${item.location} location on OpenStreetMap (opens new tab)`">View map</a>
        <a v-if="position" :href="directionsUrl(item)" target="_blank" rel="noopener noreferrer" :aria-label="`Directions to approximate ${item.location} location (opens new tab)`">Directions</a>
      </li>
    </ul>
    <p v-if="position && listed.length">Closest activity: <strong>{{ closest.name }}</strong>.</p>
  </section>
</template>
<script setup>
import { ref, computed } from 'vue'
const props = defineProps({ events: { type: Array, required: true } })
const position = ref(null)
const loading = ref(false)
const status = ref('Location not requested.')
const sortMode = ref('default')
function distance(a,b,c,d) {
  const rad = n => n * Math.PI / 180
  const deltaLat = rad(c-a), deltaLng = rad(d-b)
  const h = Math.sin(deltaLat/2)**2 + Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(deltaLng/2)**2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h))
}
const nearest = computed(() => [...props.events].filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lng)).sort((a,b) => distance(position.value.lat, position.value.lng,a.lat,a.lng) - distance(position.value.lat,position.value.lng,b.lat,b.lng)))
const listed = computed(() => position.value && sortMode.value === 'nearest' ? nearest.value : props.events)
const closest = computed(() => position.value ? nearest.value[0] || {} : {})
function locate() {
  if (!navigator.geolocation) { status.value = 'Geolocation is not supported in this browser.'; return }
  loading.value = true
  status.value = 'Waiting for location permission…'
  navigator.geolocation.getCurrentPosition(
    ({coords}) => { position.value = {lat:coords.latitude,lng:coords.longitude}; sortMode.value='nearest'; status.value='Location acquired. Activities are sorted by estimated distance.'; loading.value=false },
    error => { status.value = error.code === 1 ? 'Location permission denied. You can still browse activities.' : 'Could not determine location. Please try again.'; loading.value=false },
    {enableHighAccuracy:false,timeout:12000,maximumAge:60000}
  )
}
function clearLocation() { position.value=null;sortMode.value='default';status.value='Location cleared from this page.' }
function mapUrl(e) { return `https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=14/${e.lat}/${e.lng}` }
function directionsUrl(e) { return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${position.value.lat}%2C${position.value.lng}%3B${e.lat}%2C${e.lng}` }
</script>
<style scoped>
.geo-panel{background:#fff;padding:22px;margin:24px 0;border-radius:10px;color:#172b1c}
.geo-panel button,.geo-panel select{margin:5px 10px 5px 0;padding:8px}
.geo-list{padding-left:24px}.geo-list li{margin:12px 0;line-height:1.6}
.geo-list a{margin-left:12px;color:#124f8c;text-decoration:underline}
:focus-visible{outline:3px solid #b45309;outline-offset:3px}
</style>
