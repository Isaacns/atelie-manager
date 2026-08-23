# Ateliê Manager — piloto React+TS

Fatia piloto (tela **Clientes**) migrada do app vanilla para **React + TypeScript + Vite + Tailwind**,
sobre o MESMO Supabase (`emyjzjadmxgbtmxnzazu`, schema `atelie`) — estratégia strangler (ADR-001).

## Dev
```
npm install
npm run dev
```
## Build
```
npm run build   # tsc estrito + vite → dist/
```
Chave publishable (anon) de produção em `.env.production` (segura, vai no bundle).
