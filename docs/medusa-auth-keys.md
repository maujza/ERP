# Medusa Auth & Keys — How It Works

A reference for the two distinct "key" concepts in Medusa and what breaks when the database is rebuilt from scratch.

---

## 1. Publishable API Key

### What it is
A `pk_...` token that the **storefront** sends on every request to identify which sales channel it belongs to. Without it, all `/store/*` endpoints return `400 A valid publishable key is required`.

### Where it lives
- **Database** — created automatically during `db:migrate` / seeding, stored in the `api_key` table.
- **Frontend** — `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in `.env.local` (and injected into the Docker `web` container at build time).

### The stale-key problem
Every time the Postgres volume is wiped and the stack is rebuilt, a **new** publishable key is generated. The old value in `.env.local` becomes invalid, causing the storefront to receive `400` on every product fetch and show "0 resultados".

### How to refresh after a DB rebuild

```bash
# 1. Authenticate as admin
TOKEN=$(curl -s -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aurelia.com","password":"supersecret"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. Fetch the new publishable key
curl -s http://localhost:9000/admin/api-keys \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
k = data['api_keys'][0]
print('Key  :', k['token'])
print('Title:', k['title'])
"

# 3. Fetch the new region ID
curl -s http://localhost:9000/admin/regions \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
r = json.load(sys.stdin)['regions'][0]
print('Region ID  :', r['id'])
print('Region name:', r['name'])
"

# 4. Update .env.local with the new values, then rebuild the web container
docker compose up --build web -d
```

---

## 2. Admin JWT Token

### What it is
A short-lived `eyJ...` Bearer token issued by `POST /auth/user/emailpass`. Used by the admin UI and scripts that call `/admin/*` endpoints. Expires after **24 hours**.

### Flow

```
Client                          Medusa backend
  │                                   │
  │  POST /auth/user/emailpass        │
  │  { email, password }  ──────────>│
  │                                   │  verify scrypt hash in provider_identity
  │  { token: "eyJ..." }  <──────────│
  │                                   │
  │  GET /admin/api-keys              │
  │  Authorization: Bearer eyJ... ──>│
  │                                   │  verify JWT (JWT_SECRET)
  │  { api_keys: [...] }  <──────────│
```

### Password hashing
Medusa uses the [`scrypt-kdf`](https://www.npmjs.com/package/scrypt-kdf) package with `{ logN: 15, r: 8, p: 1 }`. The hash is stored as a base64 string in `provider_identity.provider_metadata.password`.

To generate a hash manually (e.g., in a migration script):
```js
const scryptKdf = require('scrypt-kdf');
const hash = await scryptKdf.kdf('mypassword', { logN: 15, r: 8, p: 1 });
// hash.toString('base64') → store this in provider_metadata.password
```

### Changing an existing password
`npx medusa user` only **creates** users — it errors if the user already exists. To change a password on a live instance use the auth API:

```bash
# Get a fresh token first
TOKEN=$(curl -s -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aurelia.com","password":"currentpassword"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# The reset-password endpoint sends a one-time token to email.
# Without email configured, update the hash directly in the DB:
docker compose exec backend node -e "
  const scryptKdf = require('scrypt-kdf');
  scryptKdf.kdf('newpassword', { logN: 15, r: 8, p: 1 }).then(h => console.log(h.toString('base64')));
"
# Then:
docker compose exec db psql -U medusa -d medusa -c \
  \"UPDATE provider_identity SET provider_metadata = '{\"password\": \"<hash>\"}' WHERE entity_id = 'admin@aurelia.com';\"
```

---

## 3. Region ID

### What it is
`reg_...` — identifies the Argentina region and currency (ARS). Required by the storefront as `NEXT_PUBLIC_MEDUSA_REGION_ID` to fetch correct pricing.

Like the publishable key, it is regenerated on every fresh DB build.

---

## 4. Checklist after a DB rebuild

| # | What to update | Where |
|---|----------------|-------|
| 1 | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `.env.local` |
| 2 | `NEXT_PUBLIC_MEDUSA_REGION_ID` | `.env.local` |
| 3 | Rebuild web container | `docker compose up --build web -d` |

The backend does **not** need a rebuild — it reads secrets from environment variables, not from the DB.

---

## 5. Quick diagnostics

```bash
# Is the key valid?
curl -s "http://localhost:9000/store/products?limit=1" \
  -H "x-publishable-api-key: $(grep PUBLISHABLE .env.local | cut -d= -f2)" | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK, count=' + str(d.get('count','?')) if 'count' in d else 'FAIL: ' + d.get('message','?'))"

# Can admin authenticate?
curl -s -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aurelia.com","password":"supersecret"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'token' in d else 'FAIL: ' + d.get('message','?'))"
```
