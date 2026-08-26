/**
 * Koşucunun veritabanıyla konuştuğu DAR yüzey.
 *
 * **Neden bir arayüz var:** koşucunun mantığı (sıra, boşluk denetimi, kayıp kararı)
 * birim testlerinde sahte bir çalıştırıcıyla sınanabilsin diye. Ama sahte bir
 * çalıştırıcı **hiçbir şey kanıtlamaz** — Faz 2 §5 D5'in üç örneğinden biri tam
 * olarak buydu (*"sahte `fetch` `headers` taşımıyordu"*). Bu yüzden aynı sözleşme
 * `testcontainers` ile **gerçek Postgres'e karşı** da koşulur
 * (`packages/db/integration/`), ve iki koşum yerini asla değiştirmez:
 *
 *   birim testi  → dallanmaları kapsar (koşucu doğru KARARI veriyor mu)
 *   entegrasyon  → sözleşmeyi kapsar   (Postgres gerçekten öyle mi DAVRANIYOR)
 *
 * Yüzey bilerek dar: `run`, `rows`, `transaction`. Sürücüye özgü hiçbir şey
 * sızmıyor, böylece `postgres.js` bir gün `pg` ile değiştirilirse koşucu
 * değişmez (3.2a sürücü kararının geri dönüş maliyetini düşük tutan şey bu).
 */

export interface SqlExecutor {
  /** Sonucu kullanılmayan SQL — birden çok ifade içerebilir. */
  run(sql: string): Promise<void>;
  /** Satır döndüren SQL. */
  rows<T>(sql: string): Promise<readonly T[]>;
  /**
   * Verilen işi tek bir işlem içinde çalıştırır.
   *
   * Geri çağrı fırlatırsa işlem **geri alınır** ve hata yeniden fırlatılır.
   * Kuru çalıştırma bu davranışın üstüne kurulur: iş biter, sonra bilerek
   * `RollbackSignal` fırlatılır.
   */
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

/**
 * Bir işlemi başarıyla tamamladıktan SONRA geri almak için kullanılan sinyal.
 *
 * Postgres'te DDL işlemseldir; kuru çalıştırma bundan yararlanır: geri alma
 * gerçekten uygulanır, etkisi ölçülür, sonra bu sinyalle işlem geri alınır.
 * Hiçbir şey kalıcı olmaz ama rapor **gerçek** veriye dayanır.
 *
 * `Error`dan türüyor çünkü tek taşınabilir iptal mekanizması fırlatmak; ama
 * `AppError` DEĞİL — bir hata değil, akış kontrolü. `AppError` olsaydı
 * exception filter'a ve Sentry'ye giden bir sınıfa karışırdı (Faz 2 §5 **D4**:
 * bir sınıflandırma bağlamdan bağımsız değildir).
 */
export class RollbackSignal extends Error {
  public constructor() {
    super('Kuru çalıştırma: işlem bilerek geri alındı');
    this.name = 'RollbackSignal';
  }
}

export function isRollbackSignal(value: unknown): value is RollbackSignal {
  return value instanceof RollbackSignal;
}
