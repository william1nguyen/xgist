#!/bin/sh
docker-compose -f docker-compose.dev.yml -p xgist down --rmi local -v
docker system prune -a -f
docker volume prune -a -f