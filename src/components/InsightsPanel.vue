<template>
  <section class="insights" aria-labelledby="insights-title">
    <h2 id="insights-title">Community insights and offline tools</h2>
    <p role="status" aria-live="polite">
      {{ online ? 'Online' : 'Offline' }} — saved notes remain available in this browser.
    </p>

    <label for="community-notes">My activity notes (saved locally, not shared)</label>
    <textarea id="community-notes" v-model="notes" rows="3" maxlength="1000"
      aria-describedby="notes-help" placeholder="Write a reminder for your next activity"></textarea>
    <p id="notes-help"><small>Notes are saved automatically in this browser on this device. Do not enter sensitive information.</small></p>

    <h3 id="activity-chart-title">Interactive activity chart</h3>
    <label for="chart-mode">Chart metric</label>
    <select id="chart-mode" v-model="metric" aria-controls="activity-chart activity-chart-data">
      <option value="places">Available places</option>
      <option value="reviews">Review count</option>
      <option value="trees">Trees planned</option>
    </select>

    <div id="activity-chart" class="chart" role="img" :aria-label="chartDescription">
      <div v-for="item in chartData" :key="item.name" class="chart-row" aria-hidden="true">
        <span class="chart-name">{{ item.name }}</span>
        <div class="bar-track"><div class="bar" :style="{ width: `${item.percent}%` }"></div></div>
        <strong>{{ item.value }}</strong>
      </div>
      <p v-if="!chartData.length" aria-hidden="true">No activity data available.</p>
    </div>
    <p class="chart-caption" role="status" aria-live="polite" aria-atomic="true">{{ chartSummary }}</p>

    <div id="activity-chart-data" class="data-alternative" aria-labelledby="chart-data-title">
      <h4 id="chart-data-title">Chart data in table format</h4>
      <div class="table-scroll">
        <table>
          <caption>{{ metricLabel }} by activity</caption>
          <thead>
            <tr><th scope="col">Activity</th><th scope="col">{{ metricLabel }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in chartData" :key="item.name">
              <th scope="row">{{ item.name }}</th><td>{{ item.value }}</td>
            </tr>
            <tr v-if="!chartData.length"><td colspan="2">No activity data available.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p><small>Statistics are calculated from activity and review data provided by the application.</small></p>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  events: { type: Array, required: true },
  reviews: { type: Array, required: true }
})

const metric = ref('places')
const online = ref(true)
const notes = ref('')
const updateOnline = () => { online.value = navigator.onLine }

onMounted(() => {
  online.value = navigator.onLine
  try { notes.value = localStorage.getItem('greenlink-personal-notes') || '' }
  catch (error) { console.warn('Local notes are unavailable:', error) }
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
})
onUnmounted(() => {
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
})
watch(notes, value => {
  try { localStorage.setItem('greenlink-personal-notes', value) }
  catch (error) { console.warn('Could not save notes locally:', error) }
})

const metricLabel = computed(() => ({
  places: 'Available places', reviews: 'Review count', trees: 'Trees planned'
})[metric.value])

const chartData = computed(() => {
  const items = props.events.map(event => ({
    name: event.name || 'Unnamed activity',
    value: metric.value === 'reviews'
      ? props.reviews.filter(review => review.event === event.name).length
      : Number(event[metric.value] || 0)
  }))
  const max = Math.max(1, ...items.map(item => item.value))
  return items.map(item => ({ ...item, percent: Math.max(0, item.value) / max * 100 }))
})

const chartSummary = computed(() => chartData.value.length
  ? `${metricLabel.value}: ${chartData.value.length} activities shown. A data table is provided below.`
  : `${metricLabel.value}: no activity data available.`)

const chartDescription = computed(() =>
  `${metricLabel.value} by activity. ` +
  (chartData.value.length
    ? chartData.value.map(item => `${item.name}: ${item.value}`).join('; ')
    : 'No activity data available.')
)
</script>

<style scoped>
.insights { background:#fff; color:#172b1c; padding:24px; border-radius:10px; margin:24px 0; min-width:0 }
.insights label { display:block; font-weight:600 }
.insights textarea { display:block; width:100%; max-width:700px; margin:8px 0 }
.insights select { display:block; margin:8px 0 18px; padding:8px; max-width:100% }
.chart-row { display:grid; grid-template-columns:minmax(0,2fr) minmax(70px,3fr) minmax(35px,auto); gap:12px; align-items:center; margin:14px 0 }
.chart-name { overflow-wrap:anywhere }
.bar-track { height:24px; background:#e6ede7; border-radius:4px; overflow:hidden }
.bar { height:100%; background:#276a40; border-radius:4px }
.chart-caption { font-size:.95rem; overflow-wrap:anywhere }
.data-alternative { margin-top:20px }
.table-scroll { max-width:100%; overflow-x:auto }
table { width:100%; border-collapse:collapse }
th, td { padding:10px; border:1px solid #a6b8aa; text-align:left; overflow-wrap:anywhere }
thead { background:#e6ede7 }
caption { text-align:left; padding:8px 0; font-weight:600 }
:focus-visible { outline:3px solid #a84d00; outline-offset:3px }
@media (max-width:600px) { .insights { padding:14px } .chart-row { grid-template-columns:minmax(0,1fr) minmax(55px,1fr) auto; gap:7px } }
</style>
