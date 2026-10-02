# Event Check-in PWA

Private 4-digit code check-in and networking assistant for events.

## Repository layout

- `frontend/` — installable static PWA for GitHub Pages.
- `backend/` — AWS Lambda handler.
- `template.yaml` — AWS SAM infrastructure for Cognito, API Gateway, Lambda, and DynamoDB.

## Local demo

```powershell
cd frontend
npm install
npm run dev
```

The frontend starts in mock mode when `VITE_MOCK_MODE=true` or when no API URL is configured. Mock mode demonstrates event selection, 4-digit code lookup, check-in, routing, and recommendations without AWS credentials.

## AWS deployment

1. Install AWS SAM CLI and configure an AWS profile.
2. Build and deploy in `eu-central-1`:

```powershell
sam build
sam deploy --guided --region eu-central-1
```

During the guided deployment set:

- `AllowedOrigin` to the final GitHub Pages URL, not `*`.
- `RegistrationApiUrl` to the registration platform API base URL.
- `RegistrationApiToken` to the API token. It is stored in Lambda configuration and never reaches the browser.

Create staff users with `aws cognito-idp admin-create-user` after deployment. Add only administrators to the `Admins` group; regular staff can scan and check in attendees, while only administrators can sync data and create events.

3. Copy the stack outputs into `frontend/.env.production`:

```env
VITE_API_URL=https://...
VITE_COGNITO_USER_POOL_ID=...
VITE_COGNITO_CLIENT_ID=...
VITE_MOCK_MODE=false
```

4. Build `frontend` and publish `frontend/dist` with GitHub Pages.

The registration-platform integration is intentionally an adapter. Set `REGISTRATION_API_URL` and `REGISTRATION_API_TOKEN` in the Lambda configuration after the real API contract is known.

## GitHub Pages

Add these repository variables before enabling the workflow:

- `VITE_API_URL`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`

The workflow intentionally sets `VITE_MOCK_MODE=false`. The Pages site must be served over HTTPS for camera access. On a phone, open the Pages URL and use the browser's “Add to Home Screen” action.

## Production checks

- Test 4-digit code entry on both Android Chrome and iPhone Safari.
- The registration API must return the code as `access_code`, `accessCode`, `ticket_code`, `ticketCode`, or `code`.
- Test repeated and simultaneous scans; the backend uses a conditional DynamoDB update so only the first scan creates the check-in.
- Configure an AWS Budget alert in the AWS console before the first real event.

## Safety

Do not commit `.env*` files containing credentials. The browser only receives the API URL and Cognito public identifiers; registration API credentials stay in Lambda.
