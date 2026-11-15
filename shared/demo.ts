/**
 * Conta demo pública (juízes/visitantes).
 *
 * A conta existe em `auth.users` mas NÃO em `admin_users`: o RLS nega-lhe
 * todas as escritas na base de dados. O servidor reconhece este email e
 * permite apenas leituras em `/api/admin/**` (o middleware bloqueia
 * POST/PUT/PATCH/DELETE). O cliente mostra o painel em modo só-leitura.
 */
export const DEMO_EMAIL = 'juiz@gmail.com'
export const DEMO_PASSWORD = '12345678'
