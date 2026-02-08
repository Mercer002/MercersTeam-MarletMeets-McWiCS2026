# Ticket 4.6 - Integration Test Checklist

## Prereqs
- Backend running: `python3 backend/app.py` (API on `http://localhost:5001`)
- Frontend running: `npm start` in `client/` (UI on `http://localhost:3000`)
- Database running and seeded: `python3 scripts/seed.py`

## Full User Flow
1. Student signup
   - Use the UI Sign Up screen.
   - Expected: success message and auto-login to Student Home.
2. Student profile & matches
   - Add skills/languages and save.
   - Expected: match cards load.
3. Senior signup
   - Create a Senior account on Sign Up screen.
   - Expected: success message and auto-login to Senior Home.
4. Student select Senior
   - Select a Senior, confirm in modal.
   - Expected: Senior appears in Student Dashboard contact list + map.
5. Senior notification
   - Log into the Senior account.
   - Expected: notification card shows student phone.
6. Session creation (admin)
   - Log in as `admin@mail.mcgill.ca` / `admin123`.
   - Find a senior match and create a session.
   - Expected: success status with new session id.

## Edge Cases
- Empty form submission
  - Expected: inline validation errors, no API call.
- Invalid email
  - Expected: inline validation error.
- No matches found
  - Expected: "No matches yet." message after saving skills.

## Cross-Browser
Run the full flow in:
- Chrome
- Firefox
Expected: consistent layout, maps render, modals centered.

## Data Integrity (psql)
```
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM seniors;
SELECT COUNT(*) FROM sessions;
SELECT email, COUNT(*) FROM students GROUP BY email HAVING COUNT(*) > 1;
SELECT email, COUNT(*) FROM seniors GROUP BY email HAVING COUNT(*) > 1;
SELECT * FROM matches WHERE student_id IS NULL OR senior_id IS NULL;
```

Expected: no duplicates, no null references, counts are non-zero after seeding.
