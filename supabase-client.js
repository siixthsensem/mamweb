import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const config = window.SUPABASE_CONFIG;
window.supabaseClient = createClient(config.url, config.publishableKey);
window.supabaseReady = Promise.resolve(window.supabaseClient);
