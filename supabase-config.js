// Vul hier straks jouw eigen Supabase Project URL en Anon Public Key in!
// Omdat we Row Level Security (RLS) aan hebben staan, is het veilig om
// deze in de front-end te hebben staan.

const SUPABASE_URL = 'https://pduetpbmgjrluvibtqys.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5k5DQ1xz4ojDmOaMdtq-oQ_5gIC6784';

// Maak de client aan
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
