# TabGuard Privacy Policy

Last updated: 2026-10-21 (v0.2.2)

## Summary

TabGuard stores your tab sessions locally on your device. It does not contact any server, collect any analytics, or transmit any data outside your browser. There are no accounts, no payments, and no third-party services.

## What TabGuard stores locally

All session data is stored in IndexedDB (tabguard_db) on your device:
- Tab URLs, titles, pinned status, window index (only for sessions YOU explicitly save)
- Session labels you type
- A SHA-256 checksum used to verify integrity on restore
- Timestamps and your local preferences
- Auto-backup snapshots (every 30 minutes while Chrome is open, capped to prevent unbounded growth)

This local data never leaves your device.

## What TabGuard does NOT do

- No network requests of any kind (zero fetches)
- No analytics, telemetry, or crash reporting
- No advertising or ad networks
- No reading of page content (only tab metadata: URL, title, pinned flag)
- No selling or sharing of any data
- No account system, no login
- No cookies
- No payments or payment processors
- No third-party services

## Permissions explained

| Permission | Why it is used |
|---|---|
| tabs | Read tab URL/title to save the sessions you request, and restore them |
| storage | Save your preferences and session data |
| unlimitedStorage | IndexedDB quota for many saved sessions |
| alarms | Schedule the 30-minute auto-backup |

`host_permissions` is empty: TabGuard does not access any website.

## Data deletion

- Delete any individual session from the popup (Delete button).
- Remove all local data by uninstalling TabGuard, or via Chrome > Settings > Privacy > Clear browsing data > IndexedDB for chrome-extension.

## Children's privacy

TabGuard is not directed at children under 13. No personal data is collected.

## Changes

If this policy changes materially, the updated version will ship with the extension release and be posted at the same URL.

## Contact

Email: tuyentn23@gmail.com
Source: https://github.com/tuyentn23-dot/tabguard-extension
Landing: https://tuyentn23-dot.github.io/tabguard-landing/
