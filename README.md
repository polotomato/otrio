# Otrio Online

4人対戦３目ならべゲーム「オートリオ」のWEBアプリ版です。  
ルールや実物を見たい方は[こちら](https://www.youtube.com/watch?v=7bf2_BjH2IE)  
実際に遊びたい方は下記のURLまで  
https://otrio.net/

### Basic認証用  
ID:basic  
Pass:1234

## ゲーム開始まで手順
* [トップページ](https://otrio.net/)のBasic認証通過後、Enterをクリック
* サインイン画面の下部の Create an account を押して新規アカウントを作成
* アカウント作成後ロビー画面へ遷移するので、9つある小部屋のうち1つを選び、他の3人のプレイヤーと同じ部屋へ入室してください。
* 入室直後は観戦状態です。4つの色のうち1つを選び、該当色の参加ボタンを押してください。
* 4人プレイヤーが参加すると、赤い色として参加したプレイヤーにのみ「開始」ボタンが表示されます。「開始」を押すとゲームが開始します。

## アプリケーションを作成した背景
コロナで行動制限がかかり、実際に会ってプレイすることが難しくなったことを解決したかった。

## 要件定義書
[要件を定義したシート](https://docs.google.com/spreadsheets/d/1A9aVsl6OgEyBq1_iK6Sbr9M4Ng63YIWw5WVdr9NRKUY/)

## ER図
[![Image from Gyazo](https://i.gyazo.com/dd621087f3f8d8b1f5209e1f2c50e5a5.png)](https://gyazo.com/dd621087f3f8d8b1f5209e1f2c50e5a5)

## 画面遷移図
[![Image from Gyazo](https://i.gyazo.com/bcbe1f53ecdcfe09600a063aaea30702.png)](https://gyazo.com/bcbe1f53ecdcfe09600a063aaea30702)

## 実装予定の機能
* 棋譜再生機能
* CPU対戦
* レーティング計算、ユーザーランキング

## 開発環境
* ruby 2.6.5p114
* Rails 6.0.4.4
* mysql  Ver 14.14 Distrib 5.6.51
* AWS EC2
