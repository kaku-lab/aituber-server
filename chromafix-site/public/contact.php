<?php
/**
 * ChromaFix お問い合わせフォーム送信処理
 * さくらのレンタルサーバ（PHP 8 系）での動作を想定しています。
 *
 * ▼ 公開前に、下の「設定」を必ず書き換えてください。
 *   - MAIL_TO   : お問い合わせを受け取るメールアドレス
 *   - MAIL_FROM : 送信元アドレス。サイトと同じ独自ドメインのアドレスにしてください
 *                 （さくらのコントロールパネルで作成したもの。迷惑メール判定を避けるため）
 */

// ===================== 設定 =====================
const MAIL_TO     = 'info@example.com';
const MAIL_FROM   = 'no-reply@example.com';
const FROM_NAME   = 'ChromaFix';
const SITE_NAME   = 'ChromaFix（クロマフィックス）';
const AUTO_REPLY  = true;           // お客様への自動返信メール
const RATE_LIMIT  = 5;              // 同じIPからの送信回数の上限
const RATE_WINDOW = 600;            // 上の回数を数える時間（秒）
// =================================================

mb_language('uni');
mb_internal_encoding('UTF-8');

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, array $errors = [], string $message = '', int $status = 200): void
{
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok, 'errors' => (object) $errors, 'message' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }
    // JavaScript が無効な環境向け
    if ($ok) {
        header('Location: thanks.html', true, 303);
        exit;
    }
    header('Content-Type: text/html; charset=UTF-8');
    $list = '';
    foreach (($errors ?: [$message ?: '送信できませんでした。']) as $e) {
        $list .= '<li>' . htmlspecialchars($e, ENT_QUOTES, 'UTF-8') . '</li>';
    }
    echo '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<title>入力内容をご確認ください｜ChromaFix</title></head><body style="font-family:sans-serif;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.8">'
       . '<h1 style="font-size:20px">入力内容をご確認ください</h1><ul>' . $list . '</ul>'
       . '<p><a href="javascript:history.back()">入力画面に戻る</a></p></body></html>';
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: ./#contact', true, 303);
    exit;
}

// 別サイトからの送信を拒否
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host   = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== parse_url('http://' . $host, PHP_URL_HOST)) {
    respond(false, [], '不正な送信元です。', 403);
}

// ボット対策（人間には見えない項目に入力があれば、成功したふりをして破棄）
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    respond(true);
}

// 連続送信の制限
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = rtrim(sys_get_temp_dir(), '/') . '/chromafix_rate_' . hash('sha256', $ip . __DIR__);
$now = time();
$hits = [];
if (is_readable($rateFile)) {
    $hits = array_filter(
        (array) json_decode((string) @file_get_contents($rateFile), true),
        fn($t) => is_int($t) && $t > $now - RATE_WINDOW
    );
}
if (count($hits) >= RATE_LIMIT) {
    respond(false, [], '短時間に送信が続いたため、受付を一時停止しています。しばらくしてからお試しください。', 429);
}

// 入力値の取得と整形
function field(string $key, int $max): string
{
    $v = $_POST[$key] ?? '';
    if (!is_string($v)) {
        return '';
    }
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr(trim($v), 0, $max);
}
function oneLine(string $v): string
{
    return trim(preg_replace('/\s+/u', ' ', $v) ?? '');
}

$types    = ['trial' => '無料トライアル', 'estimate' => 'お見積り', 'other' => 'その他のご相談'];
$currents = ['staff' => '社内の担当者が行っている', 'photographer' => '撮影担当者が兼任している', 'outsource' => '外注している', 'none' => '特に補正していない', 'other' => 'その他'];
$volumes  = ['lt100' => '〜100枚', '100-300' => '100〜300枚', '300-1000' => '300〜1,000枚', 'gt1000' => '1,000枚以上', 'unknown' => 'わからない'];

$type    = field('type', 20);
$company = oneLine(field('company', 100));
$name    = oneLine(field('name', 50));
$email   = oneLine(field('email', 254));
$tel     = oneLine(field('tel', 20));
$current = field('current', 20);
$volume  = field('volume', 20);
$message = field('message', 3000);
$agree   = ($_POST['agree'] ?? '') === '1';

$errors = [];
if (!isset($types[$type])) {
    $errors['type'] = 'ご用件を選択してください。';
}
if ($name === '') {
    $errors['name'] = 'お名前を入力してください。';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'メールアドレスを正しく入力してください。';
}
if ($tel !== '' && !preg_match('/^[0-9０-９+\-－() ]{8,20}$/u', $tel)) {
    $errors['tel'] = '電話番号は数字とハイフンで入力してください。';
}
if ($current !== '' && !isset($currents[$current])) {
    $current = '';
}
if ($volume !== '' && !isset($volumes[$volume])) {
    $volume = '';
}
if (!$agree) {
    $errors['agree'] = 'プライバシーポリシーへの同意が必要です。';
}
if ($errors) {
    respond(false, $errors, '入力内容をご確認ください。', 422);
}

// 管理者宛メール
$typeLabel    = $types[$type];
$currentLabel = $currents[$current] ?? '（未選択）';
$volumeLabel  = $volumes[$volume] ?? '（未選択）';
$subject = '【' . SITE_NAME . '】お問い合わせ（' . $typeLabel . '）' . ($company !== '' ? ' ' . $company : '');
$body = <<<TXT
Webサイトからお問い合わせがありました。

■ ご用件　　　　　：{$typeLabel}
■ 会社名・ブランド名：{$company}
■ お名前　　　　　：{$name}
■ メールアドレス　：{$email}
■ 電話番号　　　　：{$tel}
■ 色補正の体制　　：{$currentLabel}
■ 月あたりの枚数　：{$volumeLabel}
■ ご相談内容
{$message}

----------------------------------------
送信日時：{date}
IPアドレス：{ip}
TXT;
$body = strtr($body, ['{date}' => date('Y-m-d H:i:s'), '{ip}' => $ip]);

$fromHeader = 'From: ' . mb_encode_mimeheader(FROM_NAME) . ' <' . MAIL_FROM . '>';
$headers = $fromHeader . "\r\n" . 'Reply-To: ' . $email;

$sent = mb_send_mail(MAIL_TO, $subject, $body, $headers, '-f' . MAIL_FROM);
if (!$sent) {
    respond(false, [], '送信できませんでした。お手数ですが、時間をおいてもう一度お試しください。', 500);
}

// 自動返信（第三者への迷惑メールに悪用されないよう、入力内容は含めない定型文のみ）
if (AUTO_REPLY) {
    $replySubject = '【' . SITE_NAME . '】お問い合わせありがとうございます';
    $replyBody = <<<TXT
このたびは ChromaFix（クロマフィックス）にお問い合わせいただき、
誠にありがとうございます。

内容を確認のうえ、原則1営業日以内に担当者よりご連絡いたします。
無料トライアルをお申し込みの方には、画像のお送り方法をあわせてご案内します。

※このメールは送信専用アドレスから自動でお送りしています。
※お心当たりのない場合は、お手数ですがこのメールを破棄してください。

----------------------------------------
ChromaFix（クロマフィックス）
靴メーカーのためのAI色補正サービス
TXT;
    @mb_send_mail($email, $replySubject, $replyBody, $fromHeader, '-f' . MAIL_FROM);
}

$hits[] = $now;
@file_put_contents($rateFile, json_encode(array_values($hits)), LOCK_EX);

respond(true);
