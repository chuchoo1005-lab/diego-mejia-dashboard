import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izunkalnnahtbjbrdpby.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dW5rYWxubmFodGJqYnJkcGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDM0NTQsImV4cCI6MjA5MjExOTQ1NH0.Hbn7YX84jFxLv3T5GwBdBv7-upiOjMshVBgRmZmnUHM'

export const supabase = createClient(supabaseUrl, supabaseKey)
