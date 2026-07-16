# Career CV Final Copy Cleanup v1

## Purpose

This branch makes the final small copy and extraction cleanup for the CV flow.
The goal is to keep AdminAvenger's life-admin positioning while making it clear
that Check a message can also handle CVs and job adverts.

## Changes

- Broadened remaining input copy to mention letters, CVs, and job adverts.
- Updated the main paste textarea placeholder to include CV and job advert text.
- Tightened project extraction so section labels and generic lead-in lines are
  not shown as projects.
- Tightened education/training extraction so generic awareness or skills lines
  are not shown as training unless they look like a course, module,
  qualification, or training item.

## Safety Boundary

Career support remains preparation-only.

AdminAvenger helps prepare. You stay in control.

This work does not add:

- job scraping or live job search
- cloud calls or analytics
- automatic applications, submissions, messages, or employer contact
- scoring or guarantee claims
- real personal CV fixtures

## Test Coverage

Tests cover:

- broader Home/sidebar/add-item copy
- CV/job advert placeholder copy
- noisy project-line filtering
- generic awareness-line filtering in education/training
- normal subscription/admin routing remaining unchanged
