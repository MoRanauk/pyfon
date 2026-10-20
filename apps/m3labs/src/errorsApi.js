// Errors from the backend: the app's own codes, HTTP status numbers and database codes.
const E = (id, group, title, match, meaning, why, fix, prevent, weak) => ({ id, group, title, match, meaning, why, fix, prevent, weak: Boolean(weak) });
const A = 'API codes (backend)';
const S = 'HTTP status numbers';
const D = 'Database codes';

const CODES = [
  ['price_needs_approval', 409, 'A live price is locked', 'A product price cannot be changed directly once it is live.', [`Open Approvals and request a price change.`, `All three partners must approve it.`]],
  ['partners_incomplete', 409, 'Two different partners are needed', 'A stage sign-off needs the person doing the work and a different partner to co-sign.', [`Ask a second partner to co-sign with their own password, or from their own device.`, `One person cannot give both signatures.`]],
  ['password_change_required', 403, 'Temporary password must be changed first', 'The account has a temporary password, so everything else is blocked until it is changed.', [`Partners: on the sign-in page tap Change password under the password box, enter email, temporary password and a new one.`, `Then sign in normally.`]],
  ['wrong_interface', 403, 'Wrong site for this account', 'Customers use the stores, partners use M3 Labs desks, the developer uses the Developer desk.', [`Sign in on the right site.`, `Check the X-Interface header if you are testing by hand.`]],
  ['not_allowed_here', 403, 'This account cannot sign in here', 'The account role does not match the site.', [`Use the matching site, or create the right kind of account.`]],
  ['missing_interface', 400, 'X-Interface header missing', 'Every request must say which site it comes from.', [`Use the shared api-client, or add the X-Interface header in your test.`]],
  ['needs_approval', 409, 'Needs all three partners', 'Adding or removing partner accounts needs approval from all three partners.', [`Create the approval request and let each partner vote.`]],
  ['not_supported', 409, 'Action not supported for this account', 'The action does not apply to this kind of account.', [`Check the role of the account in Users.`]],
  ['inactive', 409, 'Account is switched off', 'The account was switched off.', [`Users: right-click the row and choose Switch on.`]],
  ['invalid_credentials', 401, 'Wrong email or password', 'The email or password is wrong, or the account is switched off. The message is the same on purpose.', [`Check Caps Lock and the email.`, `Use Forgot password, or send a temporary password from Users.`]],
  ['too_many_attempts', 429, 'Too many tries', 'The rate limit paused this action for a while to stop guessing attacks.', [`Wait about 15 minutes.`, `On your laptop, restarting the backend clears the counter.`]],
  ['invalid_code', 400, 'Reset code wrong or expired', 'Codes last 15 minutes and allow 5 tries.', [`Ask for a new code and use the newest one.`]],
  ['email_taken', 409, 'Email already registered', 'An account with this email exists.', [`Use Forgot password, or another email.`]],
  ['send_failed', 502, 'Email or message not sent', 'The sending service refused or could not be reached.', [`Check BREVO_API_KEY and BREVO_SENDER_EMAIL in backend\\.env.`, `In Brevo, keep authorised-IP blocking OFF.`, `Restart the backend after editing .env.`]],
];
const STATUS = [
  [400, 'Bad request', 'The server refused what was sent: something is missing or in the wrong shape.', [`Read the message under the number. It names the field.`, `Fix that field and send again.`]],
  [401, 'Not signed in', 'The server does not know who you are, or your sign-in expired or was cancelled.', [`Sign in again.`, `If it happens right after Sign out all, that is expected.`]],
  [403, 'Not allowed', 'You are signed in but this action is not allowed for you.', [`Read the code word with the number: it names the rule.`, `Use an account or desk that is allowed.`]],
  [404, 'Not found', 'The address or record does not exist.', [`Check the address spelling and the id.`, `The route may not be built yet.`]],
  [409, 'Conflict', 'The request is fine but a business rule says no right now.', [`Read the code word with the number, for example price_needs_approval.`]],
  [413, 'Too big', 'The upload or text is bigger than the allowed size.', [`Shrink the file, or send a smaller CSV.`]],
  [429, 'Too many requests', 'The rate limit paused you.', [`Wait about 15 minutes, then try again.`]],
  [500, 'Server error', 'The backend crashed while handling the request. It is a bug, not your mistake.', [`Open Logs and traces and find the request.`, `Look at the backend terminal for the red lines and send me a photo.`]],
  [502, 'Another service failed', 'The backend asked another service (email, WhatsApp, database) and it failed.', [`Check that service in Connect or its dashboard.`]],
  [503, 'Not available', 'A feature is switched off or not set up yet, for example SMS with no gateway.', [`Add the missing keys to backend\\.env and restart.`]],
];
const DB = [
  ['23505', 'Duplicate value', 'Something that must be unique already exists (same email or SKU).', [/duplicate key value/i], [`Use a different value, or update the existing record.`]],
  ['23503', 'Linked record missing', 'A record points to another record that does not exist, or is still used by another one.', [/violates foreign key constraint/i], [`Create the other record first, or remove the links before deleting.`]],
  ['23502', 'Required value empty', 'A required column was left empty.', [/null value in column/i], [`Send the missing field.`]],
  ['42P01', 'Table missing', 'The table does not exist.', [/relation "[^"]+" does not exist/i], [`Run migrations: in the backend folder, npm run migrate.`]],
  ['42703', 'Column missing', 'The column does not exist, so a migration is probably not applied.', [/column "[^"]+" does not exist/i], [`Run npm run migrate in the backend folder.`, `Check the column name spelling.`]],
  ['22P02', 'Wrong kind of value', 'A text was given where an id or number was expected.', [/invalid input syntax for type/i], [`Check the id in the address is a full id.`]],
  ['57014', 'Query took too long', 'The database stopped a slow query.', [/statement timeout|canceling statement/i], [`Narrow the search or the date range.`]],
];

export const API_ERRORS = [
  ...CODES.map(([c, n, t, m, f]) => E('api-' + c, A, c + ': ' + t, [new RegExp(c, 'i')], m, `The server sends the code word ${c} with status ${n}.`, f, `Find the request in Logs and traces to see the route and user.`)),
  ...STATUS.map(([n, t, m, f]) => E('http-' + n, S, n + ' ' + t, [new RegExp('\\b' + n + '\\b')], m, `Look for a code word next to the number: it says exactly which rule fired.`, f, `Find the request in Logs and traces to see the route and user.`, true)),
  ...DB.map(([c, t, m, re, f]) => E('db-' + c, D, c + ' ' + t, [new RegExp('\\b' + c + '\\b'), ...re], m, `The database enforces its own rules.`, f, `Validate input before saving.`)),
];
