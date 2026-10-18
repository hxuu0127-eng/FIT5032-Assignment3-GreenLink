
<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  },
  bookings: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select-event'])

const interest = ref('all')
const preferredLocation = ref('')

const interests = [
  { value: 'all', label: 'All interests' },
  { value: 'tree', label: 'Tree Planting' },
  { value: 'clean', label: 'Clean-up' },
  { value: 'garden', label: 'Gardening' },
  { value: 'recycl', label: 'Recycling' }
]

function toMinutes(time) {
  if (!/^\d{2}:\d{2}$/.test(time || '')) return null

  const [hours, minutes] = time.split(':').map(Number)
  if (hours > 23 || minutes > 59) return null

  return hours * 60 + minutes
}

function bookingEventId(booking) {
  return booking.eventId ?? booking.id ?? null
}

function hasConflict(event) {
  const start = toMinutes(event.startTime)
  const end = toMinutes(event.endTime)

  return props.bookings.some(booking => {
    const existing = props.events.find(
      item => item.id === bookingEventId(booking)
    )

    if (!existing) return false
    if (existing.id === event.id) return false
    if (!event.date || existing.date !== event.date) return false

    const existingStart = toMinutes(existing.startTime)
    const existingEnd = toMinutes(existing.endTime)

    if (
      start === null ||
      end === null ||
      existingStart === null ||
      existingEnd === null
    ) {
      return false
    }

    return start < existingEnd && existingStart < end
  })
}

const recommendations = computed(() => {
  const today = new Date().toLocaleDateString('en-CA')

  return props.events
    .filter(event => {
      if (!event.id || Number(event.places) <= 0) return false
      if (event.date && event.date < today) return false

      const alreadyBooked = props.bookings.some(
        booking => bookingEventId(booking) === event.id
      )

      return !alreadyBooked && !hasConflict(event)
    })
    .map(event => {
      let score = 40
      const reasons = []

      const text = [
        event.name,
        event.category,
        event.description
      ].filter(Boolean).join(' ').toLowerCase()

      if (
        interest.value !== 'all' &&
        text.includes(interest.value)
      ) {
        score += 35
        reasons.push('Matches your environmental interest')
      } else if (interest.value === 'all') {
        score += 15
        reasons.push('Suitable for general volunteering')
      }

      if (
        preferredLocation.value.trim() &&
        String(event.location || '')
          .toLowerCase()
          .includes(preferredLocation.value.trim().toLowerCase())
      ) {
        score += 20
        reasons.push('Matches your preferred location')
      }

      if (Number(event.places) >= 5) {
        score += 5
        reasons.push('Places available')
      }

      return {
        ...event,
        score: Math.min(score, 100),
        reasons
      }
    })
    .sort((a, b) => b.score - a.score || String(a.date || '').localeCompare(String(b.date || '')))
    .slice(0, 5)
})

function selectEvent(event) {
  emit('select-event', event.id)
}
</script>

<template>
  <section class="smart-recommendations">
    <h2>Smart Activity Recommendations</h2>

    <p>
      Discover environmental activities matched to your
      interests, preferred location and availability.
    </p>

    <div class="recommendation-filters">
      <label>
        Environmental interest
        <select v-model="interest">
          <option
            v-for="option in interests"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <label>
        Preferred location
        <input
          v-model="preferredLocation"
          type="text"
          placeholder="e.g. Melbourne"
        />
      </label>
    </div>

    <p class="recommendation-note">
      Activities already booked, fully booked or conflicting
      with your existing schedule are excluded where
      schedule information is available.
    </p>

    <p v-if="recommendations.length === 0">
      No suitable activities are currently available.
    </p>

    <div v-else class="recommendation-list">
      <article
        v-for="event in recommendations"
        :key="event.id"
        class="recommendation-card"
      >
        <div class="recommendation-heading">
          <h3>{{ event.name }}</h3>
          <strong>{{ event.score }}/100 Match</strong>
        </div>

        <p>{{ event.date }} · {{ event.location }}</p>
        <p>Available places: {{ event.places }}</p>

        <ul>
          <li
            v-for="reason in event.reasons"
            :key="reason"
          >
            {{ reason }}
          </li>
        </ul>

        <button
          type="button"
          @click="selectEvent(event)"
        >
          Select Activity
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.smart-recommendations {
  margin: 24px 0;
  padding: 24px;
  border: 1px solid #d9e6df;
  border-radius: 12px;
  background: #f7fbf8;
  color: #20372b;
}

.recommendation-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 20px 0;
}

.recommendation-filters label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 180px;
}

.recommendation-filters input,
.recommendation-filters select {
  padding: 10px;
  border: 1px solid #a9bdb0;
  border-radius: 6px;
  font: inherit;
}

.recommendation-note {
  font-size: 0.9rem;
}

.recommendation-list {
  display: grid;
  gap: 16px;
}

.recommendation-card {
  padding: 18px;
  background: white;
  border: 1px solid #d9e6df;
  border-radius: 10px;
}

.recommendation-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.recommendation-heading h3 {
  margin: 0;
}

.recommendation-heading strong {
  color: #176a43;
}

.recommendation-card button {
  padding: 10px 16px;
  border: 0;
  border-radius: 6px;
  background: #176a43;
  color: white;
  cursor: pointer;
}

.recommendation-card button:hover {
  background: #105232;
}

.recommendation-card button:focus-visible {
  outline: 3px solid #e5a900;
  outline-offset: 3px;
}
</style>
