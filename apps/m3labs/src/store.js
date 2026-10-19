// Things kept on this device only (photos, notes, to-dos). Not shared between devices yet.
export const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
export const ukey = (user, name) => 'm3:' + ((user && user.id) || 'anon') + ':' + name;
export const photoKey = (user) => 'm3-photo-' + ((user && user.stage) || 'dev');

export function waLink(phone, text) {
  let n = String(phone || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '254' + n.slice(1);
  else if (/^[17]\d{8}$/.test(n)) n = '254' + n;
  return n ? 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '') : '';
}

export function resizeImage(file, maxW, maxH, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxW / img.width, maxH / img.height);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality || 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a usable picture.')); };
    img.src = url;
  });
}
