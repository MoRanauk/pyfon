import { HttpError } from './errors.js';

export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new HttpError(400, 'validation_failed', 'Some fields are invalid', details);
  }
  return result.data;
}
