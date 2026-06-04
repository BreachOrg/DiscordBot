# BreachBot Project Index

This repository is a Discord bot template built on `discord.js` v14. The codebase is organized around a single startup entry point that loads commands, components, and events from the `src/` tree.

## Startup Flow

1. `src/index.js` loads environment variables with `dotenv`, clears `terminal.log`, creates the bot client, exports it, and starts the connection.
2. `src/client/DiscordBot.js` defines the custom client, collection storage, database access, and connection lifecycle.
3. Handler classes under `src/client/handler/` discover modules from the command, component, and event folders and register them on the client.
4. `src/events/Client/onReady.js` and other modules under `src/` provide runtime behavior after the bot connects.

## Main Areas

- `src/commands/`: message commands and application commands, grouped by feature area.
- `src/components/`: buttons, modals, select menus, and autocomplete examples.
- `src/events/`: event handlers, grouped by Discord event type.
- `src/client/handler/`: loaders and listeners that wire the bot together.
- `src/structure/`: shared base classes and type-style structures used by commands, components, and events.
- `src/utils/`: shared utilities such as console helpers.

## Configuration

- `package.json` declares the entry point as `src/index.js` and the `start` script as `node .`.
- `src/config.js` contains the database path, development guild toggle, command toggles, owner/developer IDs, and shared user-facing messages.
- `database.yml` is the YAML-backed data store used by the bot at runtime.

## Notes

- The command loader supports both message commands and application commands.
- The event loader registers handlers dynamically based on files discovered at startup.
- The client maintains collections for application commands, message commands, aliases, and component types.