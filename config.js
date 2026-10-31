// Supabase 프로젝트 화면의 Connect(연결) 정보에서 값을 복사해 붙여 넣으세요.
const SUPABASE_URL = "https://txvvzraxnpvjesptokur.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JwlwsKUFWCQh9v5oThcdgA_4wWwCS2A";

// 브라우저에서 사용할 Supabase 클라이언트입니다.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
