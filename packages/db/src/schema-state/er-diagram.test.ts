/**
 * `er-diagram.ts` — TÜRETME KURALLARININ SÖZLEŞMESİ.
 *
 * ⚠️ **Bu bir "import testi" değil** (ROADMAP Faz 3'ün dürüstlük notu):
 * `renderErDiagram` saf bir fonksiyon ve çıktısı **belgeye yazılıyor**. Buradaki
 * her `expect`, entegrasyon testinin gerçek katalogla karşılaştıracağı metnin
 * hangi kuraldan çıktığını sabitliyor — kural değişirse burası kırılır, yani
 * değişiklik kasıtlı olmak zorunda.
 *
 * İş bölümü:
 * - **burada**: türetme kuralları (kardinalite, anahtar işareti, tip adı) —
 *   konteyner açmadan, her dallanma ayrı ayrı
 * - **`integration/er-diagram.itest.ts`**: gerçek PG18 katalogu ile belgedeki
 *   metnin birebir aynı olması + tablo/FK sayısının mutlak iddiası
 */
import { describe, expect, it } from 'vitest';

import {
  countErDiagram,
  extractMermaidBlock,
  mermaidTypeName,
  renderErDiagram,
} from './er-diagram.js';
import type { ColumnFacts, ConstraintFacts, SchemaFacts, TableFacts } from './types.js';

function column(name: string, position: number, overrides: Partial<ColumnFacts> = {}): ColumnFacts {
  return {
    name,
    position,
    dataType: 'text',
    maxLength: null,
    numericPrecision: null,
    numericScale: null,
    nullable: false,
    columnDefault: null,
    ...overrides,
  };
}

function constraint(name: string, type: string, definition: string): ConstraintFacts {
  return { name, type, definition };
}

function table(
  name: string,
  columns: readonly ColumnFacts[],
  constraints: readonly ConstraintFacts[],
): TableFacts {
  return { name, columns, constraints, indexes: [] };
}

function schema(...tables: readonly TableFacts[]): SchemaFacts {
  return { tables, sequences: [] };
}

/** İki tablo, tek FK — çıktının TAMAMI iddia ediliyor, parçası değil. */
const minimalSchema = schema(
  table(
    'countries',
    [column('id', 1, { dataType: 'integer' }), column('key', 2)],
    [
      constraint('countries_pkey', 'p', 'PRIMARY KEY (id)'),
      constraint('countries_key_unique', 'u', 'UNIQUE (key)'),
    ],
  ),
  table(
    'competitions',
    [
      column('id', 1, { dataType: 'integer' }),
      column('country_id', 2, { dataType: 'integer', nullable: true }),
    ],
    [
      constraint('competitions_pkey', 'p', 'PRIMARY KEY (id)'),
      constraint(
        'competitions_country_id_countries_id_fk',
        'f',
        'FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE RESTRICT',
      ),
    ],
  ),
);

describe('renderErDiagram', () => {
  it('çıktının TAMAMI sabit — ilişkiler önce, varlıklar ada göre sıralı', () => {
    expect(renderErDiagram(minimalSchema)).toBe(
      [
        'erDiagram',
        '    countries |o--o{ competitions : "country_id"',
        '',
        '    competitions {',
        '        integer id PK',
        '        integer country_id FK "null"',
        '    }',
        '',
        '    countries {',
        '        integer id PK',
        '        text key UK',
        '    }',
      ].join('\n'),
    );
  });

  /**
   * ⚠️ Kardinalitenin iki ucu **iki ayrı olgudan** çıkıyor ve dördü de ayrı
   * sınanıyor: yalnızca biri sınansaydı diğerinin sabit yazılmış olması fark
   * edilmezdi (D3 — kapı bakıyor gibi görünür, bakmıyordur).
   */
  it('sol uç: FK NOT NULL ise `||`, nullable ise `|o`', () => {
    const notNullSide = schema(
      table('parent', [column('id', 1)], [constraint('parent_pkey', 'p', 'PRIMARY KEY (id)')]),
      table(
        'child',
        [column('id', 1), column('parent_id', 2)],
        [
          constraint('child_pkey', 'p', 'PRIMARY KEY (id)'),
          constraint('child_fk', 'f', 'FOREIGN KEY (parent_id) REFERENCES parent(id)'),
        ],
      ),
    );

    expect(renderErDiagram(notNullSide)).toContain('    parent ||--o{ child : "parent_id"');
    expect(renderErDiagram(minimalSchema)).toContain('    countries |o--o{ competitions');
  });

  it('sağ uç: FK sütunları PK`yi TAM kaplıyorsa 1:1 → `o|`', () => {
    const oneToOne = schema(
      table('clubs', [column('id', 1)], [constraint('clubs_pkey', 'p', 'PRIMARY KEY (id)')]),
      table(
        'club_facilities',
        [column('club_id', 1)],
        [
          constraint('club_facilities_pkey', 'p', 'PRIMARY KEY (club_id)'),
          constraint('club_facilities_fk', 'f', 'FOREIGN KEY (club_id) REFERENCES clubs(id)'),
        ],
      ),
    );

    expect(renderErDiagram(oneToOne)).toContain('    clubs ||--o| club_facilities : "club_id"');
  });

  it('sağ uç: ÇOK sütunlu UNIQUE`in bir parçası olan FK 1:1 DEĞİL → `o{`', () => {
    const partialCover = schema(
      table('clubs', [column('id', 1)], [constraint('clubs_pkey', 'p', 'PRIMARY KEY (id)')]),
      table(
        'club_kits',
        [column('id', 1), column('club_id', 2), column('kit_type', 3)],
        [
          constraint('club_kits_pkey', 'p', 'PRIMARY KEY (id)'),
          constraint('club_kits_club_id_kit_type_unique', 'u', 'UNIQUE (club_id, kit_type)'),
          constraint('club_kits_fk', 'f', 'FOREIGN KEY (club_id) REFERENCES clubs(id)'),
        ],
      ),
    );

    const diagram = renderErDiagram(partialCover);
    expect(diagram).toContain('    clubs ||--o{ club_kits : "club_id"');
    // Sütun başına `UK` YAZILMIYOR: "club_id tek başına benzersiz" yanlış olurdu.
    expect(diagram).toContain('        text club_id FK "uq:club_id+kit_type"');
    expect(diagram).not.toContain('club_id FK,UK');
  });

  it('aynı tabloya İKİ FK iki AYRI ilişki satırı üretiyor', () => {
    const twoEdges = schema(
      table('clubs', [column('id', 1)], [constraint('clubs_pkey', 'p', 'PRIMARY KEY (id)')]),
      table(
        'rivalries',
        [column('id', 1), column('club_a_id', 2), column('club_b_id', 3)],
        [
          constraint('rivalries_pkey', 'p', 'PRIMARY KEY (id)'),
          constraint('rivalries_a_fk', 'f', 'FOREIGN KEY (club_a_id) REFERENCES clubs(id)'),
          constraint('rivalries_b_fk', 'f', 'FOREIGN KEY (club_b_id) REFERENCES clubs(id)'),
        ],
      ),
    );

    const counts = countErDiagram(renderErDiagram(twoEdges));
    expect(counts).toEqual({ entities: 2, relationships: 2 });
  });

  it('tek sütunlu UNIQUE `UK`, birincil anahtar `PK`, ikisi birden `PK,FK`', () => {
    const marked = schema(
      table('parent', [column('id', 1)], [constraint('parent_pkey', 'p', 'PRIMARY KEY (id)')]),
      table(
        'child',
        [column('parent_id', 1), column('slug', 2)],
        [
          constraint('child_pkey', 'p', 'PRIMARY KEY (parent_id)'),
          constraint('child_slug_unique', 'u', 'UNIQUE (slug)'),
          constraint('child_fk', 'f', 'FOREIGN KEY (parent_id) REFERENCES parent(id)'),
        ],
      ),
    );

    const diagram = renderErDiagram(marked);
    expect(diagram).toContain('        text parent_id PK,FK');
    expect(diagram).toContain('        text slug UK');
  });

  /**
   * Ayrıştırılamayan bir kısıt SESSİZCE ATLANMIYOR. Atlansaydı diyagram bir FK
   * eksik çizilir ve sayı karşılaştırması da o eksikle **tutarlı** olurdu —
   * yani hiçbir şey ötmezdi (SAPMA-024 sınıfı).
   */
  it('beklenmeyen FOREIGN KEY biçimi FIRLATIR, sessizce atlanmaz', () => {
    const broken = schema(
      table(
        'weird',
        [column('id', 1)],
        [constraint('weird_fk', 'f', 'FOREIGN KEY beklenmeyen biçim')],
      ),
    );

    expect(() => renderErDiagram(broken)).toThrow(/ayrıştırılamadı/);
  });

  it('beklenmeyen PRIMARY KEY biçimi FIRLATIR', () => {
    const broken = schema(
      table('weird', [column('id', 1)], [constraint('weird_pkey', 'p', 'PRIMARY KEY beklenmeyen')]),
    );

    expect(() => renderErDiagram(broken)).toThrow(/PRIMARY KEY kısıt tanımı ayrıştırılamadı/);
  });

  it('beklenmeyen UNIQUE biçimi FIRLATIR', () => {
    // `UNIQUE NULLS NOT DISTINCT (...)` gibi bir biçim bugün üretilmiyor; ortaya
    // çıkarsa sessizce `UK` düşmesin diye kapı burada.
    const broken = schema(
      table(
        'weird',
        [column('id', 1)],
        [constraint('weird_unique', 'u', 'UNIQUE NULLS NOT DISTINCT (id)')],
      ),
    );

    expect(() => renderErDiagram(broken)).toThrow(/UNIQUE kısıt tanımı ayrıştırılamadı/);
  });
});

describe('mermaidTypeName', () => {
  it('boşluklu PostgreSQL tipleri tek parçaya iniyor', () => {
    expect(mermaidTypeName(column('created_at', 1, { dataType: 'timestamp with time zone' }))).toBe(
      'timestamp_with_time_zone',
    );
  });

  it('uzunluk taşıyan tipler uzunluğu sonuna alıyor', () => {
    expect(
      mermaidTypeName(column('code', 1, { dataType: 'character varying', maxLength: '3' })),
    ).toBe('character_varying_3');
  });

  it('kısaltma TABLOSU yok — bilinmeyen bir tip de güvenli bir ad üretiyor', () => {
    // Faz 4 yeni tipler getirecek; eşleme listesi olsaydı burası sessizce bozulurdu.
    expect(mermaidTypeName(column('span', 1, { dataType: 'interval year to month' }))).toBe(
      'interval_year_to_month',
    );
  });
});

describe('extractMermaidBlock', () => {
  const document = ['# Başlık', '', '```mermaid', 'erDiagram', '    a {', '    }', '```', ''].join(
    '\n',
  );

  it('tek bloğu çıkarıyor', () => {
    expect(extractMermaidBlock(document)).toBe(['erDiagram', '    a {', '    }'].join('\n'));
  });

  it('blok YOKSA fırlatıyor — boş metinle karşılaştırma sessiz bir yeşil olurdu', () => {
    expect(() => extractMermaidBlock('# Diyagramsız belge')).toThrow(/bir mermaid bloğu/);
  });

  it('İKİ blok varsa fırlatıyor — hangisi olduğu belirsiz kalırdı', () => {
    expect(() => extractMermaidBlock(`${document}\n${document}`)).toThrow(/2 bulundu/);
  });

  it('kapanmamış blok fırlatıyor', () => {
    expect(() => extractMermaidBlock('```mermaid\nerDiagram')).toThrow(/kapatılmamış/);
  });
});

describe('countErDiagram', () => {
  const diagram = renderErDiagram(minimalSchema);

  it('gerçek diyagramda iki varlık, bir ilişki sayıyor', () => {
    expect(countErDiagram(diagram)).toEqual({ entities: 2, relationships: 1 });
  });

  /**
   * ⚠️ **NÖBETÇİNİN KENDİ NEGATİF TESTİ.** Karar ①'in şartı: *"diyagramdan bir
   * tablo sil → test kırılmalı"*. Entegrasyon testi bunu gerçek belgeyle
   * yapıyor; burada aynı iddia **kalıcı** hâle getiriliyor, çünkü elle yapılan
   * bir mutasyon bir kez ölçülür ve bir daha koşmaz.
   */
  it('diyagramdan bir varlık silinince sayı DÜŞÜYOR', () => {
    const withoutCountries = diagram
      .split('\n')
      .filter((line) => !/^ {4}countries \{$/.test(line))
      .join('\n');

    expect(countErDiagram(withoutCountries)).toEqual({ entities: 1, relationships: 1 });
  });

  it('diyagramdan bir ilişki silinince sayı DÜŞÜYOR', () => {
    const withoutEdge = diagram
      .split('\n')
      .filter((line) => !line.includes('--'))
      .join('\n');

    expect(countErDiagram(withoutEdge)).toEqual({ entities: 2, relationships: 0 });
  });

  it('yorum satırı ve düz metin sayılmıyor', () => {
    expect(countErDiagram('erDiagram\n%% a ||--o{ b : "x"\nrastgele metin')).toEqual({
      entities: 0,
      relationships: 0,
    });
  });
});
