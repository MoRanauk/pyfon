// Extra HTTP status numbers: success, redirects and less common errors.
const E = (n, title, meaning, why, fix, prevent) => ({
  id: 'http-' + n, group: 'HTTP status numbers', title: n + ' ' + title, match: [new RegExp('\\b' + n + '\\b')],
  meaning, why, fix, prevent, weak: true,
});
const OK = 'Nothing to fix.';
export const STATUS_MORE = [
  E(200, 'OK (success)', 'The request worked.', 'Normal answer.', [OK], 'Nothing to do.'),
  E(201, 'Created (success)', 'Something new was saved, such as an account or an order.', 'Normal answer after saving.', [OK], 'Nothing to do.'),
  E(204, 'No content (success)', 'It worked and there is nothing to send back.', 'Normal answer after some deletes or updates.', [OK], 'Nothing to do.'),
  E(301, 'Moved permanently', 'The address moved for good and the browser follows it.', 'The site was given a new address.', ['Update any old links to the new address.'], 'Keep links current.'),
  E(302, 'Moved for now', 'The browser was sent to another address, often after sign-in.', 'A normal redirect.', [OK], 'Nothing to do.'),
  E(304, 'Not modified', 'The browser already has the latest copy, so nothing was sent again.', 'Normal caching. It is a good sign.', [OK], 'Nothing to do.'),
  E(405, 'Wrong method', 'The address exists but not for this kind of request (for example GET instead of POST).', 'A button or test calls the route the wrong way.', ['Check the method in the API tester or code.', 'Compare it with the route file.'], 'Use the shared api-client.'),
  E(408, 'Request timed out', 'The request took too long to arrive.', 'A slow connection or a big upload.', ['Try again.', 'Use a smaller file.'], 'Compress uploads.'),
  E(410, 'Gone', 'The thing was removed on purpose.', 'The record or page no longer exists.', ['Remove old links to it.'], 'Archive rather than delete.'),
  E(415, 'Wrong file type', 'The server does not accept this kind of content.', 'A wrong content type or file format was sent.', ['Send JSON for data.', 'Use an allowed image or PDF for uploads.'], 'Check types before upload.'),
  E(422, 'Could not process', 'The data was readable but not acceptable.', 'A value broke a rule.', ['Read the message: it names the field.'], 'Validate on the page too.'),
  E(499, 'Browser gave up', 'The browser closed the request before the answer came.', 'The person left the page or cancelled.', ['Usually ignore it.', 'If it is frequent on one route, that route is slow.'], 'Make slow routes faster.'),
  E(504, 'Gateway timeout', 'A service the backend depends on took too long to answer.', 'A slow database, email or WhatsApp service.', ['Check Health and Connect.', 'Try again in a minute.'], 'Watch response times in Traffic graphs.'),
];
