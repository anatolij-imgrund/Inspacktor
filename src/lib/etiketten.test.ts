import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { escapeHtml, etikettenHtml, pdfDateiname, teileInSeiten } from './etiketten';

const kiste = (code: string, titel = 'Deko', standort = 'Dach') => ({ code, titel, standort });

describe('Etiketten', () => {
  it('maskiert HTML in Titel und Standort', () => {
    const html = etikettenHtml([kiste('ABC234', '<b>Deko</b> & "mehr"', "O'Brien")], 'klein');
    assert.ok(html.includes('&lt;b&gt;Deko&lt;/b&gt; &amp; &quot;mehr&quot;'));
    assert.ok(html.includes('O&#39;Brien'));
    assert.ok(!html.includes('<b>Deko</b>'));
  });

  it('teilt kleine Etiketten zu je 10 und große zu je 2 auf eine Seite', () => {
    const elf = Array.from({ length: 11 }, (_, i) => kiste(`AAAAA${'ABCDEFGHJKM'[i]}`));
    assert.equal(etikettenHtml(elf, 'klein').match(/<section /g)?.length, 2);
    assert.equal(etikettenHtml(elf, 'gross').match(/<section /g)?.length, 6);
    assert.equal(etikettenHtml(elf, 'klein').match(/class="etikett"/g)?.length, 11);
  });

  it('zeigt den Code lesbar und lässt einen leeren Standort weg', () => {
    const html = etikettenHtml([kiste('K7QF3M', 'Werkzeug', '')], 'gross');
    assert.ok(html.includes('K7Q F3M'));
    assert.ok(!html.includes('class="standort"'));
  });

  it('teilt Listen in Seiten', () => {
    assert.deepEqual(teileInSeiten([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    assert.deepEqual(teileInSeiten([], 2), []);
  });

  it('maskiert alle gefährlichen Zeichen', () => {
    assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
  });

  it('baut sichere Dateinamen', () => {
    assert.equal(pdfDateiname([kiste('K7QF3M', 'Größe: Übergröße / Winter!')]), 'Etikett-Groesse-Uebergroesse-Winter-K7QF3M.pdf');
    assert.equal(pdfDateiname([kiste('K7QF3M', '!!!')]), 'Etikett-K7QF3M.pdf');
    assert.equal(pdfDateiname([kiste('AAAAAA'), kiste('BBBBBB')]), 'Etiketten-2-Kisten.pdf');
  });
});
