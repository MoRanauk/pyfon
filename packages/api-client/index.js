// One module that talks to the Pyfon backend. Every call sends X-Interface.
export class ApiError extends Error {
  constructor(status, code, message, details, requestId) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

// Keeps the login token in the browser, one slot per interface.
export function tokenStore(interfaceCode) {
  const key = 'pyfon_token_' + interfaceCode;
  return {
    get() { try { return localStorage.getItem(key); } catch { return null; } },
    set(t) { try { localStorage.setItem(key, t); } catch { /* ignore */ } },
    clear() { try { localStorage.removeItem(key); } catch { /* ignore */ } }
  };
}

export function createClient({ baseUrl, interfaceCode, getToken }) {
  const root = String(baseUrl).replace(/\/+$/, '');

  async function request(method, path, opts = {}) {
    const headers = { 'X-Interface': interfaceCode };
    const token = getToken ? getToken() : null;
    if (token) headers.Authorization = 'Bearer ' + token;

    let body;
    if (opts.form) {
      body = opts.form; // FormData: the browser sets the content type
    } else if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }

    let qs = '';
    if (opts.query) {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
      }
      const s = p.toString();
      if (s) qs = '?' + s;
    }

    let res;
    try {
      res = await fetch(root + path + qs, { method, headers, body });
    } catch {
      throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection and try again.');
    }

    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = null; } }

    if (!res.ok) {
      const e = (data && data.error) || {};
      throw new ApiError(res.status, e.code || 'error', e.message || 'Something went wrong.', e.details, e.requestId);
    }
    return data;
  }

  const get = (path, query) => request('GET', path, { query });
  const post = (path, body) => request('POST', path, { body });

  return {
    get,
    post,
    request,
    auth: {
      register: (email, password, full_name) => post('/v1/auth/register', { email, password, full_name }),
      login: (email, password) => post('/v1/auth/login', { email, password }),
      me: () => get('/v1/auth/me'),
      changePassword: (current_password, new_password) => post('/v1/auth/change-password', { current_password, new_password })
    },
    catalog: {
      categories: (store) => get('/v1/catalog/' + store + '/categories'),
      items: (store, query) => get('/v1/catalog/' + store + '/items', query),
      item: (store, sku) => get('/v1/catalog/' + store + '/items/' + encodeURIComponent(store ? sku : sku))
    },
    customer: {
      createOrder: (order) => post('/v1/customer/orders', order),
      listOrders: () => get('/v1/customer/orders'),
      createQuote: (quote) => post('/v1/customer/quote-requests', quote),
      listQuotes: () => get('/v1/customer/quote-requests'),
      upload: (file, purpose) => {
        const form = new FormData();
        form.append('purpose', purpose);
        form.append('file', file);
        return request('POST', '/v1/customer/uploads', { form });
      },
      linkOrderLineFile: (ref, lineId, attachmentId) => post('/v1/customer/orders/' + ref + '/lines/' + lineId + '/files', { attachmentId }),
      linkQuoteFile: (ref, attachmentId) => post('/v1/customer/quote-requests/' + ref + '/files', { attachmentId })
    },
    tickets: {
      create: (group, t) => post('/v1/' + group + '/tickets', t),
      list: (group) => get('/v1/' + group + '/tickets'),
      get: (group, ref) => get('/v1/' + group + '/tickets/' + ref),
      comment: (group, ref, body) => post('/v1/' + group + '/tickets/' + ref + '/comments', { body })
    }
  };
}

