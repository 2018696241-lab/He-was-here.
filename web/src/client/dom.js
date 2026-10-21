(function (root) {
  'use strict';
  function createDom(document) {
    const $ = selector => document.querySelector(selector);
    function el(tag, text, className) {
      const node = document.createElement(tag);
      if (text !== undefined && text !== null) node.textContent = text;
      if (className) node.className = className;
      return node;
    }
    function button(text, action, className = 'button outline', value) {
      const node = el('button', text, className);
      node.type = 'button'; node.dataset.action = action;
      if (value !== undefined) node.dataset.value = String(value);
      return node;
    }
    const asset=path=>{const resolved=root.RenZengImageAssets?.[path]?.preview||path;return root.RenZengAssetMap?.[resolved]||resolved;};
    return { $, el, button, asset };
  }
  root.ArchiveDom = { createDom };
})(globalThis);
