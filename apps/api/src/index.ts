import { getEnv } from './config/env'
import { createApp } from './app'

const env = getEnv()
const app = createApp()

app.listen(env.PORT, () => {
  console.log(`FDF API running on http://localhost:${env.PORT}`)
})

export default app
