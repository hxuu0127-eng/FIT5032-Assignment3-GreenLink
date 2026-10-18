
<template>
  <div class="app-container">
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <header class="main-header">
      <h1>GreenLink Melbourne</h1>
      <p>Urban greening, tree planting and biodiversity</p>

      <div v-if="currentUser" class="user-bar">
        <span>
          Welcome, {{ currentUser.name }} ({{ currentUser.role }})
        </span>
        <button type="button" @click="logout">Logout</button>
      </div>
    </header>

    <main id="main-content" tabindex="-1">
      <!-- Authentication -->
      <section v-if="!currentUser" class="auth-section">
        <h2>{{ authMode === 'login' ? 'Login' : 'Register' }}</h2>

        <form @submit.prevent="authMode === 'login' ? login() : registerAccount()">
          <template v-if="authMode === 'register'">
            <label for="account-name">Full name</label>
            <input
              id="account-name"
              v-model.trim="accountName"
              type="text"
              autocomplete="name"
              minlength="2"
              maxlength="50"
              required
            >
          </template>

          <label for="account-email">Email address</label>
          <input
            id="account-email"
            v-model.trim="accountEmail"
            type="email"
            autocomplete="email"
            maxlength="100"
            required
          >

          <label for="account-password">Password</label>
          <p id="password-help">
            Password must contain at least 6 characters.
          </p>
          <input
            id="account-password"
            v-model="accountPassword"
            type="password"
            :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'"
            aria-describedby="password-help"
            minlength="6"
            maxlength="100"
            required
          >

          <button type="submit">
            {{ authMode === 'login' ? 'Login' : 'Register' }}
          </button>
        </form>

        <button
          type="button"
          class="link-button"
          @click="authMode = authMode === 'login' ? 'register' : 'login'"
        >
          {{ authMode === 'login'
            ? 'Create an account'
            : 'Already have an account? Login' }}
        </button>

        <p
          v-if="message"
          :class="messageType"
          :role="messageType === 'error' ? 'alert' : 'status'"
        >
          {{ message }}
        </p>
      </section>

      <!-- User interface -->
      <section
        v-if="currentUser && currentUser.role === 'User'"
        class="user-interface"
      >
        <section class="intro-section">
          <h2>Welcome to GreenLink Melbourne</h2>
          <p>
            Explore local environmental activities and help create
            a greener Melbourne.
          </p>

          <div class="stats-bar">
            <div>
              <strong>300+</strong>
              <span>Trees Planted</span>
            </div>
            <div>
              <strong>{{ events.length }}</strong>
              <span>Activities</span>
            </div>
            <div>
              <strong>{{ totalPlaces }}</strong>
              <span>Open Spots</span>
            </div>
          </div>
        </section>

        <SmartRecommendations
          :events="upcomingEvents"
          :bookings="bookings"
          @select-event="selectRecommendedEvent"
        />
        
        <GeoActivities :events="upcomingEvents" />

        <!-- Upcoming activities -->
        <section class="events-section">
          <p v-if="dataStatus" role="status">
            {{ dataStatus }}
          </p>

          <h2>Upcoming Activities</h2>

          <p v-if="upcomingEvents.length === 0">No upcoming activities are currently available.</p>
          <div class="events-grid">
            <div
              v-for="event in upcomingEvents"
              :key="event.id"
              class="event-card"
            >
              <h3>{{ event.name }}</h3>
              <p>{{ event.description }}</p>
              <p>📅 {{ event.date }}</p>
              <p>⏰ {{ event.startTime }} - {{ event.endTime }}</p>
              <p>📍 {{ event.location }}</p>
              <p>🏠 {{ event.address }}</p>
              <p>🌳 {{ event.trees }} trees</p>

              <p>
                <strong>{{ event.places }}</strong>
                places left
              </p>

              <p>
                Rating:
                <strong>{{ eventAverage(event.name) }}</strong>
              </p>
            </div>
          </div>
        </section>

        <!-- F.1: Personal Environmental Impact Tracker -->
        <section class="data-section" aria-labelledby="impact-heading">
          <h2 id="impact-heading">My Environmental Impact</h2>
          <p>Only activities verified as completed by an administrator count towards your impact.</p>

          <div class="stats-bar" aria-label="Personal environmental impact statistics">
            <div>
              <strong>{{ completedActivities.length }}</strong>
              <span>Completed Activities</span>
            </div>
            <div>
              <strong>{{ volunteerHoursDisplay }}</strong>
              <span>Verified Volunteer Hours</span>
            </div>
            <div>
              <strong>{{ pendingBookings.length }}</strong>
              <span>Active Bookings</span>
            </div>
          </div>

          <h3>Completed Activity History</h3>
          <p v-if="completedActivities.length === 0">
            No verified activities yet. Your completed activities will appear here after an administrator confirms your attendance.
          </p>
          <div
            v-for="booking in completedActivities"
            :key="`impact_${booking.eventId}`"
            class="admin-item"
          >
            <h4>{{ booking.event || 'Environmental Activity' }}</h4>
            <p><strong>Date:</strong> {{ booking.date || 'Not available' }}</p>
            <p><strong>Time:</strong> {{ booking.startTime || 'N/A' }} - {{ booking.endTime || 'N/A' }}</p>
            <p><strong>Verified Hours:</strong> {{ bookingHours(booking).toFixed(1) }}</p>
            <p><strong>Status:</strong> Completed ✓</p>
            <p v-if="booking.completedAt?.toDate">
              <strong>Confirmed on:</strong> {{ booking.completedAt.toDate().toLocaleDateString('en-AU') }}
            </p>
          </div>
        </section>

        <!-- F.4: Green Challenges & Achievements -->
        <section class="data-section" aria-labelledby="challenges-heading">
          <h2 id="challenges-heading">Green Challenges &amp; Achievements</h2>
          <p>Earn badges by completing environmental activities. Only administrator-verified activities count.</p>

          <div class="green-challenge-grid">
            <article
              v-for="challenge in greenChallenges"
              :key="challenge.id"
              class="green-challenge-card"
            >
              <div class="green-challenge-heading">
                <span class="green-challenge-icon" aria-hidden="true">{{ challenge.icon }}</span>
                <div>
                  <h3>{{ challenge.title }}</h3>
                  <p>{{ challenge.description }}</p>
                </div>
              </div>
              <p class="green-challenge-status">
                <strong>{{ challenge.unlocked ? 'Badge Unlocked ✓' : 'In Progress' }}</strong>
                <span>{{ challenge.progressLabel }}</span>
              </p>
              <progress
                :value="challenge.current"
                :max="challenge.target"
                :aria-label="`${challenge.title} progress`"
              >
                {{ challenge.progressLabel }}
              </progress>
              <p v-if="challenge.unlocked" class="green-challenge-earned">
                Achievement earned through verified participation!
              </p>
              <p v-else>{{ challenge.remainingLabel }}</p>
            </article>
          </div>

          <h3>My Achievement Badges</h3>
          <p v-if="unlockedGreenChallenges.length === 0">
            No badges unlocked yet. Complete an activity and ask an administrator to confirm attendance.
          </p>
          <div v-else class="green-badge-list" aria-live="polite">
            <div
              v-for="badge in unlockedGreenChallenges"
              :key="badge.id"
              class="green-badge"
            >
              <span aria-hidden="true">{{ badge.icon }}</span>
              <strong>{{ badge.title }}</strong>
              <span>Unlocked ✓</span>
            </div>
          </div>
          <p class="green-challenge-summary">
            {{ unlockedGreenChallenges.length }} of {{ greenChallenges.length }} achievements unlocked
          </p>
        </section>

        <!-- F.1 Smart booking -->
        <section id="booking-section" class="booking-section">
          <h2>Join an Activity</h2>

          <h3>My Bookings</h3>

          <p v-if="bookings.length === 0">
            You have no active bookings.
          </p>

          <div
            v-for="booking in bookings"
            :key="booking.eventId"
            class="admin-item"
          >
            <p><strong>Name:</strong> {{ booking.name }}</p>
            <p><strong>Email:</strong> {{ booking.email }}</p>
            <p><strong>Activity:</strong> {{ booking.event }}</p>
            <p>
              <strong>Date:</strong>
              {{ booking.date || 'Not available' }}
            </p>
            <p>
              <strong>Time:</strong>
              {{ booking.startTime || 'N/A' }}
              -
              {{ booking.endTime || 'N/A' }}
            </p>

            <p><strong>Status:</strong> {{ booking.status === 'completed' ? 'Completed ✓' : 'Booked' }}</p>
            <button
              v-if="booking.status !== 'completed'"
              type="button"
              :disabled="bookingBusy"
              @click="cancelBooking(booking.eventId)"
            >
              Cancel Registration
            </button>
          </div>

          <h3>Book Another Activity</h3>

          <p>
            You can book multiple activities as long as their
            scheduled times do not overlap.
          </p>

          <form @submit.prevent="register" @invalid.capture="bookingFeedback = 'Please complete all required booking fields correctly.'">
            <label for="booking-name">Full name</label>
            <input
              id="booking-name"
              v-model.trim="name"
              type="text"
              autocomplete="name"
              minlength="2"
              maxlength="50"
              required
            >

            <label for="booking-email">Email address</label>
            <input
              id="booking-email"
              v-model.trim="email"
              type="email"
              autocomplete="email"
              maxlength="100"
              required
            >

            <label for="booking-event">Choose an activity</label>
            <select
              id="booking-event"
              v-model="selectedEvent"
              required
            >
              <option value="">Choose an activity</option>

              <option
                v-for="event in upcomingEvents"
                :key="event.id"
                :value="event.id"
                :disabled="event.places === 0"
              >
                {{ event.name }}
                ({{ event.date }},
                {{ event.startTime }} - {{ event.endTime }},
                {{ event.places }} places left)
              </option>
            </select>

            <button type="submit" :disabled="bookingBusy">
              {{ bookingBusy ? 'Please wait...' : 'Register Now' }}
            </button>
            <p v-if="bookingFeedback" role="status" aria-live="polite" style="margin-top: 12px; font-weight: 600; overflow-wrap: anywhere;">
              {{ bookingFeedback }}
            </p>
          </form>
        </section>

        <!-- Reviews -->
        <section class="review-section">
          <h2>Reviews & Ratings</h2>

          <form @submit.prevent="submitReview">
            <label for="review-event">Activity to review</label>
            <select id="review-event" v-model="reviewEvent" required>
              <option value="">Choose an activity</option>
              <option
                v-for="event in events"
                :key="event.id"
                :value="event.name"
              >
                {{ event.name }}
              </option>
            </select>

            <label for="review-rating">Rating</label>
            <select
              id="review-rating"
              v-model.number="reviewRating"
              required
            >
              <option value="">Rating</option>
              <option
                v-for="rating in 5"
                :key="rating"
                :value="rating"
              >
                {{ rating }} / 5
              </option>
            </select>

            <label for="review-comment">Your review</label>
            <p id="review-help">
              Write at least 5 characters (maximum 300).
            </p>
            <textarea
              id="review-comment"
              v-model.trim="reviewComment"
              aria-describedby="review-help"
              maxlength="300"
              required
            ></textarea>

            <button type="submit">Submit Review</button>
          </form>

          <div
            v-for="review in reviews"
            :key="review.id"
            class="review"
          >
            <strong>{{ review.user }}</strong>
            <p>{{ review.rating }}/5</p>
            <p>{{ review.comment }}</p>
          </div>
        </section>

        <p
          v-if="message"
          :class="messageType"
          :role="messageType === 'error' ? 'alert' : 'status'"
        >
          {{ message }}
        </p>
      </section>

      <!-- Admin dashboard -->
      <section
        v-if="currentUser && currentUser.role === 'Admin'"
        class="admin-interface"
      >
        <h2>Admin Dashboard</h2>

        <div class="stats-bar">
          <div>
            <strong>{{ users.length }}</strong>
            <span>Users</span>
          </div>
          <div>
            <strong>{{ events.length }}</strong>
            <span>Activities</span>
          </div>
          <div>
            <strong>{{ reviews.length }}</strong>
            <span>Reviews</span>
          </div>
        </div>

        <h3>Registered Users</h3>
        <div
          v-for="user in users"
          :key="user.uid"
          class="admin-item"
        >
          <p><strong>Name:</strong> {{ user.name }}</p>
          <p><strong>Email:</strong> {{ user.email }}</p>
          <p><strong>Role:</strong> {{ user.role }}</p>
        </div>

        <h3>Activities</h3>
        <div
          v-for="event in events"
          :key="event.id"
          class="admin-item"
        >
          <h4>{{ event.name }}</h4>
          <p>Places: {{ event.places }}</p>
          <p>Average Rating: {{ eventAverage(event.name) }}</p>
        </div>

        <!-- F.1: Administrator activity completion -->
        <h3>Activity Completion Management</h3>
        <p>Confirm attendance after an activity has finished.</p>
        <p v-if="completionMessage" role="status" aria-live="polite">
          {{ completionMessage }}
        </p>
        <p v-if="adminBookings.length === 0">No bookings found.</p>
        <div
          v-for="booking in adminBookings"
          :key="`${booking.userId}_${booking.eventId}`"
          class="admin-item"
        >
          <p><strong>Participant:</strong> {{ booking.name || 'Unknown' }}</p>
          <p><strong>Email:</strong> {{ booking.email || 'Unknown' }}</p>
          <p><strong>Activity:</strong> {{ booking.event || booking.eventId }}</p>
          <p><strong>Date:</strong> {{ booking.date || 'N/A' }}</p>
          <p><strong>Time:</strong> {{ booking.startTime || 'N/A' }} - {{ booking.endTime || 'N/A' }}</p>
          <p><strong>Status:</strong> {{ booking.status || 'booked' }}</p>
          <button
            v-if="booking.status !== 'completed'"
            type="button"
            :disabled="completionBusy"
            @click="completeActivityBooking(booking)"
          >
            {{ completionBusy ? 'Please wait...' : 'Mark as Completed' }}
          </button>
        </div>

        <h3>Reviews</h3>
        <div
          v-for="review in reviews"
          :key="review.id"
          class="admin-item"
        >
          <p><strong>User:</strong> {{ review.user }}</p>
          <p><strong>Activity:</strong> {{ review.event }}</p>
          <p><strong>Rating:</strong> {{ review.rating }}/5</p>
          <p>{{ review.comment }}</p>
        </div>
      </section>

      <!-- Email verification -->
      <section
        v-if="currentUser && !currentUser.emailVerified"
        class="data-section"
        aria-label="Verify your email"
      >
        <h2>Verify your email address</h2>

        <p>
          Signed in as {{ currentUser.email }}.
          Open the verification link sent to this address,
          then return here and refresh your status.
        </p>

        <button
          type="button"
          :disabled="verificationBusy"
          @click="sendVerification"
        >
          {{ verificationBusy ? 'Please wait…' : 'Send verification email' }}
        </button>

        <button
          type="button"
          :disabled="verificationBusy"
          @click="refreshVerification"
        >
          I've verified — refresh status
        </button>

        <p v-if="verificationStatus" role="status">
          {{ verificationStatus }}
        </p>
      </section>

      <!-- D.2 Email with attachment -->
      <section
        v-if="currentUser"
        class="data-section"
        aria-labelledby="email-heading"
      >
        <h2 id="email-heading">Email with Attachment</h2>
        <p>
          Send a PDF, text file, or image to your signed-in email address.
        </p>

        <p v-if="currentUser.emailVerified" role="status">
          Email verified ✓
        </p>
        <p v-else role="status">
          Email verification required before sending.
        </p>

        <form
          class="email-form"
          @submit.prevent="sendAttachmentEmail"
        >
          <label for="mail-to">
            Recipient (your verified account email)
          </label>
          <input
            id="mail-to"
            :value="currentUser.email"
            type="email"
            disabled
          >

          <label for="mail-subject">Subject</label>
          <input
            id="mail-subject"
            v-model.trim="emailSubject"
            type="text"
            maxlength="120"
            required
          >

          <label for="mail-message">Message</label>
          <textarea
            id="mail-message"
            v-model.trim="emailBody"
            maxlength="2000"
            required
          ></textarea>

          <label for="mail-attachment">
            Attachment (PDF, PNG, JPEG or TXT; max 1 MB)
          </label>
          <input
            id="mail-attachment"
            ref="emailFileInput"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
            required
            @change="onEmailFileChange"
          >

          <button
            type="submit"
            :disabled="emailSending || !currentUser.emailVerified"
          >
            {{ emailSending ? 'Sending…' : 'Send Email' }}
          </button>

          <p
            v-if="emailStatus"
            role="status"
            aria-live="polite"
          >
            {{ emailStatus }}
          </p>
        </form>
      </section>

      <!-- Insights -->
      <InsightsPanel
        v-if="currentUser"
        :events="events"
        :reviews="reviews"
      />

      <!-- Interactive tables -->
      <section v-if="currentUser" class="data-section">
        <h2>Activity Data</h2>

        <DataTable
          title="Activities"
          :rows="eventRows"
          :columns="[
            { key: 'name', label: 'Activity' },
            { key: 'date', label: 'Date' },
            { key: 'location', label: 'Location' },
            { key: 'places', label: 'Capacity' },
            { key: 'booked', label: 'Booked' },
            { key: 'remaining', label: 'Remaining' }
          ]"
        />

        <DataTable
          title="Reviews"
          :rows="reviewRows"
          :columns="[
            { key: 'user', label: 'User' },
            { key: 'event', label: 'Activity' },
            { key: 'rating', label: 'Rating' },
            { key: 'comment', label: 'Comment' }
          ]"
        />
      </section>
    </main>

    <footer>
      <p>© 2026 GreenLink Melbourne</p>
    </footer>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted
} from 'vue'

import app, { auth, db } from './firebase'

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  query,
  where,
  addDoc
} from 'firebase/firestore'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  reload
} from 'firebase/auth'

import { getFunctions, httpsCallable } from 'firebase/functions'

import DataTable from './components/DataTable.vue'
import GeoActivities from './components/GeoActivities.vue'
import InsightsPanel from './components/InsightsPanel.vue'
import SmartRecommendations from './components/SmartRecommendations.vue'

const functions = getFunctions(app, 'australia-southeast1')

// Application data
const events = ref([])
const users = ref([])
const reviews = ref([])
const currentUser = ref(null)

// F.1 - Personal Environmental Impact Tracker
const adminBookings = ref([])
const completionBusy = ref(false)
const completionMessage = ref('')
const dataStatus = ref('Loading Firestore activities...')

let unsubscribeEvents
let unsubscribeReviews
let unsubscribeUsers
let unsubscribeBooking
let unsubscribeAuth

let unsubscribeAdminBookings

// Authentication
const authMode = ref('login')
const accountName = ref('')
const accountEmail = ref('')
const accountPassword = ref('')

// Booking
const name = ref('')
const email = ref('')
const selectedEvent = ref('')
const bookings = ref([])
const bookingBusy = ref(false)
const bookingFeedback = ref('')

// Reviews
const reviewEvent = ref('')
const reviewRating = ref(0)
const reviewComment = ref('')

// Messages
const message = ref('')
const messageType = ref('info')

// Email verification
const verificationStatus = ref('')
const verificationBusy = ref(false)

// Attachment email
const emailSubject = ref('GreenLink Melbourne information')
const emailBody = ref('Please see the attached file.')
const emailAttachment = ref(null)
const emailFileInput = ref(null)
const emailSending = ref(false)
const emailStatus = ref('')

// F.1: Only administrator-confirmed bookings count as completed impact.
const completedActivities = computed(() =>
  bookings.value
    .filter(booking => booking.status === 'completed')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
)

const pendingBookings = computed(() =>
  bookings.value.filter(booking => booking.status !== 'completed')
)

// Activity duration is calculated from the stored scheduled time; no
// unsupported estimates (such as trees planted or CO2 saved) are displayed.
function bookingHours(booking) {
  const start = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(booking.startTime || '')
  const end = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(booking.endTime || '')
  if (!start || !end) return 0
  const minutes = (Number(end[1]) * 60 + Number(end[2])) -
    (Number(start[1]) * 60 + Number(start[2]))
  return Math.max(0, minutes) / 60
}

const volunteerHoursDisplay = computed(() => {
  const total = completedActivities.value.reduce(
    (sum, booking) => sum + bookingHours(booking), 0
  )
  return `${total.toFixed(1)} hrs`
})

// F.4: Challenge progress is derived from verified Firestore bookings.
// Users cannot award badges by changing local UI state.
const greenChallenges = computed(() => {
  const completedCount = completedActivities.value.length
  const verifiedHours = completedActivities.value.reduce(
    (sum, booking) => sum + bookingHours(booking), 0
  )

  const definitions = [
    { id: 'first-step', title: 'First Green Step', icon: '🌱', description: 'Complete your first verified activity.', metric: 'activities', target: 1 },
    { id: 'green-explorer', title: 'Green Explorer', icon: '🌿', description: 'Complete 3 verified activities.', metric: 'activities', target: 3 },
    { id: 'eco-champion', title: 'Eco Champion', icon: '🏆', description: 'Complete 5 verified activities.', metric: 'activities', target: 5 },
    { id: 'time-giver', title: 'Community Helper', icon: '🤝', description: 'Contribute 5 verified volunteer hours.', metric: 'hours', target: 5 },
    { id: 'green-guardian', title: 'Green Guardian', icon: '🌳', description: 'Contribute 10 verified volunteer hours.', metric: 'hours', target: 10 }
  ]

  return definitions.map(challenge => {
    const actual = challenge.metric === 'hours' ? verifiedHours : completedCount
    const current = Math.min(actual, challenge.target)
    const remaining = Math.max(0, challenge.target - actual)
    const unit = challenge.metric === 'hours' ? 'hours' : 'activities'
    const format = value => challenge.metric === 'hours' ? value.toFixed(1) : String(value)

    return {
      ...challenge,
      current,
      unlocked: actual >= challenge.target,
      progressLabel: `${format(current)} / ${format(challenge.target)} ${unit}`,
      remainingLabel: `${format(remaining)} more ${unit} to unlock.`
    }
  })
})

const unlockedGreenChallenges = computed(() =>
  greenChallenges.value.filter(challenge => challenge.unlocked)
)

// Keep expired activities out of the booking choices and upcoming list.
// The createBooking Cloud Function independently enforces the time restriction.
const upcomingEvents = computed(() => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date())
  const part = type => parts.find(item => item.type === type)?.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const now = `${part('hour')}:${part('minute')}`
  return events.value.filter(event =>
    event.date > today ||
    (event.date === today && event.startTime > now)
  )
})

// Computed statistics
const totalPlaces = computed(() =>
  events.value.reduce(
    (total, event) => total + event.places,
    0
  )
)

const eventRows = computed(() =>
  events.value.map(event => {
    const capacity = Number(
      event.capacity ?? event.places ?? 0
    )

    const booked = Number(
      event.bookedCount ?? 0
    )

    return {
      name: event.name,
      date: event.date,
      location: event.location,
      places: capacity,
      booked,
      remaining: Math.max(0, capacity - booked)
    }
  })
)

const reviewRows = computed(() =>
  reviews.value.map(review => ({
    user: review.user,
    event: review.event,
    rating: review.rating,
    comment: review.comment
  }))
)

function showMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
}

// F.1: Connect smart recommendations to the booking form
function selectRecommendedEvent(eventId) {
  const event = upcomingEvents.value.find(item => item.id === eventId)

  if (!event) {
    showMessage('Activity not found.', 'error')
    return
  }

  selectedEvent.value = event.id
  bookingFeedback.value = `${event.name} selected. Complete the form and press Register Now.`
  showMessage(
    `${event.name} selected. Complete the form to book.`,
    'success'
  )

  document.getElementById('booking-section')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

// F.1: Admin booking listeners, scoped to registered users.
function watchAdminBookings() {
  unsubscribeAdminBookings?.()
  adminBookings.value = []

  const bookingMap = new Map()
  const stopListeners = []
  let active = true

  const refresh = () => {
    if (active) {
      adminBookings.value = Array.from(bookingMap.values())
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    }
  }

  for (const registeredUser of users.value) {
    const userId = registeredUser.uid
    const stop = onSnapshot(
      collection(db, 'bookings', userId, 'items'),
      snapshot => {
        if (!active) return
        for (const [key, booking] of bookingMap) {
          if (booking.userId === userId) bookingMap.delete(key)
        }
        snapshot.docs.forEach(item => {
          bookingMap.set(`${userId}_${item.id}`, {
            ...item.data(),
            eventId: item.id,
            userId
          })
        })
        refresh()
      },
      error => {
        if (active) {
          completionMessage.value =
            `Unable to load bookings: ${error.message}`
        }
      }
    )
    stopListeners.push(stop)
  }

  unsubscribeAdminBookings = () => {
    active = false
    stopListeners.forEach(stop => stop())
    bookingMap.clear()
    adminBookings.value = []
  }
}

async function completeActivityBooking(booking) {
  if (completionBusy.value || !booking?.eventId || !booking?.userId) return
  completionBusy.value = true
  completionMessage.value = ''
  try {
    const complete = httpsCallable(functions, 'completeBooking')
    const result = await complete({
      userId: booking.userId,
      eventId: booking.eventId
    })
    if (result.data?.success === false) {
      throw new Error('Completion was not confirmed.')
    }
    completionMessage.value = 'Activity completion confirmed.'
  } catch (error) {
    completionMessage.value = `Completion failed: ${error.message}`
  } finally {
    completionBusy.value = false
  }
}

// Firestore listeners
onMounted(() => {
  unsubscribeEvents = onSnapshot(
    query(
      collection(db, 'events'),
      where('status', '==', 'published')
    ),
    snapshot => {
      events.value = snapshot.docs.map(item => {
        const data = item.data()

        return {
          ...data,
          id: item.id,
          places: Math.max(
            0,
            Number(data.capacity ?? data.places ?? 0) -
            Number(data.bookedCount ?? 0)
          )
        }
      })

      dataStatus.value = ''
    },
    error => {
      dataStatus.value =
        `Unable to load activities: ${error.message}`

      showMessage(dataStatus.value, 'error')
    }
  )

  unsubscribeReviews = onSnapshot(
    collection(db, 'reviews'),
    snapshot => {
      reviews.value = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }))
    },
    error => showMessage(
      `Reviews unavailable: ${error.message}`,
      'error'
    )
  )

  unsubscribeAuth = onAuthStateChanged(
    auth,
    async user => {
      unsubscribeBooking?.()
      unsubscribeBooking = null

      unsubscribeUsers?.()
      unsubscribeUsers = null
      unsubscribeAdminBookings?.()
      unsubscribeAdminBookings = null
      adminBookings.value = []
      completionMessage.value = ''

      bookings.value = []
      users.value = []

      if (!user) {
        currentUser.value = null
        verificationStatus.value = ''
        return
      }

      try {
        await reload(user)
      } catch (error) {
        console.warn(
          'Unable to refresh account status:',
          error
        )
      }

      const token = await user.getIdTokenResult()
      const isAdmin = token.claims.admin === true

      currentUser.value = {
        uid: user.uid,
        name: user.displayName || user.email,
        email: user.email,
        emailVerified: user.emailVerified,
        role: isAdmin ? 'Admin' : 'User'
      }

      // Read legacy and new booking documents
      let legacyBooking = null
      let newBookings = []

      function updateBookings() {
        const combined = [
          ...(legacyBooking ? [legacyBooking] : []),
          ...newBookings
        ]

        const unique = new Map()

        for (const booking of combined) {
          if (booking.eventId) {
            unique.set(booking.eventId, booking)
          }
        }

        bookings.value = Array.from(unique.values())
      }

      const stopLegacy = onSnapshot(
        doc(db, 'bookings', user.uid),
        snapshot => {
          legacyBooking = snapshot.exists()
            ? snapshot.data()
            : null

          if (legacyBooking) {
            const matchingEvent = events.value.find(
              item => item.id === legacyBooking.eventId
            )

            if (matchingEvent) {
              legacyBooking = {
                ...legacyBooking,
                date: matchingEvent.date,
                startTime: matchingEvent.startTime,
                endTime: matchingEvent.endTime
              }
            }
          }

          updateBookings()
        },
        error => showMessage(
          `Existing booking unavailable: ${error.message}`,
          'error'
        )
      )

      const stopItems = onSnapshot(
        collection(db, 'bookings', user.uid, 'items'),
        snapshot => {
          newBookings = snapshot.docs.map(item => ({
            ...item.data(),
            eventId: item.id
          }))

          updateBookings()
        },
        error => showMessage(
          `Bookings unavailable: ${error.message}`,
          'error'
        )
      )

      unsubscribeBooking = () => {
        stopLegacy()
        stopItems()
      }

      if (isAdmin) {
        unsubscribeUsers = onSnapshot(
          collection(db, 'users'),
          snapshot => {
            users.value = snapshot.docs.map(item => ({
              uid: item.id,
              ...item.data(),
              name:
                item.data().displayName ||
                item.data().email,
              role: 'User'
            }))
            watchAdminBookings()
          },
          error => showMessage(
            `Admin data unavailable: ${error.message}`,
            'error'
          )
        )
      }
    }
  )
})

onUnmounted(() => {
  unsubscribeAuth?.()
  unsubscribeEvents?.()
  unsubscribeReviews?.()
  unsubscribeUsers?.()
  unsubscribeBooking?.()
  unsubscribeAdminBookings?.()
})

// Registration
async function registerAccount() {
  message.value = ''

  const cleanName = accountName.value.trim()

  if (cleanName.length < 2) {
    return showMessage(
      'Name must contain at least 2 characters.',
      'error'
    )
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      accountEmail.value.trim(),
      accountPassword.value
    )

    await updateProfile(credential.user, {
      displayName: cleanName
    })

    await setDoc(
      doc(db, 'users', credential.user.uid),
      {
        displayName: cleanName,
        email: credential.user.email,
        createdAt: serverTimestamp()
      }
    )

    currentUser.value = {
      uid: credential.user.uid,
      name: cleanName,
      email: credential.user.email,
      emailVerified: credential.user.emailVerified,
      role: 'User'
    }

    await sendEmailVerification(credential.user)

    accountPassword.value = ''

    showMessage(
      'Registration successful. Please verify your email.',
      'success'
    )
  } catch (error) {
    showMessage(error.message, 'error')
  }
}

async function login() {
  try {
    await signInWithEmailAndPassword(
      auth,
      accountEmail.value.trim(),
      accountPassword.value
    )

    accountPassword.value = ''

    showMessage('Login successful.', 'success')
  } catch (error) {
    showMessage(error.message, 'error')
  }
}

async function logout() {
  try {
    await signOut(auth)
    showMessage('Logged out.', 'success')
  } catch (error) {
    showMessage(error.message, 'error')
  }
}

// F.1: Create booking
async function register() {
  bookingFeedback.value = 'Processing your booking...'
  if (!currentUser.value) {
    bookingFeedback.value = 'Please sign in first.'
    return showMessage('Please sign in.', 'error')
  }

  if (bookingBusy.value) return

  const cleanName = name.value.trim()
  const cleanEmail = email.value.trim().toLowerCase()

  if (
    cleanName.length < 2 ||
    cleanEmail !== currentUser.value.email?.toLowerCase()
  ) {
    bookingFeedback.value = 'Enter your name and your signed-in email address.'
    return showMessage(
      'Enter your name and your signed-in email address.',
      'error'
    )
  }

  const targetEvent = events.value.find(
    event => event.id === selectedEvent.value
  )

  if (!targetEvent) {
    bookingFeedback.value = 'Please select an activity.'
    return showMessage(
      'Please select an activity.',
      'error'
    )
  }

  bookingBusy.value = true

  try {
    const create = httpsCallable(
      functions,
      'createBooking'
    )

    const result = await create({
      eventId: targetEvent.id,
      name: cleanName
    })

    if (!result.data.success) {
      throw new Error('Booking failed')
    }

    name.value = ''
    email.value = ''
    selectedEvent.value = ''

    bookingFeedback.value = 'Registration successful! Your activity has been booked.'
    showMessage(
      'Registration successful! Your activity has been booked.',
      'success'
    )
  } catch (error) {
    bookingFeedback.value = `Booking failed: ${error.message}`
    showMessage(
      `Booking failed: ${error.message}`,
      'error'
    )
  } finally {
    bookingBusy.value = false
  }
}

// F.1: Cancel selected booking
async function cancelBooking(eventId) {
  if (bookingBusy.value) return

  if (!eventId) {
    return showMessage(
      'Invalid booking selected.',
      'error'
    )
  }

  bookingBusy.value = true

  try {
    const cancel = httpsCallable(
      functions,
      'cancelBooking'
    )

    const result = await cancel({ eventId })

    if (!result.data.success) {
      throw new Error('Cancellation failed')
    }

    showMessage(
      'Registration cancelled successfully.',
      'success'
    )
  } catch (error) {
    showMessage(
      `Cancellation failed: ${error.message}`,
      'error'
    )
  } finally {
    bookingBusy.value = false
  }
}

// Reviews
async function submitReview() {
  if (!currentUser.value) {
    return showMessage('Please sign in.', 'error')
  }

  if (
    !reviewEvent.value ||
    reviewRating.value < 1 ||
    reviewRating.value > 5 ||
    reviewComment.value.trim().length < 5
  ) {
    return showMessage(
      'Select an activity, a rating (1–5), and write at least five characters.',
      'error'
    )
  }

  try {
    const event = events.value.find(
      item => item.name === reviewEvent.value
    )

    if (!event) {
      return showMessage(
        'Activity not found.',
        'error'
      )
    }

    await addDoc(collection(db, 'reviews'), {
      userId: currentUser.value.uid,
      user: currentUser.value.name,
      event: event.name,
      eventId: event.id,
      rating: Number(reviewRating.value),
      comment: reviewComment.value.trim(),
      createdAt: serverTimestamp()
    })

    reviewEvent.value = ''
    reviewRating.value = 0
    reviewComment.value = ''

    showMessage(
      'Review submitted successfully.',
      'success'
    )
  } catch (error) {
    showMessage(
      `Review failed: ${error.message}`,
      'error'
    )
  }
}

function eventAverage(eventName) {
  const list = reviews.value.filter(
    review => review.event === eventName
  )

  if (list.length === 0) {
    return 'No ratings'
  }

  const total = list.reduce(
    (sum, review) => sum + Number(review.rating),
    0
  )

  return `${(total / list.length).toFixed(1)}/5`
}

// Email verification
async function refreshVerificationState() {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Please log in first.')
  }

  await reload(user)
  await user.getIdToken(true)

  if (currentUser.value?.uid === user.uid) {
    currentUser.value = {
      ...currentUser.value,
      emailVerified: user.emailVerified
    }
  }

  return user.emailVerified
}

async function sendVerification() {
  if (!auth.currentUser) {
    verificationStatus.value = 'Please log in first.'
    return
  }

  verificationBusy.value = true
  verificationStatus.value = ''

  try {
    await reload(auth.currentUser)

    if (auth.currentUser.emailVerified) {
      await refreshVerificationState()
      verificationStatus.value =
        'Your email is already verified.'
      return
    }

    await sendEmailVerification(auth.currentUser)

    verificationStatus.value =
      `Verification email sent to ${auth.currentUser.email}. Check Inbox and Spam.`
  } catch (error) {
    verificationStatus.value =
      `Could not send verification email: ${error.message}`
  } finally {
    verificationBusy.value = false
  }
}

async function refreshVerification() {
  verificationBusy.value = true
  verificationStatus.value = ''

  try {
    const verified = await refreshVerificationState()

    verificationStatus.value = verified
      ? 'Email verified! You can now send an attachment.'
      : 'Not verified yet. Open the verification link and try again.'
  } catch (error) {
    verificationStatus.value =
      `Could not check verification: ${error.message}`
  } finally {
    verificationBusy.value = false
  }
}

// D.2: Attachment email
function onEmailFileChange(event) {
  emailAttachment.value =
    event.target.files?.[0] || null

  emailStatus.value = ''
}

async function sendAttachmentEmail() {
  emailStatus.value = ''

  const file = emailAttachment.value

  if (!file) {
    emailStatus.value = 'Please choose a file.'
    return
  }

  const expected = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    txt: 'text/plain'
  }

  const extension = file.name.split('.').pop()?.toLowerCase()

  if (
    expected[extension] !== file.type ||
    file.size > 1024 * 1024
  ) {
    emailStatus.value =
      'Only PDF, PNG, JPEG or TXT files up to 1 MB are supported.'
    return
  }

  try {
    if (!(await refreshVerificationState())) {
      emailStatus.value =
        'Verify your email first.'
      return
    }
  } catch (error) {
    emailStatus.value =
      `Unable to check email verification: ${error.message}`
    return
  }

  emailSending.value = true

  try {
    const data = await file.arrayBuffer()
    const bytes = new Uint8Array(data)

    let binary = ''

    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, i + 8192)
      )
    }

    const send = httpsCallable(
      functions,
      'sendAttachmentEmail'
    )

    await send({
      subject: emailSubject.value,
      message: emailBody.value,
      filename: file.name,
      mimeType: file.type,
      base64: btoa(binary)
    })

    emailStatus.value =
      'Email accepted for processing. Check your inbox and spam folder.'

    emailAttachment.value = null

    if (emailFileInput.value) {
      emailFileInput.value.value = ''
    }
  } catch (error) {
    emailStatus.value =
      `Email could not be sent: ${error.message || 'Unknown error'}`
  } finally {
    emailSending.value = false
  }
}
</script>

<style scoped>

/* F.4 Green Challenges */
.green-challenge-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin: 16px 0 24px; }
.green-challenge-card { border: 1px solid #c9ddcb; border-radius: 12px; padding: 18px; background: #f7fbf7; }
.green-challenge-heading { display: flex; align-items: flex-start; gap: 12px; }
.green-challenge-heading h3 { margin: 0 0 6px; }
.green-challenge-heading p { margin: 0 0 12px; }
.green-challenge-icon { font-size: 30px; line-height: 1.2; }
.green-challenge-status { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.green-challenge-card progress { display: block; width: 100%; height: 16px; accent-color: #247746; }
.green-challenge-earned { color: #176334; font-weight: 600; }
.green-badge-list { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
.green-badge { display: flex; align-items: center; gap: 8px; border: 1px solid #91bf9b; border-radius: 999px; padding: 10px 14px; background: #ecf8ef; }
.green-challenge-summary { font-weight: 600; }
</style>
