import { createClient } from '@supabase/supabase-js'

// Read the settings you saved in .env.local.
const projectUrl = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Show a clear error if either setting is missing.
if (!projectUrl || !publishableKey) {
  throw new Error('Missing Supabase settings. Check .env.local and restart Vite.')
}

// Other files will use this client for login and database requests.
export const supabase = createClient(projectUrl, publishableKey)
