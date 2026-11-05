/* Mini runtime para ver los tableros fuera de Claude Design: {{ }}, sc-if, sc-for y onClick */
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) { this.state = Object.assign({}, this.state, typeof patch === 'function' ? patch(this.state) : patch); window.__dcRender(); }
    forceUpdate() { window.__dcRender(); }
  }
  window.DCLogic = DCLogic;

  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  const WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;
  function look(path, scopes) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    const parts = path.split('.');
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i] && parts[0] in scopes[i]) {
        let v = scopes[i];
        for (const p of parts) { v = v == null ? undefined : v[p]; }
        return v;
      }
    }
    return undefined;
  }
  const str = (v) => (v == null || v === false ? '' : String(v));

  function walk(node, scopes) {
    const out = [];
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        out.push(document.createTextNode(n.nodeValue.replace(HOLE, (_, p) => str(look(p, scopes)))));
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === 'sc-if') {
        const m = (n.getAttribute('value') || '').match(WHOLE);
        if (m && look(m[1], scopes)) out.push(...walk(n, scopes));
        return;
      }
      if (tag === 'sc-for') {
        const m = (n.getAttribute('list') || '').match(WHOLE);
        const as = n.getAttribute('as') || 'item';
        const list = (m && look(m[1], scopes)) || [];
        list.forEach((it, i) => { const s = {}; s[as] = it; s.$index = i; out.push(...walk(n, scopes.concat([s]))); });
        return;
      }
      const el = document.createElement(n.tagName);
      if (n.namespaceURI === 'http://www.w3.org/2000/svg') {
        out.push(cloneSvg(n, scopes));
        return;
      }
      for (const a of Array.from(n.attributes)) {
        const whole = a.value.match(WHOLE);
        if (/^on[A-Z]/.test(a.name) || (/^on/.test(a.name) && whole)) {
          const fn = whole ? look(whole[1], scopes) : null;
          if (typeof fn === 'function') el.addEventListener(a.name.slice(2).toLowerCase(), (e) => { e.preventDefault(); fn(e); });
          continue;
        }
        const v = whole ? look(whole[1], scopes) : a.value.replace(HOLE, (_, p) => str(look(p, scopes)));
        el.setAttribute(a.name, typeof v === 'boolean' ? String(v) : str(v));
      }
      walk(n, scopes).forEach((c) => el.appendChild(c));
      out.push(el);
    });
    return out;
  }
  function cloneSvg(n, scopes) {
    const c = n.cloneNode(true);
    const fix = (e) => { for (const a of Array.from(e.attributes || [])) a.value = a.value.replace(HOLE, (_, p) => str(look(p, scopes))); Array.from(e.children).forEach(fix); };
    fix(c);
    return c;
  }

  window.__dcBoot = function (Component, props) {
    const tpl = document.getElementById('dc-tpl').content;
    const root = document.getElementById('dc-root');
    const inst = new Component(props || {});
    window.__dcRender = function () {
      const vals = inst.renderVals();
      root.replaceChildren(...walk(tpl, [vals]));
    };
    window.__dcRender();
  };
})();
