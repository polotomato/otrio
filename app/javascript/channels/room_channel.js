import consumer from "./consumer"

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

  // ボードを隠す（入室直後）
  $("#otrio-board").css('display', 'none');
  $('#btn-reset').css('visibility', 'hidden');
  $('#btn-start-game').css('visibility', 'hidden');


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
          $(".table-wrapper").css('display', '');
          $("#btn-reset").css('visibility', 'hidden');

          // 4つの席を全て再表示
          const body = data['body'];
          const gamePlayerIDs = [];
          for(let i = 1; i <= 4; i++) {
            const svgPlayer = $(`#svg_player_${i}`);
            const btnJoin = $(`#btn-join-${i}`);
            if (body[`${i}`] === undefined) {
              // 空席
              svgPlayer.css('visibility', 'hidden');
              btnJoin.css('visibility', 'visible');
              btnJoin.attr('data-user_id', "");
              seatAvailable[i] = true;
            } else {
              // 満席
              const user_id = body[`${i}`];
              svgPlayer.css('visibility', 'visible');
              btnJoin.css('visibility', 'hidden');
              btnJoin.attr('data-user_id', `${user_id}`);
              seatAvailable[i] = false;
              gamePlayerIDs.push(user_id.toString());
            }
          }
          // 自分がプレイヤーなら、観戦ボタンを表示
          if (gamePlayerIDs.includes(current_user_id)) {
            $('#btn-decline').css('visibility', 'visible');
          } else {
            $('#btn-decline').css('visibility', 'hidden');
          }

          // プレイヤー4人着席で、seat-1のプレイヤーに開始ボタンを表示
          const owner_id = $('#btn-join-1').attr('data-user_id');
          if (owner_id === current_user_id && seatAvailable.every(v => v === false)) {
            $('#btn-start-game').css('visibility', 'visible');
          } else {
            $('#btn-start-game').css('visibility', 'hidden');
          }
          break;

        case 'start':
          // reset board
          resetBoard(colorCode, myPieces);

          // display board and hide buttons
          $("#otrio-board").css('display', '');
          $(".table-wrapper").css('display', 'none');

          // for audience
          $("#btn-pass").css('visibility', 'hidden');
          $("#btn-reset").css('visibility', 'hidden');

          canMove = allowToMoveAndPassWhenMyTurn(data['next_player_id'], current_user_id);
          break;

        case 'next':
          updateBoard(data['new_record'], colorCode);
          canMove = allowToMoveAndPassWhenMyTurn(data['next_player_id'], current_user_id);
          break;

        case 'pass':          
          canMove = allowToMoveAndPassWhenMyTurn(data['next_player_id'], current_user_id);
          break;

        case 'draw':
          updateBoard(data['new_record'], colorCode);
          displayResetButton();
          break;

        case 'abort':
          displayResetButton();
          break;

        case 'win':
          updateBoard(data['new_record'], colorCode);

          // display how to win
          winDetail(data['win_detail']);

          displayResetButton();
          break;
        
        case 'playing':
          // update board
          data['records'].forEach(function(record){
            updateBoard(record, colorCode);
          });

          // display board and hide buttons
          $("#otrio-board").css('display', '');
          $(".table-wrapper").css('display', 'none');
          $("#btn-pass").css('visibility', 'hidden');
          $("#btn-reset").css('visibility', 'hidden');
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
  $('.btn-join').on('click', function() {
    const i =  $(this).data('seat'); // seat number
    if (seatAvailable[i]) {
      seatAvailable[i] = false; // 連打防止
      const colors = {1: "R", 2: "G", 3: "P", 4: "B"}
      myColor = colors[i]
      chatChannel.perform('getToSeat', { seat_number: i });
    }
  });

  // 観戦するボタン押下
  $('#btn-decline').on('click', function() {
      $(this).css('visibility', 'hidden'); // 連打防止
      myColor = "N"
      chatChannel.perform('decline');
  });
  
  // ゲーム開始ボタン押下
  $('#btn-start-game').on('click', function() {
      $(this).css('visibility', 'hidden'); // 連打防止
      chatChannel.perform('startGame');
  });

  // パスボタン押下
  $('#btn-pass').on('click', function() {
    $(this).css('visibility', 'hidden'); // 連打防止
    chatChannel.perform('pass');
  });

  // リセットボタン押下
  $('#btn-reset').on('click', function() {
    $(this).css('visibility', 'hidden'); // 連打防止
    
    // 盤上の色を戻す
    resetBoard(colorCode, myPieces);

    $("#otrio-board").css('display', 'none');
    $(".table-wrapper").css('display', '');

    chatChannel.perform('getRoomDetail');
  });

  // 灰色のリングを押したとき処理
  $('.gray-rings').on('click', function() {
    // 自分の手番以外なら押せない
    if(canMove === false) return;

    // 4色(不透明)なら押せない
    if ($(`#${this.id}`).css('fill-opacity') === '1') return;

    // 手持ちに無かったら押せない
    const size = this.id[3];
    if (size === "S" && myPieces[0] === 0) return;
    if (size === "M" && myPieces[1] === 0) return;
    if (size === "L" && myPieces[2] === 0) return;

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

  // 灰色のリングへマウスホバーするとハイライト
  $('.gray-rings').on({
    'mouseenter': function() {
      // 自分の手番以外ならハイライトしない
      if(canMove === false) return;

      // 4色(不透明)ならハイライトしない
      const thisRing = $(`#${this.id}`);
      if (thisRing.css('fill-opacity') === '1') return;

      // 手持ちに無かったらハイライトしない
      const size = this.id[3];
      if (size === "S" && myPieces[0] === 0) return;
      if (size === "M" && myPieces[1] === 0) return;
      if (size === "L" && myPieces[2] === 0) return;

      // 自分の色にハイライトする
      thisRing.css('fill', colorCode[myColor]);
      thisRing.css('fill-opacity', 0.4);
    },
    'mouseleave': function() {
      // 自分の手番以外ならハイライトしない
      if(canMove === false) return;

      // 4色(不透明)ならハイライトしない
      const thisRing = $(`#${this.id}`);
      if (thisRing.css('fill-opacity') === '1') return;

      // 灰色に戻す
      $(`#${this.id}`).css('fill', colorCode["N"]);
      $(`#${this.id}`).css('fill-opacity', 0.2);
    }
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

function announce(objChat, announce) {
  objChat.append(announce);
  objChat.scrollTop(objChat[0].scrollHeight);
}

function displayResetButton() {
  $("#btn-pass").css('visibility', 'hidden');
  $("#btn-reset").css('visibility', 'visible');
}

function allowToMoveAndPassWhenMyTurn(next_player_id, current_user_id) {
  if (next_player_id === current_user_id){
    $("#btn-pass").css('visibility', 'visible');
    $("#your-turn-mp3").get(0).play();
    return true;
  } else {
    $("#btn-pass").css('visibility', 'hidden');
    $("#add-ring-mp3").get(0).play();
    return false;
  }
}