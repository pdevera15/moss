import { getDb } from '$lib/db'
import { notes } from '$lib/db/schema'
import { embedNote } from '$lib/stores/search.svelte'

const JAPANESE_NOTES = [
  {
    title: '東京旅行の計画',
    body: `来月、東京に旅行する予定です。\n\n## 行きたい場所\n\n- 浅草寺と仲見世通り\n- 渋谷のスクランブル交差点\n- 新宿御苑で花見\n- 秋葉原で電子部品を探す\n\n## 食べたいもの\n\n- 築地市場で新鮮なお寿司\n- 新宿の老舗ラーメン店\n- 原宿のクレープ\n\n予算は一週間で10万円くらいを予定しています。ホテルは新宿か渋谷に取りたいと思います。\n\n#旅行 #東京 #計画`,
  },
  {
    title: 'パスタのカルボナーラレシピ',
    body: `## 材料（2人分）\n\n- スパゲッティ 200g\n- パンチェッタ（またはベーコン）100g\n- 卵黄 3個\n- パルミジャーノ・レッジャーノ 50g\n- 黒こしょう 適量\n- 塩 適量\n\n## 作り方\n\n1. 大きな鍋に湯を沸かし、塩を加えてパスタを茹でる\n2. フライパンでパンチェッタをカリカリになるまで炒める\n3. ボウルに卵黄とチーズを混ぜ、黒こしょうをたっぷり加える\n4. 茹であがったパスタをフライパンに移し、火を止める\n5. 卵液を加えて素早く混ぜ、余熱でソースを仕上げる\n\n**ポイント：** 卵が固まらないように火加減に注意すること。\n\n#料理 #レシピ #イタリアン`,
  },
  {
    title: 'TypeScriptでの非同期処理まとめ',
    body: `## async/await の基本\n\n非同期処理をシンプルに書くための構文。Promiseをベースにしている。\n\n\`\`\`typescript\nasync function fetchUser(id: string): Promise<User> {\n  const response = await fetch(\`/api/users/\${id}\`)\n  if (!response.ok) throw new Error('ユーザーが見つかりません')\n  return response.json()\n}\n\`\`\`\n\n## エラーハンドリング\n\ntry/catchで例外を捕捉する。複数の非同期処理を並行して実行する場合は\`Promise.all\`を使う。\n\n\`\`\`typescript\nconst [user, posts] = await Promise.all([\n  fetchUser(id),\n  fetchPosts(id),\n])\n\`\`\`\n\n## 注意点\n\n- awaitはasync関数の中でしか使えない\n- エラーが伝播しないように必ずcatchする\n- ループ内でawaitを使う場合はパフォーマンスに注意\n\n#プログラミング #TypeScript #非同期`,
  },
  {
    title: '日本語学習のコツ',
    body: `## 効果的な学習方法\n\n日本語を上達させるために実践していること。\n\n### 毎日やること\n\n- Ankiで単語を20個復習する\n- NHKのニュースを10分聞く\n- 日記を日本語で書く（100文字以上）\n\n### 週に一度\n\n- 日本語のネイティブスピーカーとオンラインで会話練習\n- 好きなアニメを字幕なしで見る\n\n## 文法で難しいと感じるところ\n\n- 敬語（尊敬語・謙譲語・丁寧語）の使い分け\n- 助詞「は」と「が」の違い\n- 動詞の活用形（て形、た形、ば形など）\n\n継続が一番大切。毎日少しずつでも続けることが上達への近道。\n\n#語学 #日本語 #勉強法`,
  },
  {
    title: '読んだ本のメモ：「1Q84」村上春樹',
    body: `## あらすじ（ネタバレあり）\n\n1984年の東京を舞台に、二つの月が浮かぶ並行世界「1Q84」を描いた長編小説。青豆（あおまめ）と天吾という二人の主人公の物語が交互に語られる。\n\n## 印象に残った点\n\n- 現実と虚構の境界線が曖昧になる独特の世界観\n- リトル・ピープルという謎の存在の不気味さ\n- 二人が再会するラストシーンの美しさ\n\n## 好きな一節\n\n「もし神が存在するとすれば、その姿は我々の想像をはるかに超えたところにあるはずだ」\n\n## 感想\n\n読み終えるのに2週間かかったが、とても充実した読書体験だった。村上春樹の文体は翻訳でも独特の雰囲気があるが、やはり日本語で読むのが一番良い。\n\n#読書 #小説 #村上春樹`,
  },
  {
    title: '自宅での筋トレルーティン',
    body: `## 週3回のトレーニングメニュー\n\nジムに行かずに自宅でできるワークアウト。器具なしでOK。\n\n### 月・水・金\n\n**上半身**\n- 腕立て伏せ：3セット×15回\n- 逆立ち腕立て（壁付き）：3セット×8回\n- ダイヤモンド腕立て：2セット×12回\n\n**体幹**\n- プランク：60秒×3セット\n- サイドプランク：各30秒×2セット\n- クランチ：3セット×20回\n\n**下半身**\n- スクワット：4セット×20回\n- ランジ：各足15回×3セット\n- ヒップリフト：3セット×15回\n\n## 注意点\n\n- ウォームアップは必ず5分行う\n- 筋肉痛がひどい場合は無理せず休む\n- 水分補給を忘れずに\n\n#健康 #筋トレ #ワークアウト`,
  },
]

export async function seedJapaneseNotes(): Promise<void> {
  const db = await getDb()
  const now = Date.now()

  for (const note of JAPANESE_NOTES) {
    const id = crypto.randomUUID()
    const created_at = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
    await db.insert(notes).values({ id, title: note.title, body: note.body, created_at, updated_at: created_at, language: 'ja' })
    await embedNote(id, note.title, note.body)
  }
}
