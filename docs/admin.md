# Admin (Dev)

## Default dev credentials (example)

Use the values from `.env.example` (copy them into your local `.env` if you want these accounts created):

- `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`

## Creating the admin user in the database

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env`.
2. Run the Prisma seed script.

The seed will create the admin user only if it does not already exist.

## Mobile admin features

- Admin screen (visible only for ADMIN/SUPER_ADMIN) allows:
  - Listing admins and facilitators
  - Creating a facilitator user
- Facilitator assignment:
  - Admins can assign a facilitator to a child from the child profile screen

