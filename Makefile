COMPOSE_FILE ?= ./docker/docker-compose.yml
DC := docker compose -f $(COMPOSE_FILE)

.PHONY: up up-d down build rebuild restart logs ps

up:
	$(DC) up --build

up-d:
	$(DC) up --build -d

down:
	$(DC) down

build:
	$(DC) build

rebuild:
	$(DC) down
	$(DC) up --build

restart:
	$(DC) restart

logs:
	$(DC) logs -f

ps:
	$(DC) ps
