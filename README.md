# 夏猫式ピクトグラムエディター

関節を動かして、好きなポーズのピクトグラムを作る静的Webアプリです。アカウントやサーバー保存を使わず、編集・読込・書き出しをブラウザ内で行います。

## 公開版

[夏猫式ピクトグラムエディターを開く](https://natuneko722.github.io/NatsunekoPictogramEditor/)

## MVPでできること

- 「立つ」「歩く」「走る」「指差す」「手を振る」の5ポーズから開始
- 主要な関節をドラッグしてポーズを編集
- 人物色、左右反転、左右の腕・脚の前後関係を変更
- 元に戻す・やり直す
- 24px・32px・64pxの縮小プレビュー
- バージョン付きJSONで保存・再読込
- SVG・背景透過PNGを書き出し

## 開発用の起動方法

Node.js 24以降とpnpm 11以降を使用します。

```powershell
pnpm install
pnpm dev
```

表示されたローカルURLをMicrosoft EdgeまたはGoogle Chromeで開きます。

## 確認コマンド

```powershell
pnpm test
pnpm build
pnpm preview
```

`pnpm build`で生成される`dist`は、静的Webサイトとして配置できます。Viteの出力パスは相対指定のため、リポジトリ名が未確定の段階でもローカル確認できます。

## GitHub Pagesについて

公開版はGitHub Actionsでテストと本番ビルドを行い、GitHub Pagesへ配置しています。`.github/workflows/deploy-pages.yml`は、意図しない更新を避けるため手動実行だけを許可しています。

## データと注意事項

- 読み込んだ制作データを、アプリ機能として外部へ送信しません。
- JSONはこのアプリで再編集するためのプロジェクトファイルです。
- 公共サイン風の利用を含め、JIS・ISO等の規格準拠は保証しません。
- GCMZDrops2連携支援用オーバーレイとパーツ別出力は、MVP後の候補です。

## 対応状況

GitHub Pages上での起動と主要画面は確認済みです。Windows版Microsoft EdgeとGoogle Chromeそれぞれでの最終確認は今後行います。

## ライセンス

現在はライセンスを設定していません。ソースコードと出力物の利用条件は、今後の公開方針で決定します。
