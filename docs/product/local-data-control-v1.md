# Local Data Control v1

## Why this exists

AdminAvenger is local-first. Users may paste, upload, photograph, save, and export stressful life-admin information. They need a plain way to see what this browser may hold and clear AdminAvenger data saved on this device.

Local Data Control v1 is a trust and safety feature, not a new decision engine.

## What data control covers

This version covers the known AdminAvenger browser storage keys listed in `src/lib/localDataControl.ts`.

The registry includes:

- saved workspace data: admin items, cases, findings, drafts, money tracker entries, and selection state
- older saved workspace keys from prototype versions
- local AI testing settings
- inbox scan preview preferences and local beta feedback note
- validation notes
- feedback notes
- Terms and Safety acceptance version

The Settings page shows these in user-facing language and whether a known key is currently present.

## What it does not cover

Local Data Control v1 does not:

- clear unrelated browser storage
- clear unknown keys owned by other apps or websites
- delete files already downloaded by the user
- delete adviser packs saved outside the browser
- clear operating-system files
- clear email, cloud drive, or messaging history
- contact anyone
- cancel anything
- submit anything

## Known storage registry

The central registry lives in:

`src/lib/localDataControl.ts`

Each item includes:

- id
- label
- description
- storage type
- key
- sensitivity
- user-facing explanation

All current entries use `localStorage`. There are no known AdminAvenger `sessionStorage` keys in v1.

## Local-only limitations

Clearing local data means clearing AdminAvenger data saved in this browser on this device. It does not affect:

- another browser
- another phone or computer
- downloaded Markdown adviser packs
- downloaded JSON backups
- anything the user copied, printed, sent, or saved elsewhere

This wording should stay careful. Do not describe the action as deleting everything everywhere.

## Why unknown storage is not cleared

AdminAvenger should not remove browser data it does not own. Unknown keys may belong to other apps, development tools, browser features, or the user's own work.

The clear action only removes known AdminAvenger keys from the registry.

## Confirmation behaviour

The Settings page uses a two-step confirmation:

1. The user clicks "Clear AdminAvenger data from this device".
2. A confirmation panel appears.
3. The user clicks "Yes, clear local AdminAvenger data".

The copy explains:

- this only clears AdminAvenger data saved in this browser on this device
- downloaded files are not deleted
- no one is contacted
- nothing is cancelled

## Downloaded-file limitation

Adviser packs and backups are browser downloads. Once downloaded, they are ordinary files controlled by the user and their device. AdminAvenger cannot delete those files through this local browser clear action.

The UI must say this clearly.

## Testing strategy

Automated tests cover:

- registry completeness against known app storage keys
- empty storage summary
- present-key detection
- approximate size reporting
- clearing only known keys
- preserving unrelated localStorage keys
- cleared/missing/failed result reporting
- unavailable-storage safety
- Settings copy and confirmation wiring
- Trust & Safety signposting

## Future improvements

- IndexedDB support
- export/import backup
- redaction preview
- storage usage display
- per-case delete
- privacy flow diagram
- adviser-reviewed plain-English copy
