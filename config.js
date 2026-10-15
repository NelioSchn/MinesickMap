// Nur den PUBLIC / PUBLISHABLE KEY eintragen, niemals service_role oder Secret Key.
export const config = {
  supabaseUrl: 'https://dmpvhaczehclxzvxemfl.supabase.co',
  supabaseKey: 'sb_publishable_nUi2OwxKp00eLDcC6OAZCw_zBBDU9dJ',
  worldId: 'main',
  adminUsername: 'totalhs',
  // Dieses Konto im Supabase Auth-Dashboard anlegen und als Admin freischalten.
  // Das feste Passwort gehört ausschliesslich in Supabase Auth, niemals hierher.
  adminEmail: 'admin@chunk-atlas.invalid',
};