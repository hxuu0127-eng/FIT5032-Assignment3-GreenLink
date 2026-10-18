
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
          :events="events"
          :bookings="bookings"
          @select-event="selectRecommendedEvent"
        />
        
        <GeoActivities :events="events" />

        <!-- Upcoming activities -->
        <section class="events-section">
          <p v-if="dataStatus" role="status">
            {{ dataStatus }}
          </p>

          <h2>Upcoming Activities</h2>

          <div class="events-grid">
            <div
              v-for="event in events"
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

            <button
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

          <form @submit.prevent="register">
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
                v-for="event in events"
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
const dataStatus = ref('Loading Firestore activities...')

let unsubscribeEvents
let unsubscribeReviews
let unsubscribeUsers
let unsubscribeBooking
let unsubscribeAuth

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
  const event = events.value.find(item => item.id === eventId)

  if (!event) {
    showMessage('Activity not found.', 'error')
    return
  }

  selectedEvent.value = event.id
  showMessage(
    `${event.name} selected. Complete the form to book.`,
    'success'
  )

  document.getElementById('booking-section')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
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
  if (!currentUser.value) {
    return showMessage('Please sign in.', 'error')
  }

  if (bookingBusy.value) return

  const cleanName = name.value.trim()
  const cleanEmail = email.value.trim().toLowerCase()

  if (
    cleanName.length < 2 ||
    cleanEmail !== currentUser.value.email?.toLowerCase()
  ) {
    return showMessage(
      'Enter your name and your signed-in email address.',
      'error'
    )
  }

  const targetEvent = events.value.find(
    event => event.id === selectedEvent.value
  )

  if (!targetEvent) {
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

    showMessage(
      'Registration successful! Your activity has been booked.',
      'success'
    )
  } catch (error) {
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
