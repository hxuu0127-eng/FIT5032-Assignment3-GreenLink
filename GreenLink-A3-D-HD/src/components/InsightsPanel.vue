<template>
  <section class="insights" aria-labelledby="insights-title">
    <h2 id="insights-title">Community insights and offline tools</h2>
    <p role="status" aria-live="polite">{{ online ? 'Online' : 'Offline' }} — saved notes remain available in this browser.</p>
    <label for="community-notes">My activity notes (saved locally, not shared)</label>
    <textarea id="community-notes" v-model="notes" rows="3" maxlength="1000" placeholder="Write a reminder for your next activity"></textarea>
    <p><small>Notes are saved automatically on this device. Do not enter sensitive information.</small></p>
    <h3>Interactive activity chart</h3>
    <label for="chart-mode">Chart metric</label>
    <select id="chart-mode" v-model="metric">
      <option value="places">Available places</option>
      <option value="reviews">Review count</option>
      <option value="trees">Trees planned</option>
    </select>
    <div class="chart" role="img" :aria-label="chartDescription">
      <div v-for="item in chartData" :key="item.name" class="chart-row">
        <span>{{ item.name }}</span>
        <div class="bar-track"><div class="bar" :style="{ width: `${item.percent}%` }"></div></div>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <p class="chart-caption">{{ chartDescription }}</p>
    <p><small>Chart currently uses application data. Firestore integration is required before claiming Firestore-backed charts.</small></p>
  </section>
</template>
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
const props = defineProps({ events: {type:Array,required:true}, reviews:{type:Array,required:true} })
const metric = ref('places'), online = ref(true), notes = ref('')
const updateOnline = () => { online.value = navigator.onLine }
onMounted(() => { online.value = navigator.onLine; notes.value = localStorage.getItem('greenlink-personal-notes') || ''; window.addEventListener('online',updateOnline); window.addEventListener('offline',updateOnline) })
onUnmounted(() => { window.removeEventListener('online',updateOnline); window.removeEventListener('offline',updateOnline) })
watch(notes, value => localStorage.setItem('greenlink-personal-notes',value))
const chartData = computed(() => {
  const items = props.events.map(event => ({ name:event.name, value:metric.value === 'reviews' ? props.reviews.filter(r => r.event === event.name).length : Number(event[metric.value] || 0) }))
  const max = Math.max(1,...items.map(x=>x.value))
  return items.map(item=>({...item,percent:item.value/max*100}))
})
const chartDescription = computed(()=> `${metric.value === 'places' ? 'Available places' : metric.value === 'trees' ? 'Trees planned' : 'Review count'}: ` + chartData.value.map(x=>`${x.name}: ${x.value}`).join('; '))
</script>
<style scoped>
.insights{background:#fff;color:#172b1c;padding:24px;border-radius:10px;margin:24px 0}.insights textarea{display:block;width:100%;max-width:700px;margin:8px 0}.insights select{display:block;margin:8px 0 18px;padding:8px}.chart-row{display:grid;grid-template-columns:minmax(120px,2fr) minmax(90px,3fr) 45px;gap:12px;align-items:center;margin:14px 0}.bar-track{height:24px;background:#e6ede7;border-radius:4px}.bar{height:100%;background:#276a40;border-radius:4px}.chart-caption{font-size:.9rem} :focus-visible{outline:3px solid #a84d00;outline-offset:3px}
</style>
