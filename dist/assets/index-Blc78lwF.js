var ee=Object.defineProperty;var te=(t,e,n)=>e in t?ee(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n;var z=(t,e,n)=>te(t,typeof e!="symbol"?e+"":e,n);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&r(a)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();const ne="modulepreload",re=function(t,e){return new URL(t,e).href},P={},ae=function(e,n,r){let s=Promise.resolve();if(n&&n.length>0){const a=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),o=(l==null?void 0:l.nonce)||(l==null?void 0:l.getAttribute("nonce"));s=Promise.allSettled(n.map(d=>{if(d=re(d,r),d in P)return;P[d]=!0;const u=d.endsWith(".css"),c=u?'[rel="stylesheet"]':"";if(!!r)for(let h=a.length-1;h>=0;h--){const p=a[h];if(p.href===d&&(!u||p.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${d}"]${c}`))return;const g=document.createElement("link");if(g.rel=u?"stylesheet":ne,u||(g.as="script"),g.crossOrigin="",g.href=d,o&&g.setAttribute("nonce",o),document.head.appendChild(g),u)return new Promise((h,p)=>{g.addEventListener("load",h),g.addEventListener("error",()=>p(new Error(`Unable to preload CSS for ${d}`)))})}))}function i(a){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=a,window.dispatchEvent(l),!l.defaultPrevented)throw a}return s.then(a=>{for(const l of a||[])l.status==="rejected"&&i(l.reason);return e().catch(i)})},B=(t,e)=>e.some(n=>t instanceof n);let q,K;function se(){return q||(q=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function ie(){return K||(K=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const M=new WeakMap,j=new WeakMap,D=new WeakMap;function le(t){const e=new Promise((n,r)=>{const s=()=>{t.removeEventListener("success",i),t.removeEventListener("error",a)},i=()=>{n(v(t.result)),s()},a=()=>{r(t.error),s()};t.addEventListener("success",i),t.addEventListener("error",a)});return D.set(e,t),e}function oe(t){if(M.has(t))return;const e=new Promise((n,r)=>{const s=()=>{t.removeEventListener("complete",i),t.removeEventListener("error",a),t.removeEventListener("abort",a)},i=()=>{n(),s()},a=()=>{r(t.error||new DOMException("AbortError","AbortError")),s()};t.addEventListener("complete",i),t.addEventListener("error",a),t.addEventListener("abort",a)});M.set(t,e)}let O={get(t,e,n){if(t instanceof IDBTransaction){if(e==="done")return M.get(t);if(e==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return v(t[e])},set(t,e,n){return t[e]=n,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function J(t){O=t(O)}function ce(t){return ie().includes(t)?function(...e){return t.apply(T(this),e),v(this.request)}:function(...e){return v(t.apply(T(this),e))}}function ue(t){return typeof t=="function"?ce(t):(t instanceof IDBTransaction&&oe(t),B(t,se())?new Proxy(t,O):t)}function v(t){if(t instanceof IDBRequest)return le(t);if(j.has(t))return j.get(t);const e=ue(t);return e!==t&&(j.set(t,e),D.set(e,t)),e}const T=t=>D.get(t);function de(t,e,{blocked:n,upgrade:r,blocking:s,terminated:i}={}){const a=indexedDB.open(t,e),l=v(a);return r&&a.addEventListener("upgradeneeded",o=>{r(v(a.result),o.oldVersion,o.newVersion,v(a.transaction),o)}),n&&a.addEventListener("blocked",o=>n(o.oldVersion,o.newVersion,o)),l.then(o=>{i&&o.addEventListener("close",()=>i()),s&&o.addEventListener("versionchange",d=>s(d.oldVersion,d.newVersion,d))}).catch(()=>{}),l}const he=["get","getKey","getAll","getAllKeys","count"],fe=["put","add","delete","clear"],A=new Map;function R(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if(A.get(e))return A.get(e);const n=e.replace(/FromIndex$/,""),r=e!==n,s=fe.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||he.includes(n)))return;const i=async function(a,...l){const o=this.transaction(a,s?"readwrite":"readonly");let d=o.store;return r&&(d=d.index(l.shift())),(await Promise.all([d[n](...l),s&&o.done]))[0]};return A.set(e,i),i}J(t=>({...t,get:(e,n,r)=>R(e,n)||t.get(e,n,r),has:(e,n)=>!!R(e,n)||t.has(e,n)}));const me=["continue","continuePrimaryKey","advance"],F={},I=new WeakMap,U=new WeakMap,be={get(t,e){if(!me.includes(e))return t[e];let n=F[e];return n||(n=F[e]=function(...r){I.set(this,U.get(this)[e](...r))}),n}};async function*ge(...t){let e=this;if(e instanceof IDBCursor||(e=await e.openCursor(...t)),!e)return;e=e;const n=new Proxy(e,be);for(U.set(n,e),D.set(n,T(e));e;)yield n,e=await(I.get(n)||e.continue()),I.delete(n)}function V(t,e){return e===Symbol.asyncIterator&&B(t,[IDBIndex,IDBObjectStore,IDBCursor])||e==="iterate"&&B(t,[IDBIndex,IDBObjectStore])}J(t=>({...t,get(e,n,r){return V(e,n)?ge:t.get(e,n,r)},has(e,n){return V(e,n)||t.has(e,n)}}));const pe="zeugnisverwaltung",ke=1,S="aktiverDatensatz",H="aktuell";let x=null;function N(){return x||(x=de(pe,ke,{upgrade(t){t.objectStoreNames.contains(S)||t.createObjectStore(S)}})),x}async function ve(){return await(await N()).get(S,H)??null}async function ye(t){await(await N()).put(S,t,H)}async function we(){await(await N()).delete(S,H)}class Ee{constructor(){z(this,"aktuell",null);z(this,"listeners",new Set);z(this,"geladen",!1)}async init(){this.geladen||(this.aktuell=await ve(),this.geladen=!0,this.notify())}get(){return this.aktuell}subscribe(e){return this.listeners.add(e),e(this.aktuell),()=>this.listeners.delete(e)}notify(){for(const e of this.listeners)e(this.aktuell)}async persist(){this.aktuell&&await ye(this.aktuell),this.notify()}async setzeDatensatz(e){this.aktuell=e,await this.persist()}async schliesseDatensatz(){this.aktuell=null,await we(),this.notify()}async fuegeSchuelerHinzu(e){if(!this.aktuell)throw new Error("Kein aktiver Datensatz");this.aktuell={...this.aktuell,schueler:[...this.aktuell.schueler,e]},await this.persist()}async aktualisiereSchueler(e){if(!this.aktuell)throw new Error("Kein aktiver Datensatz");this.aktuell={...this.aktuell,schueler:this.aktuell.schueler.map(n=>n.id===e.id?e:n)},await this.persist()}async entferneSchueler(e){if(!this.aktuell)throw new Error("Kein aktiver Datensatz");this.aktuell={...this.aktuell,schueler:this.aktuell.schueler.filter(n=>n.id!==e),bewertungen:this.aktuell.bewertungen.filter(n=>n.schuelerId!==e),bewertungstexte:this.aktuell.bewertungstexte.filter(n=>n.schuelerId!==e),bemerkungen:this.aktuell.bemerkungen.filter(n=>n.schuelerId!==e)},await this.persist()}}const f=new Ee,w=["1.1","1.2","2.1","2.2","3.1","3.2","4.1","4.2"];function Se(t){return typeof t=="string"&&w.includes(t)}function W(t,e){return{formatVersion:1,erstelltAm:new Date().toISOString(),halbjahr:t,kompetenzdateiVersion:null,klasse:e,schueler:[],bewertungen:[],bewertungstexte:[],bemerkungen:[]}}function G(t){var s;const e=document.createElement("div");e.className="dropzone",e.innerHTML=`
    <p>${t.beschriftung}</p>
    <p>Datei per Drag &amp; Drop hier ablegen oder</p>
    <button type="button" data-aktion="datei-waehlen">Datei auswählen…</button>
    <input type="file" accept="application/json,.json" class="sr-only" tabindex="-1" aria-hidden="true" />
  `;const n=e.querySelector('input[type="file"]');(s=e.querySelector('[data-aktion="datei-waehlen"]'))==null||s.addEventListener("click",()=>n.click()),n.addEventListener("change",()=>{var a;const i=(a=n.files)==null?void 0:a[0];i&&t.onDatei(i),n.value=""});let r=0;return e.addEventListener("dragenter",i=>{i.preventDefault(),r+=1,e.classList.add("aktiv")}),e.addEventListener("dragover",i=>{i.preventDefault()}),e.addEventListener("dragleave",()=>{r=Math.max(0,r-1),r===0&&e.classList.remove("aktiv")}),e.addEventListener("drop",i=>{var l,o;i.preventDefault(),r=0,e.classList.remove("aktiv");const a=(o=(l=i.dataTransfer)==null?void 0:l.files)==null?void 0:o[0];a&&t.onDatei(a)}),e}function y(t){return typeof t=="string"}function ze(t){const e=[];if(typeof t!="object"||t===null)return{gueltig:!1,fehler:["Die Datei enthält kein gültiges JSON-Objekt."]};const n=t;if(n.formatVersion!==1&&e.push("Unbekannte oder fehlende formatVersion (erwartet: 1)."),Se(n.halbjahr)||e.push(`Ungültiges oder fehlendes Halbjahr: ${String(n.halbjahr)}`),typeof n.klasse!="object"||n.klasse===null)e.push('Feld "klasse" fehlt oder ist ungültig.');else{const r=n.klasse;(!y(r.name)||r.name.trim()==="")&&e.push("Klassenname fehlt."),(!y(r.schuljahr)||r.schuljahr.trim()==="")&&e.push("Schuljahr fehlt.")}if(!Array.isArray(n.schueler))e.push('Feld "schueler" fehlt oder ist kein Array.');else{const r=new Set;n.schueler.forEach((s,i)=>{if(typeof s!="object"||s===null){e.push(`schueler[${i}] ist kein Objekt.`);return}const a=s;!y(a.id)||a.id===""?e.push(`schueler[${i}].id fehlt.`):r.has(a.id)?e.push(`schueler[${i}].id ist doppelt vergeben: ${a.id}`):r.add(a.id),(!y(a.nachname)||a.nachname.trim()==="")&&e.push(`schueler[${i}].nachname fehlt.`),(!y(a.vorname)||a.vorname.trim()==="")&&e.push(`schueler[${i}].vorname fehlt.`),(!y(a.geburtsdatum)||!/^\d{4}-\d{2}-\d{2}$/.test(a.geburtsdatum))&&e.push(`schueler[${i}].geburtsdatum ist ungültig (erwartet yyyy-mm-dd).`),a.geschlecht!=="w"&&a.geschlecht!=="m"&&e.push(`schueler[${i}].geschlecht muss "w" oder "m" sein.`)})}for(const r of["bewertungen","bewertungstexte","bemerkungen"])Array.isArray(n[r])||e.push(`Feld "${r}" fehlt oder ist kein Array.`);return{gueltig:e.length===0,fehler:e}}function De(t){const e=new Date().toISOString().slice(0,10);return`zeugnisdaten_${t.klasse.name.trim().replace(/[^\p{L}\p{N}_-]+/gu,"_")||"klasse"}_${t.halbjahr}_${e}.json`}function C(t){const e=JSON.stringify(t,null,2),n=new Blob([e],{type:"application/json"}),r=URL.createObjectURL(n),s=document.createElement("a");s.href=r,s.download=De(t),document.body.appendChild(s),s.click(),s.remove(),URL.revokeObjectURL(r)}async function Z(t){if(!t.name.toLowerCase().endsWith(".json"))return{erfolgreich:!1,fehler:[`"${t.name}" ist keine JSON-Datei.`]};let e;try{const r=await t.text();e=JSON.parse(r)}catch{return{erfolgreich:!1,fehler:["Die Datei enthält kein gültiges JSON (korrupte Datei)."]}}const n=ze(e);return n.gueltig?{erfolgreich:!0,datensatz:e,fehler:[]}:{erfolgreich:!1,fehler:n.fehler}}function Y(t){return new Promise(e=>{var s,i;const n=document.createElement("dialog");n.setAttribute("aria-labelledby","bestaetigung-titel"),n.innerHTML=`
      <div class="dialog-inhalt">
        <h2 id="bestaetigung-titel">${m(t.titel)}</h2>
        <p>${m(t.beschreibung)}</p>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">${m(t.abbrechenText??"Abbrechen")}</button>
          <button type="button" class="${t.gefahr?"gefahr":""}" data-aktion="bestaetigen">${m(t.bestaetigenText??"Bestätigen")}</button>
        </div>
      </div>
    `,document.body.appendChild(n);const r=a=>{n.close(),n.remove(),e(a)};(s=n.querySelector('[data-aktion="abbrechen"]'))==null||s.addEventListener("click",()=>r(!1)),(i=n.querySelector('[data-aktion="bestaetigen"]'))==null||i.addEventListener("click",()=>r(!0)),n.addEventListener("cancel",()=>r(!1)),n.showModal()})}function m(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Q(t,e){return new Promise(n=>{var i;const r=document.createElement("dialog");r.setAttribute("aria-labelledby","meldung-titel"),r.setAttribute("role","alertdialog"),r.innerHTML=`
      <div class="dialog-inhalt">
        <h2 id="meldung-titel">${m(t)}</h2>
        <ul>${e.map(a=>`<li>${m(a)}</li>`).join("")}</ul>
        <div class="dialog-aktionen">
          <button type="button" data-aktion="ok">OK</button>
        </div>
      </div>
    `,document.body.appendChild(r);const s=()=>{r.close(),r.remove(),n()};(i=r.querySelector('[data-aktion="ok"]'))==null||i.addEventListener("click",s),r.addEventListener("cancel",s),r.showModal()})}function Le(){const t=new Date,e=t.getFullYear(),n=t.getMonth()>=7?e:e-1;return`${n}/${n+1}`}function $e(){const t=document.createElement("div"),e=document.createElement("section");e.className="karte",e.setAttribute("aria-labelledby","neu-titel"),e.innerHTML=`
    <h2 id="neu-titel">Neuen Klassendatensatz anlegen</h2>
    <form novalidate>
      <div class="formularzeile">
        <label for="feld-halbjahr">Halbjahr</label>
        <select id="feld-halbjahr" name="halbjahr" required>
          ${w.map(a=>`<option value="${a}">${a}</option>`).join("")}
        </select>
      </div>
      <div class="formularzeile">
        <label for="feld-klassenname">Klassenname</label>
        <input id="feld-klassenname" name="klassenname" type="text" required placeholder="z. B. 4b" />
      </div>
      <div class="formularzeile">
        <label for="feld-schuljahr">Schuljahr</label>
        <input id="feld-schuljahr" name="schuljahr" type="text" required value="${Le()}" />
      </div>
      <p class="fehler" id="neu-fehler" role="alert"></p>
      <button type="submit">Anlegen</button>
    </form>
    <p><small>Das Halbjahr bestimmt die zu ladende Kompetenzdatei und ist nachträglich nicht änderbar.</small></p>
  `;const n=document.createElement("section");n.className="karte",n.setAttribute("aria-labelledby","import-titel"),n.innerHTML='<h2 id="import-titel">Bestehenden Datensatz öffnen</h2>';const r=G({beschriftung:"JSON-Export eines zuvor gesicherten Klassendatensatzes importieren.",onDatei:async a=>{const l=await Z(a);if(!l.erfolgreich||!l.datensatz){await Q(`"${a.name}" konnte nicht importiert werden`,l.fehler);return}await f.setzeDatensatz(l.datensatz)}});n.appendChild(r),t.append(e,n);const s=e.querySelector("form"),i=e.querySelector("#neu-fehler");return s.addEventListener("submit",async a=>{a.preventDefault();const l=new FormData(s),o=String(l.get("halbjahr")),d=String(l.get("klassenname")??"").trim(),u=String(l.get("schuljahr")??"").trim();if(!d||!u){i.textContent="Bitte Klassenname und Schuljahr angeben.";return}const c=W(o,{name:d,schuljahr:u});await f.setzeDatensatz(c)}),t}function _(t){return new Promise(e=>{var l,o;const n=t!==null,r=document.createElement("dialog");r.setAttribute("aria-labelledby","schueler-dialog-titel"),r.innerHTML=`
      <form method="dialog" class="dialog-inhalt" novalidate>
        <h2 id="schueler-dialog-titel">${n?"Schüler:in bearbeiten":"Schüler:in hinzufügen"}</h2>
        <div class="formularzeile">
          <label for="feld-nachname">Nachname</label>
          <input id="feld-nachname" name="nachname" type="text" required value="${m((t==null?void 0:t.nachname)??"")}" />
        </div>
        <div class="formularzeile">
          <label for="feld-vorname">Vorname</label>
          <input id="feld-vorname" name="vorname" type="text" required value="${m((t==null?void 0:t.vorname)??"")}" />
        </div>
        <div class="formularzeile">
          <label for="feld-geburtsdatum">Geburtsdatum</label>
          <input id="feld-geburtsdatum" name="geburtsdatum" type="date" required value="${m((t==null?void 0:t.geburtsdatum)??"")}" />
        </div>
        <div class="formularzeile">
          <label for="feld-geschlecht">Geschlecht</label>
          <select id="feld-geschlecht" name="geschlecht" required>
            <option value="w" ${(t==null?void 0:t.geschlecht)==="w"?"selected":""}>weiblich</option>
            <option value="m" ${(t==null?void 0:t.geschlecht)==="m"?"selected":""}>männlich</option>
          </select>
        </div>
        <p id="schueler-dialog-fehler" class="fehler" role="alert"></p>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">Abbrechen</button>
          <button type="submit" data-aktion="speichern">Speichern</button>
        </div>
      </form>
    `,document.body.appendChild(r);const s=d=>{r.close(),r.remove(),e(d)},i=r.querySelector("form"),a=r.querySelector("#schueler-dialog-fehler");(l=r.querySelector('[data-aktion="abbrechen"]'))==null||l.addEventListener("click",()=>s(null)),r.addEventListener("cancel",()=>s(null)),i.addEventListener("submit",d=>{d.preventDefault();const u=new FormData(i),c=String(u.get("nachname")??"").trim(),b=String(u.get("vorname")??"").trim(),g=String(u.get("geburtsdatum")??""),h=String(u.get("geschlecht")??"");if(!c||!b||!g){a.textContent="Bitte alle Felder ausfüllen.";return}const p={id:(t==null?void 0:t.id)??crypto.randomUUID(),nachname:c,vorname:b,geburtsdatum:g,geschlecht:h};s(p)}),r.showModal(),(o=r.querySelector("#feld-nachname"))==null||o.focus()})}const je=[{schluessel:"nachname",label:"Nachname"},{schluessel:"vorname",label:"Vorname"},{schluessel:"geburtsdatum",label:"Geburtsdatum"},{schluessel:"geschlecht",label:"Geschlecht"}];function Ae(){var d;const t=document.createElement("section");t.className="karte",t.setAttribute("aria-labelledby","klassenliste-titel");let e="nachname",n=!0,r="";t.innerHTML=`
    <h2 id="klassenliste-titel">Klassenliste</h2>
    <div class="tabellen-werkzeuge">
      <label class="sr-only" for="schueler-filter">Klassenliste nach Name filtern</label>
      <input id="schueler-filter" type="text" placeholder="Nach Name filtern…" />
      <button type="button" data-aktion="hinzufuegen">+ Schüler:in hinzufügen</button>
    </div>
    <div data-bereich="tabelle"></div>
  `;const s=t.querySelector("#schueler-filter"),i=t.querySelector('[data-bereich="tabelle"]');function a(u,c){const b=e===u;return`<th scope="col" aria-sort="${b?n?"ascending":"descending":"none"}"><button type="button" data-sort="${u}">${c}<span aria-hidden="true">${b?n?" ▲":" ▼":""}</span></button></th>`}function l(u){const c=`${m(u.vorname)} ${m(u.nachname)}`;return`
      <tr>
        <td>${m(u.nachname)}</td>
        <td>${m(u.vorname)}</td>
        <td>${xe(u.geburtsdatum)}</td>
        <td>${u.geschlecht==="w"?"weiblich":"männlich"}</td>
        <td>
          <button type="button" class="sekundaer" data-bearbeiten="${u.id}">Bearbeiten<span class="sr-only"> ${c}</span></button>
          <button type="button" class="gefahr" data-loeschen="${u.id}">Löschen<span class="sr-only"> ${c}</span></button>
        </td>
      </tr>
    `}function o(){const u=f.get();if(!u){i.innerHTML="";return}const c=r.trim().toLowerCase(),g=[...u.schueler.filter(h=>c===""||h.vorname.toLowerCase().includes(c)||h.nachname.toLowerCase().includes(c))].sort((h,p)=>{const k=h[e].localeCompare(p[e],"de");return n?k:-k});if(u.schueler.length===0){i.innerHTML='<p class="leerzustand">Noch keine Schüler:innen angelegt.</p>';return}if(g.length===0){i.innerHTML='<p class="leerzustand">Kein Treffer für den Filter.</p>';return}i.innerHTML=`
      <table class="schuelerliste">
        <caption class="sr-only">Klassenliste, sortiert nach ${e}, ${n?"aufsteigend":"absteigend"}</caption>
        <thead>
          <tr>
            ${je.map(h=>a(h.schluessel,h.label)).join("")}
            <th scope="col"><span class="sr-only">Aktionen</span></th>
          </tr>
        </thead>
        <tbody>${g.map(l).join("")}</tbody>
      </table>
    `,i.querySelectorAll("button[data-sort]").forEach(h=>{h.addEventListener("click",()=>{const p=h.dataset.sort;e===p?n=!n:(e=p,n=!0),o()})}),i.querySelectorAll("button[data-bearbeiten]").forEach(h=>{h.addEventListener("click",async()=>{var E;const p=h.dataset.bearbeiten,k=((E=f.get())==null?void 0:E.schueler.find($=>$.id===p))??null;if(!k)return;const L=await _(k);L&&await f.aktualisiereSchueler(L)})}),i.querySelectorAll("button[data-loeschen]").forEach(h=>{h.addEventListener("click",async()=>{var E;const p=h.dataset.loeschen,k=(E=f.get())==null?void 0:E.schueler.find($=>$.id===p);if(!k)return;await Y({titel:"Schüler:in löschen",beschreibung:`Sollen ${k.vorname} ${k.nachname} sowie alle zugehörigen Bewertungen, Texte und Bemerkungen unwiderruflich aus diesem Datensatz entfernt werden?`,bestaetigenText:"Löschen",gefahr:!0})&&await f.entferneSchueler(p)})})}return s.addEventListener("input",()=>{r=s.value,o()}),(d=t.querySelector('[data-aktion="hinzufuegen"]'))==null||d.addEventListener("click",async()=>{const u=await _(null);u&&await f.fuegeSchuelerHinzu(u)}),f.subscribe(()=>o()),t}function xe(t){const[e,n,r]=t.split("-");return!e||!n||!r?t:`${r}.${n}.${e}`}function Be(t){const e=w.indexOf(t);return w[(e+1)%w.length]}function Me(t){return new Promise(e=>{var a,l;const n=document.createElement("dialog");n.setAttribute("aria-labelledby","wechsel-dialog-titel");const r=w.map(o=>`<option value="${o}" ${o===Be(t.halbjahr)?"selected":""}>${o}</option>`).join("");n.innerHTML=`
      <form method="dialog" class="dialog-inhalt" novalidate>
        <h2 id="wechsel-dialog-titel">Halbjahreswechsel</h2>
        <p>
          Übernimmt die ${t.schueler.length} Schüler:innen der Klasse „${m(t.klasse.name)}"
          als Stammdaten in einen neuen, leeren Datensatz. Bewertungen, Texte und Bemerkungen
          werden <strong>nicht</strong> übernommen, da sie halbjahresspezifisch sind.
        </p>
        <p><strong>Hinweis:</strong> Der aktuell aktive Datensatz wird dabei ersetzt. Exportiere ihn vorher, falls du ihn als Backup behalten möchtest.</p>
        <div class="formularzeile">
          <label for="feld-ziel-halbjahr">Ziel-Halbjahr</label>
          <select id="feld-ziel-halbjahr" name="halbjahr">${r}</select>
        </div>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="export-zuerst">Aktuellen Datensatz zuerst exportieren</button>
        </div>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">Abbrechen</button>
          <button type="submit" data-aktion="uebernehmen">Übernehmen</button>
        </div>
      </form>
    `,document.body.appendChild(n);const s=o=>{n.close(),n.remove(),e(o)};(a=n.querySelector('[data-aktion="abbrechen"]'))==null||a.addEventListener("click",()=>s(null)),n.addEventListener("cancel",()=>s(null)),(l=n.querySelector('[data-aktion="export-zuerst"]'))==null||l.addEventListener("click",()=>{C(t)}),n.querySelector("form").addEventListener("submit",o=>{o.preventDefault();const d=n.querySelector("#feld-ziel-halbjahr").value,u=W(d,{...t.klasse});u.schueler=t.schueler.map(c=>({...c})),s(u)}),n.showModal()})}function Oe(){var o,d,u;const t=document.createElement("div"),e=document.createElement("header");e.className="kopfzeile";const n=document.createElement("div");n.className="aktionsleiste",n.innerHTML=`
    <button type="button" data-aktion="export">Als JSON exportieren</button>
    <button type="button" class="sekundaer" data-aktion="halbjahreswechsel">Halbjahreswechsel…</button>
    <button type="button" class="sekundaer" data-aktion="schliessen">Datensatz schließen</button>
  `;const r=document.createElement("section");r.className="karte",r.setAttribute("aria-labelledby","ersetzen-titel"),r.innerHTML='<h2 id="ersetzen-titel">Anderen Datensatz laden</h2>';const s=G({beschriftung:"Ersetzt den aktuell aktiven Datensatz durch eine importierte JSON-Datei.",onDatei:c=>l(c)});r.appendChild(s);const i=Ae();t.append(e,n,i,r);function a(c){e.innerHTML=`
      <h1>${m(c.klasse.name)} — Halbjahr ${m(c.halbjahr)}</h1>
      <p>Schuljahr ${m(c.klasse.schuljahr)} · ${c.schueler.length} Schüler:in(nen)</p>
    `}async function l(c){var h;const b=await Z(c);if(!b.erfolgreich||!b.datensatz){await Q(`"${c.name}" konnte nicht importiert werden`,b.fehler);return}await Y({titel:"Aktuellen Datensatz ersetzen?",beschreibung:`Der aktive Datensatz „${((h=f.get())==null?void 0:h.klasse.name)??""}" wird durch „${b.datensatz.klasse.name}" (Halbjahr ${b.datensatz.halbjahr}) ersetzt. Nicht exportierte Änderungen im aktuellen Datensatz gehen dabei nicht verloren (bleiben bis zum nächsten Überschreiben in der lokalen Datenbank), werden aber aus der Ansicht entfernt.`,bestaetigenText:"Ersetzen",gefahr:!0})&&await f.setzeDatensatz(b.datensatz)}return(o=n.querySelector('[data-aktion="export"]'))==null||o.addEventListener("click",()=>{const c=f.get();c&&C(c)}),(d=n.querySelector('[data-aktion="schliessen"]'))==null||d.addEventListener("click",async()=>{const c=f.get();if(!c)return;await Te(c)&&await f.schliesseDatensatz()}),(u=n.querySelector('[data-aktion="halbjahreswechsel"]'))==null||u.addEventListener("click",async()=>{const c=f.get();if(!c)return;const b=await Me(c);b&&await f.setzeDatensatz(b)}),f.subscribe(c=>{c&&a(c)}),t}function Te(t){return new Promise(e=>{var s,i,a;const n=document.createElement("dialog");n.setAttribute("aria-labelledby","schliessen-titel"),n.innerHTML=`
      <div class="dialog-inhalt">
        <h2 id="schliessen-titel">Datensatz schließen</h2>
        <p>
          „${m(t.klasse.name)}" (Halbjahr ${m(t.halbjahr)}) wird
          <strong>endgültig aus der lokalen Datenbank entfernt</strong>. Ohne vorherigen JSON-Export
          sind alle Daten danach unwiederbringlich verloren.
        </p>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="export-zuerst">Zuerst als JSON exportieren</button>
        </div>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">Abbrechen</button>
          <button type="button" class="gefahr" data-aktion="schliessen">Endgültig schließen</button>
        </div>
      </div>
    `,document.body.appendChild(n);const r=l=>{n.close(),n.remove(),e(l)};(s=n.querySelector('[data-aktion="export-zuerst"]'))==null||s.addEventListener("click",()=>{C(t)}),(i=n.querySelector('[data-aktion="abbrechen"]'))==null||i.addEventListener("click",()=>r(!1)),(a=n.querySelector('[data-aktion="schliessen"]'))==null||a.addEventListener("click",()=>r(!0)),n.addEventListener("cancel",()=>r(!1)),n.showModal()})}function Ie(){const t=document.createElement("div"),e=document.createElement("header");e.className="kopfzeile",e.innerHTML="<h1>Zeugnisverwaltung</h1>";const n=document.createElement("p");n.className="datenschutz-hinweis",n.textContent="Alle Schülerdaten verbleiben ausschließlich in deinem Browser (IndexedDB). Es findet keine Übertragung an einen Server statt. Exportiere regelmäßig als JSON, um ein Backup zu haben.";const r=document.createElement("main");t.append(e,n,r);let s=null;return f.subscribe(i=>{const a=i?"klasse":"start";a!==s&&(s=a,r.replaceChildren(a==="klasse"?Oe():$e()))}),t}const X=document.querySelector("#app");if(!X)throw new Error("#app-Element nicht gefunden");X.appendChild(Ie());f.init();"serviceWorker"in navigator&&ae(async()=>{const{registerSW:t}=await import("./virtual_pwa-register-B8qM4qFP.js");return{registerSW:t}},[],import.meta.url).then(({registerSW:t})=>t({immediate:!0})).catch(()=>{});export{ae as _};
