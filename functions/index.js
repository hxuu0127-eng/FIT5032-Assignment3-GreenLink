
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { initializeApp } = require('firebase-admin/app')

initializeApp()
const store = getFirestore()

const apiKey = defineSecret('SENDGRID_API_KEY')
const fromEmail = defineSecret('SENDGRID_FROM_EMAIL')
const MAX_BYTES = 1024 * 1024

const types = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain'
}

// D.2 + E.1: SendGrid email with attachment
exports.sendAttachmentEmail = onCall({
  region: 'australia-southeast1',
  secrets: [apiKey, fromEmail],
  enforceAppCheck: false,
  maxInstances: 3
}, async (request) => {
  if (
    !request.auth?.uid ||
    !request.auth.token.email ||
    !request.auth.token.email_verified
  ) {
    throw new HttpsError(
      'unauthenticated',
      'Sign in with a verified email address before sending.'
    )
  }

  const { subject, message, filename, mimeType, base64 } = request.data || {}

  if (
    typeof subject !== 'string' ||
    !subject.trim() ||
    subject.length > 120 ||
    typeof message !== 'string' ||
    !message.trim() ||
    message.length > 2000 ||
    typeof filename !== 'string' ||
    filename.length > 100 ||
    !/^[\w .()-]+$/.test(filename) ||
    typeof base64 !== 'string' ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid email or attachment fields.'
    )
  }

  const extension = filename.split('.').pop().toLowerCase()

  if (
    types[extension] !== mimeType ||
    base64.length > Math.ceil(MAX_BYTES * 4 / 3) + 4
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Unsupported or oversized attachment.'
    )
  }

  const file = Buffer.from(base64, 'base64')

  if (
    !file.length ||
    file.length > MAX_BYTES ||
    file.toString('base64') !== base64
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid attachment content.'
    )
  }

  const response = await fetch(
    'https://api.sendgrid.com/v3/mail/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.value()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [
              { email: request.auth.token.email }
            ]
          }
        ],
        from: {
          email: fromEmail.value()
        },
        subject: subject.trim(),
        content: [
          {
            type: 'text/plain',
            value: message.trim()
          }
        ],
        attachments: [
          {
            content: base64,
            filename,
            type: mimeType,
            disposition: 'attachment'
          }
        ]
      })
    }
  ).catch(err => {
    logger.error('SendGrid network error', {
      message: err.message
    })

    throw new HttpsError(
      'internal',
      'Unable to connect to email provider.'
    )
  })

  if (!response.ok) {
    const errorBody = await response.text()

    logger.error('SendGrid rejected request', {
      status: response.status,
      details: errorBody.slice(0, 1000)
    })

    throw new HttpsError(
      'internal',
      'Email provider rejected request; check logs and sender verification.'
    )
  }

  return { success: true }
})

// F.1: Smart booking system

const validEventId = value =>
  typeof value === 'string' &&
  /^[a-zA-Z0-9_-]{1,100}$/.test(value)

const validDate = value =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value)

const validTime = value =>
  typeof value === 'string' &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

function eventInterval(event) {
  if (
    !validDate(event?.date) ||
    !validTime(event?.startTime) ||
    !validTime(event?.endTime) ||
    event.startTime >= event.endTime
  ) {
    throw new HttpsError(
      'failed-precondition',
      'Activity requires a valid date, startTime and endTime.'
    )
  }

  return {
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime
  }
}

function overlaps(a, b) {
  return (
    a.date === b.date &&
    a.startTime < b.endTime &&
    b.startTime < a.endTime
  )
}

// Create booking
exports.createBooking = onCall({
  region: 'australia-southeast1',
  maxInstances: 5
}, async request => {
  const uid = request.auth?.uid

  if (!uid || !request.auth.token.email) {
    throw new HttpsError(
      'unauthenticated',
      'Sign in first.'
    )
  }

  const { eventId, name } = request.data || {}

  if (
    !validEventId(eventId) ||
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    name.trim().length > 50
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid booking details.'
    )
  }

  const eventRef = store.collection('events').doc(eventId)
  const legacyRef = store.collection('bookings').doc(uid)
  const itemRef = legacyRef.collection('items').doc(eventId)
  const lockRef = store.collection('bookingLocks').doc(uid)
  const itemsQuery = legacyRef.collection('items')

  await store.runTransaction(async tx => {
    const [lockSnap, eventSnap, legacySnap, itemsSnap] =
      await Promise.all([
        tx.get(lockRef),
        tx.get(eventRef),
        tx.get(legacyRef),
        tx.get(itemsQuery)
      ])

    if (
      !eventSnap.exists ||
      eventSnap.data().status !== 'published'
    ) {
      throw new HttpsError(
        'not-found',
        'Activity unavailable.'
      )
    }

    const event = eventSnap.data()
    const interval = eventInterval(event)

    // Reject bookings once the activity has started (Melbourne local time).
    const melbourneParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date())

    const getMelbournePart = type =>
      melbourneParts.find(part => part.type === type)?.value

    const todayInMelbourne = [
      getMelbournePart('year'),
      getMelbournePart('month'),
      getMelbournePart('day')
    ].join('-')

    const timeInMelbourne = [
      getMelbournePart('hour'),
      getMelbournePart('minute')
    ].join(':')

    if (
      interval.date < todayInMelbourne ||
      (
        interval.date === todayInMelbourne &&
        interval.startTime <= timeInMelbourne
      )
    ) {
      throw new HttpsError(
        'failed-precondition',
        'This activity has already started or finished. Registration is closed.'
      )
    }

    const capacity = Number(
      event.capacity ?? event.places
    )

    const count = Number(
      event.bookedCount ?? 0
    )

    if (
      !Number.isSafeInteger(capacity) ||
      capacity < 1 ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count >= capacity
    ) {
      throw new HttpsError(
        'resource-exhausted',
        'No places remain.'
      )
    }

    if (
      legacySnap.exists &&
      legacySnap.data().eventId === eventId
    ) {
      throw new HttpsError(
        'already-exists',
        'You already booked this activity.'
      )
    }

    if (itemsSnap.docs.some(doc => doc.id === eventId)) {
      throw new HttpsError(
        'already-exists',
        'You already booked this activity.'
      )
    }

    const bookings = itemsSnap.docs
      .map(doc => doc.data())
      .filter(booking => booking.status !== 'completed')

    if (
      legacySnap.exists &&
      validEventId(legacySnap.data().eventId)
    ) {
      const oldEventSnap = await tx.get(
        store.collection('events').doc(
          legacySnap.data().eventId
        )
      )

      if (!oldEventSnap.exists) {
        throw new HttpsError(
          'failed-precondition',
          'Existing booking activity is missing. Cancel it before booking again.'
        )
      }

      bookings.push({
        ...eventInterval(oldEventSnap.data()),
        eventId: legacySnap.data().eventId
      })
    } else if (legacySnap.exists) {
      throw new HttpsError(
        'failed-precondition',
        'Existing booking is invalid. Contact support.'
      )
    }

    for (const booked of bookings) {
      if (booked.eventId === eventId) {
        throw new HttpsError(
          'already-exists',
          'You already booked this activity.'
        )
      }

      if (overlaps(interval, eventInterval(booked))) {
        throw new HttpsError(
          'failed-precondition',
          'This activity overlaps with another booking.'
        )
      }
    }

    tx.update(eventRef, {
      bookedCount: count + 1
    })

    tx.create(itemRef, {
      userId: uid,
      name: name.trim(),
      email: request.auth.token.email,
      eventId,
      event: event.name || event.title || eventId,
      ...interval,

      status: 'booked',
      completedAt: null,

      createdAt: FieldValue.serverTimestamp()
    })

    tx.set(lockRef, {
      version: Number(lockSnap.data()?.version || 0) + 1,
      updatedAt: FieldValue.serverTimestamp()
    })
  })

  return { success: true }
})

// Cancel a selected booking
exports.cancelBooking = onCall({
  region: 'australia-southeast1',
  maxInstances: 5
}, async request => {
  const uid = request.auth?.uid

  if (!uid) {
    throw new HttpsError(
      'unauthenticated',
      'Sign in first.'
    )
  }

  const { eventId } = request.data || {}

  if (!validEventId(eventId)) {
    throw new HttpsError(
      'invalid-argument',
      'Select a booking to cancel (eventId required).'
    )
  }

  const legacyRef = store.collection('bookings').doc(uid)
  const itemRef = legacyRef.collection('items').doc(eventId)
  const lockRef = store.collection('bookingLocks').doc(uid)
  const eventRef = store.collection('events').doc(eventId)

  await store.runTransaction(async tx => {
    const lockSnap = await tx.get(lockRef)
    const legacySnap = await tx.get(legacyRef)
    const itemSnap = await tx.get(itemRef)

    const isLegacy =
      legacySnap.exists &&
      legacySnap.data().eventId === eventId

    if (!isLegacy && !itemSnap.exists) {
      throw new HttpsError(
        'not-found',
        'No matching booking.'
      )
    }

    if (itemSnap.exists && itemSnap.data().status === 'completed') {
      throw new HttpsError(
        'failed-precondition',
        'Completed activities cannot be cancelled.'
      )
    }

    const eventSnap = await tx.get(eventRef)

    if (!eventSnap.exists) {
      throw new HttpsError(
        'failed-precondition',
        'Activity no longer exists.'
      )
    }

    const count = Number(
      eventSnap.data().bookedCount ?? 0
    )

    if (
      !Number.isSafeInteger(count) ||
      count < 1
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Invalid activity count.'
      )
    }

    tx.update(eventRef, {
      bookedCount: count - 1
    })

    if (isLegacy) {
      tx.delete(legacyRef)
    } else {
      tx.delete(itemRef)
    }

    tx.set(lockRef, {
      version: Number(lockSnap.data()?.version || 0) + 1,
      updatedAt: FieldValue.serverTimestamp()
    })
  })

  return { success: true }
})

// Confirm a completed activity (admin only)
exports.completeBooking = onCall({
  region: 'australia-southeast1',
  maxInstances: 5
}, async request => {
  const adminUid = request.auth?.uid

  if (!adminUid) {
    throw new HttpsError(
      'unauthenticated',
      'Sign in first.'
    )
  }

  if (request.auth.token.admin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Only administrators can confirm completed activities.'
    )
  }

  const { userId, eventId } = request.data || {}

  if (
    typeof userId !== 'string' ||
    !userId.trim() ||
    !validEventId(eventId)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Valid userId and eventId are required.'
    )
  }

  const bookingRef = store.collection('bookings')
    .doc(userId)
    .collection('items')
    .doc(eventId)

  await store.runTransaction(async tx => {
    const bookingSnap = await tx.get(bookingRef)

    if (!bookingSnap.exists) {
      throw new HttpsError(
        'not-found',
        'Booking not found.'
      )
    }

    const booking = bookingSnap.data()

    if (booking.status === 'completed') {
      throw new HttpsError(
        'already-exists',
        'Activity has already been marked as completed.'
      )
    }

    if (booking.status && booking.status !== 'booked') {
      throw new HttpsError(
        'failed-precondition',
        'Booking is not eligible for completion.'
      )
    }

    const interval = eventInterval(booking)

    const melbourneNow = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date())

    const getPart = type =>
      melbourneNow.find(part => part.type === type)?.value

    const currentDate = [
      getPart('year'),
      getPart('month'),
      getPart('day')
    ].join('-')

    const currentTime = [
      getPart('hour'),
      getPart('minute')
    ].join(':')

    if (
      interval.date > currentDate ||
      (
        interval.date === currentDate &&
        interval.endTime > currentTime
      )
    ) {
      throw new HttpsError(
        'failed-precondition',
        'The activity has not finished yet.'
      )
    }

    tx.update(bookingRef, {
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      completedBy: adminUid
    })
  })

  return { success: true }
})
