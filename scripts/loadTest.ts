
import axios from 'axios'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

async function runLoadTest(users = 50, rollsPerUser = 20) {
  console.log(`🚀 Starting Load Test: ${users} users, ${rollsPerUser} rolls each...`)
  const start = Date.now()
  
  const promises = []

  for (let i = 0; i < users; i++) {
    promises.push((async () => {
      for (let j = 0; j < rollsPerUser; j++) {
        try {
          // Mock call to a flash bet or manual bet endpoint
          // In a real scenario, this would hit the actual API with valid auth
          await axios.post(`${API_BASE_URL}/api/games/dice/roll`, {
            amount: 0.1,
            direction: 'OVER',
            threshold: 50
          }, { timeout: 5000 })
        } catch (e) {
          // Suppress errors for the test output but count them if needed
        }
      }
    })())
  }

  await Promise.all(promises)
  const end = Date.now()
  const duration = (end - start) / 1000
  const totalRolls = users * rollsPerUser
  
  console.log('✅ Load Test Complete')
  console.log(`Total Rolls: ${totalRolls}`)
  console.log(`Duration: ${duration.toFixed(2)}s`)
  console.log(`Throughput: ${(totalRolls / duration).toFixed(2)} rolls/sec`)
}

// execute if run directly
if (require.main === module) {
  runLoadTest()
}
