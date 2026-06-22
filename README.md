# Tutoring Platform — Backend API

A GraphQL backend for a private tutoring business. Parents submit tutoring requests and reviews; the teacher (admin) reviews requests, converts them into active students, schedules sessions, tracks payments, and moderates testimonials.

Built with **Node.js (ES Modules), Express 5, Apollo Server 5, GraphQL, and Mongoose / MongoDB Atlas**. Authentication is JWT-based. Transactional email is handled by Resend.

---

## Tech stack

| Concern        | Choice |
| -------------- | ------ |
| Runtime        | Node.js (ES Modules — `"type": "module"`) |
| HTTP framework | Express 5 |
| GraphQL server | Apollo Server 5 (`@apollo/server`) via `@as-integrations/express5` |
| Schema         | Programmatic `graphql-js` (no SDL strings) |
| Database       | MongoDB Atlas via Mongoose |
| Auth           | `jsonwebtoken` (JWT) + `bcryptjs` (password hashing) |
| Email          | Resend |
| Config         | `dotenv` |

The schema is assembled by spreading per-module field objects into a single root `Query` / `Mutation`, so adding a feature never touches the server wiring — only `schema.js` gains one import + spread.

---

## Getting started

### Prerequisites

- Node.js (a recent LTS or current release)
- A MongoDB Atlas cluster (connection string)
- A Resend account + API key (optional, but required for emails to send)

### Install

```bash
npm install
```

If starting from scratch, the dependencies are:

```bash
npm i @apollo/server @as-integrations/express5 express cors graphql mongoose bcryptjs jsonwebtoken resend dotenv
npm i -D nodemon
```

> Note: install Express **5** (the `@as-integrations/express5` integration expects v5). Verify with `npm ls express`.

### Environment variables

Create a `.env` file in the project root:

```ini
# Required
MONGODB_URI=your-atlas-connection-string
JWT_SECRET=a-long-random-string          # e.g. `openssl rand -hex 32`

# Email (optional — features degrade gracefully without these)
RESEND_API_KEY=your-resend-api-key
BUSINESS_EMAIL=you@example.com            # where low-rating feedback alerts go
PUBLIC_REVIEW_URL=https://g.page/r/...    # where happy reviewers are sent

# Optional
PORT=4000                                 # defaults to 4000
FRONTEND_URL=http://localhost:3000        # CORS origin; defaults to localhost:3000
NODE_ENV=development                      # set to "production" when deploying
```

> `.env` changes are only read at startup — restart the server after editing it.

### Run

```bash
npm run dev        # nodemon src/server.js
```

The server boots in order: connect to Atlas → start Apollo → mount Express middleware → listen. Once up:

- GraphQL endpoint / Sandbox: `http://localhost:4000/graphql`

Introspection and the Sandbox are enabled automatically unless `NODE_ENV=production`.

---

## Authentication

Admin-only operations require a JWT in the request header:

```
Authorization: Bearer <token>
```

Get a token from `adminRegister` or `adminLogin`. Guarded resolvers call `requireAdmin(context)`, which extracts and verifies the Bearer token, loads the admin, and throws `UNAUTHENTICATED` if anything is missing or invalid. The GraphQL context is `{ req }`, set in `server.js`.

---

## API surface

### Public (no auth)

| Type | Field | Purpose |
| ---- | ----- | ------- |
| Query | `requests`, `request(id)` | List / fetch tutoring requests *(see hardening note)* |
| Query | `approvedTestimonials` | Approved testimonials for the public site |
| Mutation | `submitTutoringRequest(input)` | Parent submits a request; triggers a confirmation email |
| Mutation | `submitTestimonial(input)` | Parent submits feedback (always stored, never auto-published) |
| Mutation | `adminRegister(name, email, password)` | Create an admin account *(see hardening note)* |
| Mutation | `adminLogin(email, password)` | Log in, returns `{ token, admin }` |

### Admin only (`requireAdmin`)

| Type | Field | Purpose |
| ---- | ----- | ------- |
| Query | `students`, `student(id)` | Active student profiles |
| Query | `sessions`, `unpaidSessions` | All sessions / UNPAID + OVERDUE only |
| Query | `pendingTestimonials`, `allTestimonials` | Moderation queue / full list |
| Mutation | `updateRequestStatus(id, status)` | Accept or decline a request |
| Mutation | `convertRequestToStudent(requestId)` | Create a student from a request and mark it ACCEPTED |
| Mutation | `createSession(input)` | Schedule a session for a student |
| Mutation | `updateSessionPayment(id, paymentStatus)` | Update PAID / UNPAID / OVERDUE |
| Mutation | `setTestimonialApproval(id, isApproved)` | Publish / unpublish a testimonial |

---

## Data models

- **Admin** — `name`, `email` (unique), `password` (hashed, hidden by default), `role` (`ADMIN` / `SUPER_ADMIN`), timestamps.
- **Request** — parent contact + `studentName`, `subject`, `gradeLevel`, `message`, `status` (`PENDING` / `ACCEPTED` / `DECLINED`), timestamps.
- **Student** — student + parent details, `subjects[]`, `isActive`, optional `originalRequestId` → Request, timestamps.
- **Session** — `studentId` → Student, `date`, `durationMinutes`, `subject`, `notes`, `paymentStatus` (`PAID` / `UNPAID` / `OVERDUE`), timestamps.
- **Testimonial** — `parentAuthor`, `message`, `rating` (1–5), `isApproved` (default false), optional `studentId`, timestamps.

All models have automatic timestamps.

---

## Email behavior

Both email functions are fault-tolerant (they never throw) and are called fire-and-forget, so a mail failure never breaks the GraphQL response.

- **Request confirmation** — sent to the parent when `submitTutoringRequest` succeeds.
- **Low-rating alert** — when `submitTestimonial` receives a rating below the threshold (default 4), an alert is emailed to `BUSINESS_EMAIL` so a human can follow up.

> While using Resend's `onboarding@resend.dev` sandbox sender, delivery only works to your own Resend account email. Verify a domain and update `FROM_ADDRESS` in `emailService.js` to send to real recipients.

### Testimonial routing (by design)

`submitTestimonial` always stores the submission in full and always starts it **unapproved**. The rating only decides the thank-you experience:

- **Rating ≥ threshold** → the response invites the parent to share publicly (returns `PUBLIC_REVIEW_URL`).
- **Rating < threshold** → the response shows a "we'll make this right" message and emails the business.

Nothing is hidden at the data layer — `allTestimonials` shows everything to the admin. Only `setTestimonialApproval` controls what appears publicly. This is first-party curation and service recovery, not review gating: genuine negative feedback is never deleted or concealed to deceive.

---

## Production hardening checklist

Before exposing this to real users:

1. **Lock down `adminRegister`.** It is currently open — anyone who can reach the API can create an admin. Add a bootstrap guard (refuse if an admin already exists) or require a setup secret.
2. **Remove any debug logging.** In particular, any auth-debug line that prints tokens — a token in a log is a live credential.
3. **Set `NODE_ENV=production`** in the deploy environment to disable introspection and trim error stacktraces.
4. **Verify a Resend domain** and replace the sandbox `from` address so real parents/business contacts receive email.
5. **Consider guarding `requests` / `request(id)`.** They expose parent PII and are currently public.
6. **Rate-limit public mutations** (`submitTutoringRequest`, `submitTestimonial`, `adminLogin`) — they are unauthenticated and spammable.
7. **Add indexes** on frequently-queried fields (e.g. `Request.status`, `Testimonial.isApproved`); `Session.studentId` is already indexed.
8. **Graceful shutdown** is wired via `ApolloServerPluginDrainHttpServer`; confirm your host sends `SIGTERM` on deploy so in-flight requests drain.

---

## License

Private / proprietary unless stated otherwise.