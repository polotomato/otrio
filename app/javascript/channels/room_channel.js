import consumer from "./consumer"

// $(function() { ... }); で囲むことでレンダリング後に実行される
$(function() {
  if ($('#in_room').length === 0) return;

  const current_user_id = getUserID();

  const objUserList = $('#user-list');
  const objChat = $('#chat-lists');

  const seatAvailable = [false, false, false, false, false]

  const colorCode = {
    "R": "#FF2A2A",
    "G": "#00D400",
    "P": "#660080",
    "B": "#00AAD4",
    "N": "#000000"
  };

  // 行動可能のフラグ
  let canMove = false;

  // 手持ちのコマ残数
  let myPieces = [3, 3, 3];

  // 自分の色
  let myColor = "N"

  // 現在の盤上の色
  resetBoard(colorCode, myPieces);

  // ボードとパスボタンを隠す（入室直後）
  $("#otrio-board").css('display', 'none');
  // $("#btn-pass").css('visibility', 'hidden');
  $("#btn-pass").css('display', 'none');
  $("#btn-reset").css('display', 'none');

  const chatChannel = consumer.subscriptions.create({ channel: 'RoomChannel', room: $('#in_room').data('room_id') }, {
    connected() {
      // Called when the subscription is ready for use on the server
      this.perform('getRoomDetail');
    },

    disconnected() {
      // Called when the subscription has been terminated by the server
    },

    received: function(data) {
      // アナウンスがあればチャット欄に表示する
      if (data['announce'] != undefined)
        announce(objChat, data['announce']);

      switch (data['status']){
        // ユーザーチャットを表示
        case 'user-chat':
          announce(objChat, data['message']);
          break;

        case 'user-in':
          // 入室者一覧に追加
          if ($(`#user-id-${data['user_id']}`).length === 0){
            objUserList.append(`
              <div class="user-name" id="user-id-${data['user_id']}">
                <p>${data['nickname']}</p>
              </div>
            `);
          }
          break;

        case 'user-out':
          // 入室者一覧から削除
          $(`#user-id-${data['user_id']}`).remove();
          break;

        case 'update-game-players':
          // 4つの席を全て再表示
          const body = data['body'];
          const gamePlayerIDs = [];
          for(let i = 1; i <= 4; i++) {
            const seat = $(`[data-seat=${i}]`);
            const p = $(`[data-seat=${i}] > p`)
            if (body[`${i}`] === undefined) {
              seat.attr('data-user_id', "");
              p.text("参加");
              seatAvailable[i] = true;
            } else {
              const user_id  = body[`${i}`][0]
              const nickname = body[`${i}`][1]
              seat.attr('data-user_id', `${user_id}`);
              p.text(`${nickname}`);
              seatAvailable[i] = false;
              gamePlayerIDs.push(user_id.toString());
            }
          }
          // 自分がプレイヤーなら、観戦ボタンを表示
          if (gamePlayerIDs.includes(current_user_id)) {
            $('#btn-decline').css('display', '');
          } else {
            $('#btn-decline').css('display', 'none');
          }

          // プレイヤー4人着席で、seat-1のプレイヤーに開始ボタンを表示
          const owner_id = $('#owner-seat').attr('data-user_id');
          if (owner_id === current_user_id && seatAvailable.every(v => v === false)) {
            $('#btn-start-game').css('display', '');
          } else {
            $('#btn-start-game').css('display', 'none');
          }
          break;

        case 'start':
          // reset board
          resetBoard(colorCode, myPieces);

          // display board and hide buttons
          $("#otrio-board").css('display', '');
          $(".seat-row").css('display', 'none');
          $("#btn-reset").css('display', 'none');
          $("#btn-pass").css('display', 'none');

          if (data['next_player_id'] === current_user_id){
            // allow to move
            canMove = true;
            // allow to pass
            $("#btn-pass").css('display', '');
          } else {
            canMove = false;
            $("#btn-pass").css('display', 'none');
          }
          break;

        case 'next':
          // update board
          updateBoard(data['new_record'], colorCode);
          
          if (data['next_player_id'] === current_user_id){
            // allow to move
            canMove = true;
            // allow to pass
            $("#btn-pass").css('display', '');
          } else {
            canMove = false;
            $("#btn-pass").css('display', 'none');
          }
          break;

        case 'draw':
          // update board
          updateBoard(data['new_record'], colorCode);

          // display reset button to reset board and display seats
          displaySeats();
          break;

        case 'abort':
          // TODO: 
          // display why abort
          // display reset button to reset board and display seats
          break;

        case 'win':
          // update board
          updateBoard(data['new_record'], colorCode);

          // display why to win
          winDetail(data['win_detail']);

          // display reset button to reset board and display seats
          displaySeats();
          break;
      }
    },

    // サーバーへチャット内容を送信
    speak: function(message) {
      return this.perform('speak', { message: message });
    },

    // 対戦席に着くことを申請する
    getToSeat: function(seat_number) {
      return this.perform('getToSeat', {
        seat_number: seat_number
      });
    }
  });

  // Enterでサーバーへチャットを送信
  $(document).on('keypress', '[data-behavior~=room_speaker]', function(e) {
    if (e.key === 'Enter') {
      if (e.target.value.trim() != "")
        chatChannel.speak(e.target.value);
      e.target.value = '';
      return e.preventDefault();
    }
  });

  // 参加ボタン押下
  $('.seat-rings').on('click', function() {
    const i =  $(this).parent().data('seat'); // seat number
    if (seatAvailable[i]) {
      seatAvailable[i] = false; // 連打防止
      const colors = {1: "R", 2: "G", 3: "P", 4: "B"}
      myColor = colors[i]
      chatChannel.perform('getToSeat', { seat_number: i });
    }
  });

  // 観戦するボタン押下
  $('#btn-decline').on('click', function() {
      $(this).css('display', 'none'); // 連打防止
      myColor = "N"
      chatChannel.perform('decline');
  });
  
  // ゲーム開始ボタン押下
  $('#btn-start-game').on('click', function() {
      $(this).css('display', 'none'); // 連打防止
      chatChannel.perform('startGame');
  });

  // パスボタン押下
  $('#btn-pass').on('click', function() {
    $(this).css('display', 'none'); // 連打防止
    chatChannel.perform('pass');
  });

  // リセットボタン押下
  $('#btn-reset').on('click', function() {
    $(this).css('display', 'none'); // 連打防止
    
    // 盤上の色を戻す
    resetBoard(colorCode, myPieces);

    $("#otrio-board").css('display', 'none');
    $(".seat-row").css('display', '');

    chatChannel.perform('getRoomDetail');
  });

  // 灰色のリングを押したとき処理
  $('.gray-rings').on('click', function() {
    // 灰色以外は押せない
    const color = $(`#${this.id}`).css('fill');
    if (rgbToHex(color) != colorCode["N"]) return;

    // 手持ちに無かったら押せない
    const size = this.id[3];
    if (size === "S" && myPieces[0] === 0) return;
    if (size === "M" && myPieces[1] === 0) return;
    if (size === "L" && myPieces[2] === 0) return;

    // 自分の手番以外なら押せない
    if(canMove === false) return;

    // 連打防止
    canMove = false;

    // 手持ち -1
    if (size === "S") myPieces[0] -= 1;
    if (size === "M") myPieces[1] -= 1;
    if (size === "L") myPieces[2] -= 1;

    // 押したボタンを送信
    chatChannel.perform('move', {
      x: this.id[0],
      y: this.id[1],
      size: this.id[3]
    });
  });
});

// クッキーからユーザーIDを取得
function getUserID() {
  const cookies = document.cookie;
  const cookiesArray = cookies.split(';');

  for (let c of cookiesArray) {
    const cArray = c.split('=');
    if (cArray[0].trim() == 'user_id'){
      return cArray[1].trim();
    }
  }
}

function resetBoard(colorCode, myPieces) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      // 盤上を灰色に戻す
      ["S", "M", "L"].forEach(function(size){
        const grayRing = $(`#${i + 1}${j + 1}N${size}`);
        grayRing.css('fill', colorCode["N"]);
        grayRing.css('fill-opacity', 0.2);
      });  
    }
  }

  // 手持ちのコマ数を戻す
  myPieces[0] = 3;
  myPieces[1] = 3;
  myPieces[2] = 3;

  // 全てプレイヤーののコマの色を戻す
  for (let i = 1; i <= 4; i++) {
    ["R", "G", "P", "B"].forEach(function(color){
      ["S", "M", "L"].forEach(function(size){
        const ring = $(`#${color}${size}${i}`);
        ring.css('fill', colorCode[color]);
        ring.css('fill-opacity', 1);
      });  
    });
  }
}

function updateBoard(record, colorCode) {
  const x = record[0]
  const y = record[1]
  const size = record[2]
  const color = record[3]

  // 盤上に1つ置く
  $(`#${x}${y}N${size}`).css('fill', colorCode[color]);
  $(`#${x}${y}N${size}`).css('fill-opacity', 1);

  // 手持ちから1つ消す
  for (let i = 1; i <= 3; i++) {
    console.log(`#${color}${size}${i}`);
    console.log($(`#${color}${size}${i}`).css('fill-opacity'));
    console.log($(`#${color}${size}${i}`).css('fill-opacity') === "1");
    if ($(`#${color}${size}${i}`).css('fill-opacity') === "1") {
      $(`#${color}${size}${i}`).css('fill-opacity', 0);
      return;
    }
  }
}

function winDetail(detail) {
  for (let i = 1; i <= 3; i++) {
    for (let j = 1; j <= 3; j++) {
      // 盤上を薄く表示
      let ring = $(`#${i}${j}NS`);
      ring.css('fill-opacity', 0.2);
      ring = $(`#${i}${j}NM`);
      ring.css('fill-opacity', 0.2);
      ring = $(`#${i}${j}NL`);
      ring.css('fill-opacity', 0.2);
    }
  }

  // 全てプレイヤーののコマの色を薄く表示
  for (let i = 1; i <= 4; i++) {
    ["R", "G", "P", "B"].forEach(function(color){
      ["S", "M", "L"].forEach(function(size){
        const ring = $(`#${color}${size}${i}`);
        ring.css('fill-opacity', 0.2);
      });  
    });
  }

  // 強調表示
  detail.forEach(function (ID) {
    $(`#${ID}`).css('fill-opacity', 1);
  });
}

function rgbToHex(color)
{
  // HEXに変換したものを代入する変数
  var hex = '#';
  
  // 第1引数がHEXのとき変換処理は必要ないのでそのままreturn
  // IE8の場合はjQueryのcss()関数でHEXを返すので除外
  if (color.match(/^#[a-f\d]{3}$|^#[a-f\d]{6}$/i))
  {
    return color;
  }
  
  // 正規表現
  var regex = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  
  // 正規表現でマッチしたとき
  if (regex)
  {
    var rgb =
    [
      // RGBからHEXへ変換
      parseInt(regex[1]).toString(16),
      parseInt(regex[2]).toString(16),
      parseInt(regex[3]).toString(16)
    ];
    
    for (var i = 0; i < rgb.length; ++i)
    {
      // rgb(1,1,1)のようなときHEXに変換すると1桁になる
      // 1桁のときは前に0を足す
      if (rgb[i].length == 1)
      {
        rgb[i] = '0' + rgb[i];
      }
      hex += rgb[i];
    }
    
    return hex;
  }
  
  console.error('第1引数はRGB形式で入力');
}

function announce(objChat, announce) {
  objChat.append(announce);
  objChat.scrollTop(objChat[0].scrollHeight);
}

function displaySeats() {
  $("#btn-pass").css('display', 'none');
  $("#btn-reset").css('display', '');
}