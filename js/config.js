const SUPABASE_URL = "https://vvvajmtevlqxmfzfisfm.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dmFqbXRldmxxeG1memZpc2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDQ3NzYsImV4cCI6MjEwNjQyMDc3Nn0.Ol_Tn6qHuazzaoa6KB-CqQvwm9X6cgO3NgzBtJdjOUg";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);