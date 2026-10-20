import { BUILD_ERRORS } from './errorsBuild.js';
import { API_ERRORS } from './errorsApi.js';
import { STATUS_MORE } from './errorsStatus.js';

// All known errors. Add new ones in errorsBuild.js or errorsApi.js.
export const ERRORS = [...BUILD_ERRORS, ...API_ERRORS, ...STATUS_MORE];
export const GROUPS = [...new Set(ERRORS.map((e) => e.group))];
