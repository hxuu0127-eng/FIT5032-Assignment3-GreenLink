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
        <button @click="logout">Logout</button>
      </div>
    </header>

    <main id="main-content">
      <section v-if="!currentUser" class="auth-section">
        <h2>{{ authMode === 'login' ? 'Login' : 'Register' }}</h2>

        <form @submit.prevent="authMode === 'login' ? login() : registerAccount()">
          <input
            v-if="authMode === 'register'"
            v-model.trim="accountName"
            type="text"
            placeholder="Full Name"
            aria-label="Full name"
            maxlength="50"
          >

          <input
            v-model.trim="accountEmail"
            type="email"
            placeholder="Email Address"
            aria-label="Email address"
            maxlength="100"
            required
          >

          <input
            v-model="accountPassword"
            type="password"
            placeholder="Password"
            aria-label="Password"
            minlength="6"
            maxlength="100"
            required
          >

          <button type="submit">
            {{ authMode === 'login' ? 'Login' : 'Register' }}
          </button>
        </form>

        <button
          class="link-button"
          @click="authMode = authMode === 'login' ? 'register' : 'login'"
        >
          {{ authMode === 'login'
            ? 'Create an account'
            : 'Already have an account? Login' }}
        </button>

        <p v-if="message" :class="messageType" role="status" aria-live="polite">
          {{ message }}
        </p>
      </section>

      <section
        v-if="currentUser && currentUser.role === 'User'"
        class="user-interface"
      >
        <section class="intro-section">
          <h2>Welcome to GreenLink Melbourne</h2>
          <p>
            Explore local environmental activities and help create a greener
            Melbourne.
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

        <GeoActivities :events="events" />

        <section class="events-section">
          <h2>Upcoming Activities</h2>

          <div class="events-grid">
            <div
              v-for="event in events"
              :key="event.name"
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
                <strong>{{ eventAverage(event.name) }}</strong>/5
              </p>
            </div>
          </div>
        </section>

        <section class="booking-section">
          <h2>Join an Activity</h2>

          <div v-if="hasBooking">
            <p><strong>Name:</strong> {{ registeredUser.name }}</p>
            <p><strong>Email:</strong> {{ registeredUser.email }}</p>
            <p><strong>Activity:</strong> {{ registeredUser.event }}</p>

            <button @click="cancelBooking">
              Cancel Registration
            </button>
          </div>

          <form v-else @submit.prevent="register">
            <input
              v-model.trim="name"
              type="text"
              placeholder="Full Name"
              maxlength="50"
              required
            >

            <input
              v-model.trim="email"
              type="email"
              placeholder="Email Address"
              maxlength="100"
              required
            >

            <select v-model="selectedEvent" required>
              <option value="">Choose an activity</option>

              <option
                v-for="event in events"
                :key="event.name"
                :value="event.name"
                :disabled="event.places === 0"
              >
                {{ event.name }} ({{ event.places }} places left)
              </option>
            </select>

            <button type="submit">
              Register Now
            </button>
          </form>
        </section>

        <section class="review-section">
          <h2>Reviews & Ratings</h2>

          <form @submit.prevent="submitReview">
            <select v-model="reviewEvent" required>
              <option value="">Choose an activity</option>

              <option
                v-for="event in events"
                :key="event.name"
                :value="event.name"
              >
                {{ event.name }}
              </option>
            </select>

            <select v-model.number="reviewRating" required>
              <option value="">Rating</option>
              <option
                v-for="rating in 5"
                :key="rating"
                :value="rating"
              >
                {{ rating }} / 5
              </option>
            </select>

            <textarea
              v-model.trim="reviewComment"
              placeholder="Write your review"
              maxlength="300"
              required
            ></textarea>

            <button type="submit">
              Submit Review
            </button>
          </form>

          <div
            v-for="review in reviews"
            :key="review.id"
            class="review"
          >
            <strong>{{ review.user }}</strong>

            <p>
              {{ review.rating }}/5
            </p>

            <p>{{ review.comment }}</p>
          </div>
        </section>

        <p v-if="message" :class="messageType">
          {{ message }}
        </p>
      </section>

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
          :key="user.email"
          class="admin-item"
        >
          <p><strong>Name:</strong> {{ user.name }}</p>
          <p><strong>Email:</strong> {{ user.email }}</p>
          <p><strong>Role:</strong> {{ user.role }}</p>
        </div>

        <h3>Activities</h3>

        <div
          v-for="event in events"
          :key="event.name"
          class="admin-item"
        >
          <h4>{{ event.name }}</h4>
          <p>Places: {{ event.places }}</p>
          <p>Average Rating: {{ eventAverage(event.name) }}/5</p>
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
      <section v-if="currentUser && !currentUser.emailVerified" class="data-section" aria-label="Verify your email">
        <h2>Verify your email address</h2>
        <p>Verify your account before sending an attachment email.</p>
        <button type="button" @click="sendVerification">Send verification email</button>
        <button type="button" @click="refreshVerification">I've verified — refresh status</button>
        <p v-if="verificationStatus" role="status">{{ verificationStatus }}</p>
      </section>

      <!-- D.2: email with an attachment, sent by a server-side Cloud Function. -->
      <section v-if="currentUser" class="data-section" aria-labelledby="email-heading">
        <h2 id="email-heading">Email with Attachment</h2>
        <p>Send a PDF, text file, or image to your signed-in email address.</p>
        <form @submit.prevent="sendAttachmentEmail" class="email-form">
          <label for="mail-to">Recipient (your verified account email)</label>
          <input id="mail-to" :value="currentUser.email" type="email" disabled />
          <label for="mail-subject">Subject</label>
          <input id="mail-subject" v-model.trim="emailSubject" type="text" maxlength="120" required />
          <label for="mail-message">Message</label>
          <textarea id="mail-message" v-model.trim="emailBody" maxlength="2000" required></textarea>
          <label for="mail-attachment">Attachment (PDF, PNG, JPEG or TXT; max 1 MB)</label>
          <input id="mail-attachment" ref="emailFileInput" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain" required @change="onEmailFileChange" />
          <button type="submit" :disabled="emailSending">{{ emailSending ? 'Sending…' : 'Send Email' }}</button>
          <p v-if="emailStatus" role="status" aria-live="polite">{{ emailStatus }}</p>
        </form>
      </section>

      <section v-if="currentUser" class="data-section">
        <h2>Activity Data</h2>
        <DataTable title="Activities" :rows="eventRows" :columns="[
          { key: 'name', label: 'Activity' }, { key: 'date', label: 'Date' },
          { key: 'location', label: 'Location' }, { key: 'places', label: 'Places' }
        ]" />
        <DataTable title="Reviews" :rows="reviewRows" :columns="[
          { key: 'user', label: 'User' }, { key: 'event', label: 'Activity' },
          { key: 'rating', label: 'Rating' }, { key: 'comment', label: 'Comment' }
        ]" />
      </section>
    </main>

    <footer>
      <p>© 2026 GreenLink Melbourne</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import app, { auth } from './firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendEmailVerification, reload } from 'firebase/auth'
import DataTable from './components/DataTable.vue'
import GeoActivities from './components/GeoActivities.vue'
import { getFunctions, httpsCallable } from 'firebase/functions'

const events = ref([
  {
    name: 'Clayton Native Tree Planting',
    description: 'Help plant native canopy trees in the Clayton reserve area.',
    date: '1 September 2026',
    startTime: '9:00am',
    endTime: '12:00pm',
    location: 'Clayton',
    lat: -37.925, lng: 145.119,
    address: 'Clayton Local Park',
    trees: 100,
    places: 40
  },
  {
    name: 'Brunswick Native Garden Day',
    description: 'Help plant native shrubs in the local community garden.',
    date: '8 September 2026',
    startTime: '1:00pm',
    endTime: '4:00pm',
    location: 'Brunswick',
    lat: -37.767, lng: 144.960,
    address: 'Brunswick Community Hub',
    trees: 80,
    places: 30
  },
  {
    name: 'Australian Native Plants Workshop',
    description: 'Learn about biodiversity and plant habitat-friendly flora.',
    date: '15 September 2026',
    startTime: '8:00am',
    endTime: '11:00am',
    location: 'Sunshine',
    lat: -37.789, lng: 144.832,
    address: 'Sunshine Environment Centre',
    trees: 50,
    places: 20
  }
])

const users = ref([])
const reviews = ref([])
const currentUser = ref(null)

// D.2 email form: attachment bytes are sent to the callable function, never to localStorage.
const verificationStatus = ref('')
async function sendVerification() {
  try { await sendEmailVerification(auth.currentUser); verificationStatus.value = 'Verification email sent. Check your inbox.' }
  catch (e) { verificationStatus.value = e.message }
}
async function refreshVerification() {
  try {
    await reload(auth.currentUser)
    await auth.currentUser.getIdToken(true)
    currentUser.value = { ...currentUser.value, emailVerified: auth.currentUser.emailVerified }
    verificationStatus.value = auth.currentUser.emailVerified ? 'Email verified!' : 'Not verified yet. Check your inbox.'
  } catch (e) { verificationStatus.value = e.message }
}

const emailSubject = ref('GreenLink Melbourne information')
const emailBody = ref('Please see the attached file.')
const emailAttachment = ref(null)
const emailFileInput = ref(null)
const emailSending = ref(false)
const emailStatus = ref('')
const functions = getFunctions(app, 'australia-southeast1')

function onEmailFileChange(event) {
  emailAttachment.value = event.target.files?.[0] || null
  emailStatus.value = ''
}

async function sendAttachmentEmail() {
  emailStatus.value = ''
  const file = emailAttachment.value
  if (!file) { emailStatus.value = 'Please choose a file.'; return }
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain']
  const ext = file.name.split('.').pop()?.toLowerCase()
  const expected = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain' }
  if (!allowed.includes(file.type) || expected[ext] !== file.type || file.size > 1024 * 1024) {
    emailStatus.value = 'Only PDF, PNG, JPEG or TXT files up to 1 MB are supported.'
    return
  }
  if (!currentUser.value?.emailVerified) { emailStatus.value = 'Verify your email first.'; return }
  emailSending.value = true
  try {
    const data = await file.arrayBuffer()
    const bytes = new Uint8Array(data)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    const send = httpsCallable(functions, 'sendAttachmentEmail')
    await send({ subject: emailSubject.value, message: emailBody.value,
      filename: file.name, mimeType: file.type, base64: btoa(binary) })
    emailStatus.value = 'Email sent successfully. Check your inbox (and spam folder).'
    emailAttachment.value = null
    if (emailFileInput.value) emailFileInput.value.value = ''
  } catch (error) {
    emailStatus.value = `Email could not be sent: ${error.message || 'Unknown error'}`
  } finally { emailSending.value = false }
}

const authMode = ref('login')
const accountName = ref('')
const accountEmail = ref('')
const accountPassword = ref('')

const name = ref('')
const email = ref('')
const selectedEvent = ref('')
const hasBooking = ref(false)
const registeredUser = ref({
  name: '',
  email: '',
  event: ''
})

const reviewEvent = ref('')
const reviewRating = ref(0)
const reviewComment = ref('')

const message = ref('')
const messageType = ref('info')

const totalPlaces = computed(() =>
  events.value.reduce((total, event) => total + event.places, 0)
)

let unsubscribeAuth
onMounted(() => {
  try {
    reviews.value = JSON.parse(localStorage.getItem('greenlinkReviews') || '[]')
  } catch { reviews.value = [] }
  unsubscribeAuth = onAuthStateChanged(auth, user => {
    currentUser.value = user ? {
      uid: user.uid, name: user.displayName || user.email,
      email: user.email, emailVerified: user.emailVerified, role: 'User'
    } : null
    if (!user) { hasBooking.value = false; return }
    try {
      const booking = JSON.parse(localStorage.getItem('greenlinkBooking') || 'null')
      hasBooking.value = booking?.uid === user.uid
      if (hasBooking.value) registeredUser.value = booking
    } catch { hasBooking.value = false }
  })
})
onUnmounted(() => unsubscribeAuth?.())

const eventRows = computed(() => events.value.map(e => ({
  name: e.name, date: e.date, location: e.location, places: e.places
})))
const reviewRows = computed(() => reviews.value.map(r => ({
  user: r.user, event: r.event, rating: r.rating, comment: r.comment
})))

function saveUsers() {
  localStorage.setItem(
    'greenlinkUsers',
    JSON.stringify(users.value)
  )
}

function saveReviews() {
  localStorage.setItem(
    'greenlinkReviews',
    JSON.stringify(reviews.value)
  )
}

async function registerAccount() {
  message.value = ''
  const cleanName = accountName.value.trim()
  if (cleanName.length < 2) return showMessage('Name must contain at least 2 characters.', 'error')
  try {
    const credential = await createUserWithEmailAndPassword(auth, accountEmail.value.trim(), accountPassword.value)
    await updateProfile(credential.user, { displayName: cleanName })
    currentUser.value = { uid: credential.user.uid, name: cleanName, email: credential.user.email, emailVerified: credential.user.emailVerified, role: 'User' }
    await sendEmailVerification(credential.user)
    accountPassword.value = ''
    showMessage('Registration successful. Please verify your email.', 'success')
  } catch (error) { showMessage(error.message, 'error') }
}
async function login() {
  try {
    await signInWithEmailAndPassword(auth, accountEmail.value.trim(), accountPassword.value)
    accountPassword.value = ''
    showMessage('Login successful.', 'success')
  } catch (error) { showMessage(error.message, 'error') }
}
async function logout() {
  await signOut(auth)
  showMessage('Logged out.', 'success')
}

function register() {
  const cleanName = name.value.trim()
  const cleanEmail = email.value.trim().toLowerCase()

  if (cleanName.length < 2) {
    showMessage('Please enter a valid name.', 'error')
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    showMessage('Please enter a valid email.', 'error')
    return
  }

  if (!selectedEvent.value) {
    showMessage('Please select an activity.', 'error')
    return
  }

  const targetEvent = events.value.find(
    event => event.name === selectedEvent.value
  )

  if (!targetEvent || targetEvent.places <= 0) {
    showMessage('This activity is full.', 'error')
    return
  }

  targetEvent.places--

  registeredUser.value = {
    name: cleanName,
    email: cleanEmail,
    event: selectedEvent.value,
    uid: currentUser.value.uid
  }

  localStorage.setItem(
    'greenlinkBooking',
    JSON.stringify(registeredUser.value)
  )

  hasBooking.value = true

  name.value = ''
  email.value = ''
  selectedEvent.value = ''

  showMessage('Registration successful.', 'success')
}

function cancelBooking() {
  const event = events.value.find(
    item => item.name === registeredUser.value.event
  )

  if (event) {
    event.places++
  }

  localStorage.removeItem('greenlinkBooking')

  hasBooking.value = false
  registeredUser.value = {
    name: '',
    email: '',
    event: ''
  }

  showMessage('Registration cancelled.', 'success')
}

function submitReview() {
  if (!reviewEvent.value) {
    showMessage('Please select an activity.', 'error')
    return
  }

  if (reviewRating.value < 1 || reviewRating.value > 5) {
    showMessage('Rating must be between 1 and 5.', 'error')
    return
  }

  if (reviewComment.value.length < 5) {
    showMessage('Review must contain at least 5 characters.', 'error')
    return
  }

  reviews.value.push({
    id: Date.now(),
    user: currentUser.value.name,
    event: reviewEvent.value,
    rating: reviewRating.value,
    comment: reviewComment.value
  })

  saveReviews()

  reviewEvent.value = ''
  reviewRating.value = 0
  reviewComment.value = ''

  showMessage('Review submitted successfully.', 'success')
}

function eventAverage(eventName) {
  const list = reviews.value.filter(
    review => review.event === eventName
  )

  if (list.length === 0) {
    return 'No ratings'
  }

  const total = list.reduce(
    (sum, review) => sum + review.rating,
    0
  )

  return (total / list.length).toFixed(1)
}

function showMessage(text, type) {
  message.value = text
  messageType.value = type
}
</script>
