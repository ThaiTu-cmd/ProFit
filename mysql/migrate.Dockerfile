FROM mysql:8.0

# Copy migration files
COPY ./initdb.d/ /docker-entrypoint-initdb.d/

# Save the run-migrations script to a file so we don't have to fight
# with shell escaping inside Docker CMD.
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -e' \
  'echo "[db-migrate] waiting for MySQL..."' \
  'until mysqladmin ping -h mysql -uroot -proot --silent; do sleep 2; done' \
  'echo "[db-migrate] MySQL ready, running migrations..."' \
  'for f in /docker-entrypoint-initdb.d/*.sql; do' \
  '  echo "[db-migrate] applying $f"' \
  '  mysql -h mysql -uroot -proot ProFitSuppsDB < "$f"' \
  'done' \
  'echo "[db-migrate] all migrations applied"' \
  > /apply.sh && chmod +x /apply.sh

CMD ["/apply.sh"]
