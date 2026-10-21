# TabGuard Privacy Policy

Last updated: 2026-10-21

## Summary

TabGuard does not collect, transmit, or sell any user data. All tab data stays on your device.

## What TabGuard stores

All data stored locally in IndexedDB (tabguard_db):
- Tab URLs, titles, pinned status, window index (only for sessions YOU save)
- Session labels you type
- SHA-256 checksum for verification
- Timestamps

No data leaves your device. There is no server, no cloud sync, no account.

## What TabGuard does NOT do

- No network requests (except: none — zero fetches)
- No analytics, telemetry, or crash reports
- No cookies
- No reading of page content (only tab metadata: url, title, pinned)
- No third-party services
- No advertising
- No account or login

## Permissions explained

| Permission | Why |
|---|---|
| tabs | Read tab URL/title to save sessions you request |
| storage | Save preferences |
| unlimitedStorage | IndexedDB quota for many sessions |
| sessions | Reserved for future restore-closed-tabs feature |
| alarms | Schedule auto-backup every 30 min |
| host_permissions: [] | Empty — no site access |

## Data deletion

You can delete any session from the popup (Delete button) or clear all data by:
1. Uninstalling TabGuard, or
2. Chrome > Settings > Privacy > Clear browsing data > IndexedDB for chrome-extension

## Children's privacy

TabGuard is not directed at children under 13. No data is collected.

## Changes

If this policy changes, the updated version will be included with the extension release and posted at the project GitHub.

## Contact

tuyentn23@gmail.com
GitHub: https://github.com/tuyentn23-dot/tabguard-landing
