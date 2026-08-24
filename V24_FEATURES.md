# ClubOS v24

- Fixed public Create Account flow.
- Team selection removed from signup.
- Subscription selection removed from signup.
- Signup now creates the Auth account, profile, organisation membership and pending member record only.
- Team/subscription can be selected later from the Member Portal or assigned by an administrator.
- Added safer signup trigger to prevent ClubOS linking errors from causing a Supabase Auth database error.
