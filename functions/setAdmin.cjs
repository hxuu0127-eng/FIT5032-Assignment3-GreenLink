
const { initializeApp, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

if (getApps().length === 0) {
  initializeApp({
    projectId: 'greenlink-melbourne-78303'
  })
}

const uid = process.argv[2]

if (!uid) {
  console.error('Please provide a Firebase user UID.')
  process.exit(1)
}

async function main() {
  const auth = getAuth()
  const user = await auth.getUser(uid)
  const claims = user.customClaims || {}

  await auth.setCustomUserClaims(uid, {
    ...claims,
    admin: true
  })

  console.log(`Admin permission granted to ${user.email}`)
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
