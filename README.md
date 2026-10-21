# TabGuard — Trust-first Tab Manager

Chrome MV3 extension: save, restore, backup tabs with verification.

## Why

Top 3 tab managers (1.16M users combined) all fail on silent data loss.
TabGuard fixes trust first.

## Features (v0.1.0)

- Verified saves: SHA-256 checksum + post-save tab-count verification
- Restore preview: shows tab count, window count, RAM estimate
- Export any time to JSON
- Auto-backup every 30 min
- Delete with confirmation
- MV3 service worker, chrome.alarms
- Local only: no server, no telemetry

## Install (dev)

1. chrome://extensions/
2. Developer mode ON
3. Load unpacked -> select extension/
4. Pin TabGuard, click icon

## Permissions

tabs, storage, unlimitedStorage, sessions, alarms. No host_permissions.
Only reads tab metadata, never page content.

## Privacy

No data collection. All data in IndexedDB locally. No server, no analytics.

## License

MIT
