(() => {
  const buttons = [...document.querySelectorAll('#install-app, #install-app-secondary')];
  if (!buttons.length) return;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isStandalone) {
    buttons.forEach((button) => {
      button.hidden = true;
    });
    return;
  }

  const buildInstallSheet = () => {
    let sheet = document.querySelector('#ios-install-sheet');
    if (sheet) return sheet;

    sheet = document.createElement('div');
    sheet.id = 'ios-install-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'ios-install-title');
    sheet.hidden = true;
    sheet.innerHTML = `
      <div class="ios-install-backdrop" data-close-install></div>
      <div class="ios-install-card">
        <button class="ios-install-close" type="button" aria-label="Close install instructions" data-close-install>×</button>
        <img src="/assets/101-detailers-shield-v2.png" alt="" width="76" height="76" />
        <p class="ios-install-kicker">101 Detailers app</p>
        <h2 id="ios-install-title">Put 101 Detailers on your Home Screen.</h2>
        <ol>
          <li>Tap the <strong>Share</strong> button in Safari.</li>
          <li>Choose <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong>.</li>
        </ol>
        <p class="ios-install-note">Then tap the 101 Detailers icon anytime you need a detail.</p>
        <a class="ios-install-preview" href="/app.html">Preview the app</a>
      </div>`;

    const style = document.createElement('style');
    style.textContent = `
      #ios-install-sheet[hidden]{display:none}
      #ios-install-sheet{position:fixed;z-index:1000;inset:0;display:grid;place-items:end center;padding:18px}
      .ios-install-backdrop{position:absolute;inset:0;background:rgba(1,5,9,.76);backdrop-filter:blur(8px)}
      .ios-install-card{position:relative;width:min(100%,460px);padding:30px 24px 24px;border:1px solid rgba(255,215,122,.35);border-radius:28px;background:linear-gradient(155deg,#102235,#07121e 68%,#050a10);box-shadow:0 28px 90px rgba(0,0,0,.65);color:#fff;text-align:center}
      .ios-install-card img{object-fit:contain;filter:drop-shadow(0 0 22px rgba(244,173,39,.25))}
      .ios-install-close{position:absolute;top:14px;right:16px;width:38px;height:38px;border:1px solid #4b6174;border-radius:50%;background:rgba(255,255,255,.04);color:#fff;font-size:1.5rem}
      .ios-install-kicker{margin:12px 0 7px;color:#ffd77a;font-size:.7rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
      .ios-install-card h2{margin:0;font-size:clamp(1.8rem,8vw,2.6rem);line-height:1;letter-spacing:-.04em}
      .ios-install-card ol{margin:24px auto 0;padding:0;list-style-position:inside;display:grid;gap:12px;color:#d7e1e9;line-height:1.45;text-align:left;max-width:310px}
      .ios-install-note{margin:20px auto 0;color:#9fb0be;max-width:30ch;font-size:.9rem}
      .ios-install-preview{margin-top:20px;min-height:50px;display:flex;align-items:center;justify-content:center;border:1px solid #ffd77a;border-radius:16px;background:linear-gradient(180deg,#ffd77a,#f4ad27 55%,#d89012);color:#07121e;font-weight:900;text-decoration:none}
    `;
    document.head.appendChild(style);
    document.body.appendChild(sheet);

    sheet.querySelectorAll('[data-close-install]').forEach((element) => {
      element.addEventListener('click', () => {
        sheet.hidden = true;
      });
    });
    return sheet;
  };

  if (isIOS) {
    buttons.forEach((button) => {
      button.hidden = false;
      button.textContent = 'Add 101 Detailers to iPhone';
      button.addEventListener('click', () => {
        const sheet = buildInstallSheet();
        sheet.hidden = false;
      });
    });
  }
})();
