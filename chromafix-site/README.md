# ChromaFix（クロマフィックス）LP

靴メーカー向けAI色補正サービス「ChromaFix」のランディングページです。
ビルド不要の静的HTML＋PHP（お問い合わせフォーム）で作ってあり、`public/` フォルダの中身をそのままサーバーにアップロードすれば公開できます。

## フォルダ構成

```
public/                ← この中身をサーバーの公開フォルダへアップロード
├─ index.html          LP本体
├─ privacy.html        プライバシーポリシー
├─ thanks.html         送信完了ページ（JavaScriptが無効な環境用）
├─ contact.php         お問い合わせフォームの送信処理
├─ favicon.svg / apple-touch-icon.png / robots.txt
└─ assets/
   ├─ css/style.css
   ├─ js/main.js       Before/Afterスライダー、人件費シミュレーター、フォーム送信
   └─ img/             サンプル画像（WebP）・OGP画像
```

## 公開前に書き換える箇所

| ファイル | 箇所 | 内容 |
|---|---|---|
| `public/contact.php` | `MAIL_TO` | お問い合わせを受け取るメールアドレス |
| `public/contact.php` | `MAIL_FROM` | 送信元アドレス。**サイトと同じ独自ドメインのアドレス**にしてください（例：`no-reply@取得したドメイン`）。別ドメインだと迷惑メール扱いされやすくなります |
| `public/index.html` | `https://example.com` （3か所） | 公開するドメインに置き換え（canonical / og:url / og:image） |
| `public/privacy.html` | `〔 〕` の部分 | 事業者名・所在地・代表者名・メールアドレス・制定日 |

## さくらのレンタルサーバへのアップロード手順

1. **ドメインをレンタルサーバに追加する**
   コントロールパネルの「ドメイン/SSL」から、取得済みの独自ドメインを追加し、公開フォルダ（例：`/home/アカウント名/www/chromafix`）を決めます。
2. **無料SSLを設定する**
   同じく「ドメイン/SSL」から無料SSL（Let's Encrypt）を設定し、「HTTPSに転送する」をオンにします。
3. **メールアドレスを作る**
   「メール」から `info@ドメイン`（受信用）などを作成し、`contact.php` の `MAIL_TO` / `MAIL_FROM` に設定します。
4. **ファイルをアップロードする**（どちらか）
   - コントロールパネルの「ファイルマネージャー」で、手順1の公開フォルダに `public/` の**中身**をアップロード
   - FTPソフト（FileZilla、Cyberduck など）で接続してアップロード
     - サーバー：`アカウント名.sakura.ne.jp`
     - ユーザー：アカウント名 ／ パスワード：サーバパスワード
5. ブラウザでドメインを開き、表示とフォーム送信（自分宛てにテスト送信）を確認します。

> `index.html` と `contact.php` が公開フォルダの直下に来るようにしてください（`public` フォルダごと置くと、URLが `/public/` 付きになります）。

## 画像の差し替え

`public/assets/img/` の画像を、同じファイル名・同じ縦横比で置き換えれば反映されます。実際の補正事例（自社の Before/After）に差し替えると、説得力が大きく上がります。

| ファイル | 用途 | 推奨サイズ |
|---|---|---|
| `hero-before.webp` / `hero-after.webp` | ファーストビューのスライダー | 1200×1200 |
| `case-black-*.webp` / `case-pink-*.webp` | 補正事例 01・02 | 1200×900 |
| `lineup-{blue,pink,black}-{before,after}.webp` | 補正事例 03（カラバリ） | 640×640 |
| `parts-side.webp` | 「靴専門の理由」のパーツ図（番号の位置は `index.html` の `--x` / `--y` で調整） | 1600×900 |
| `ogp.png` | SNSでシェアされたときの画像 | 1200×630 |

ヒーローの色見本（`#246F7C → #1580B7` など）は、現在のサンプル画像から実測した値です。画像を差し替えたら書き換えるか、削除してください。

## 人件費シミュレーターの計算

`assets/js/main.js` の `labor cost simulator` 部分で計算しています（目安の概算）。

- 額面 ＝ 手取り ÷ 0.78
- 会社負担の社会保険料 ＝ 額面 × 15.5%
- 月の人件費 ＝ 額面 ＋ 会社負担の社会保険料（手取り35万円 → 約52万円）
- ChromaFix の料金は `index.html` の `data-price="25"`（万円／月・税別）で比較

## サンプル画像のクレジット

サンプル画像は、Khronos glTF Sample Assets の 3Dモデル「Materials Variants Shoe」（© 2021 Shopify、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)）をレンダリングし、色かぶり等を加工して作成しています。CC BY 4.0 の条件により、この画像を使う間はフッターのクレジット表記を残してください（自社の画像に差し替えた場合は削除して構いません）。
