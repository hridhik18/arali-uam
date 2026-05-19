#!/bin/bash
set -e
BASE=http://localhost:4000/api
PSQL="PGPASSWORD=arali psql -h localhost -U arali -d arali"

echo "=== resetting and re-seeding ==="
eval "$PSQL -c \"TRUNCATE organizations CASCADE;\"" > /dev/null
cd "$(dirname "$0")/.."
pnpm seed > /tmp/seed.log
grep -q "Seed complete" /tmp/seed.log || { echo "FAIL seed"; exit 1; }

echo "=== admin login ==="
curl -s -c /tmp/admin.txt -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@spyne.test","password":"Password123!"}' | grep -q '"org_admin"' || { echo "FAIL admin login"; exit 1; }

echo "=== list users / teams / accounts ==="
curl -s -b /tmp/admin.txt $BASE/users | python3 -c "import sys,json;d=json.load(sys.stdin);assert len(d['users'])==8,d" || { echo "FAIL users count"; exit 1; }
curl -s -b /tmp/admin.txt $BASE/teams | python3 -c "import sys,json;d=json.load(sys.stdin);assert len(d['teams'])==3,d" || { echo "FAIL teams count"; exit 1; }
curl -s -b /tmp/admin.txt $BASE/customer-accounts | python3 -c "import sys,json;d=json.load(sys.stdin);assert len(d['accounts'])==5,d" || { echo "FAIL accounts count"; exit 1; }

echo "=== invite a new user, accept, log in ==="
R=$(curl -s -b /tmp/admin.txt -X POST $BASE/invitations -H "Content-Type: application/json" \
  -d '{"email":"newbie@spyne.test","role":"member","teamIds":[]}')
TOKEN=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s -X POST $BASE/invitations/$TOKEN/accept -H "Content-Type: application/json" \
  -d '{"name":"Newbie","password":"Password123!"}' | grep -q '"email":"newbie@spyne.test"' || { echo "FAIL accept"; exit 1; }
curl -s -c /tmp/newbie.txt -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"newbie@spyne.test","password":"Password123!"}' | grep -q '"member"' || { echo "FAIL newbie login"; exit 1; }

echo "=== newbie cannot list users ==="
S=$(curl -s -b /tmp/newbie.txt -o /dev/null -w "%{http_code}" $BASE/users)
[ "$S" = "403" ] || { echo "FAIL non-admin /users got $S"; exit 1; }

echo "=== deactivate frank, verify he cannot log in ==="
FRANK_ID=$(PGPASSWORD=arali psql -h localhost -U arali -d arali -tAc "SELECT id FROM users WHERE email='frank@spyne.test';" | head -n1)
curl -s -b /tmp/admin.txt -X POST $BASE/users/$FRANK_ID/deactivate > /dev/null
S=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"frank@spyne.test","password":"Password123!"}')
[ "$S" = "401" ] || { echo "FAIL deactivated-login got $S"; exit 1; }

echo "=== admin self-deactivation = 409 ==="
ADMIN_ID=$(curl -s -b /tmp/admin.txt $BASE/auth/me | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])")
S=$(curl -s -b /tmp/admin.txt -o /dev/null -w "%{http_code}" -X POST $BASE/users/$ADMIN_ID/deactivate)
[ "$S" = "409" ] || { echo "FAIL self-deactivate got $S"; exit 1; }

echo "=== last-admin demote = 409 ==="
S=$(curl -s -b /tmp/admin.txt -o /dev/null -w "%{http_code}" -X PATCH $BASE/users/$ADMIN_ID \
  -H "Content-Type: application/json" -d '{"role":"member"}')
[ "$S" = "409" ] || { echo "FAIL last-admin-demote got $S"; exit 1; }

echo ""
echo "ALL SMOKE TESTS PASSED — project is done."
