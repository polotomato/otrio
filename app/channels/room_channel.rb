class RoomChannel < ApplicationCable::Channel
  def subscribed
    stop_all_streams
    stream_from "room_channel_#{params['room']}"
    stream_from "user_channel_#{current_user.id}"

    # 部屋内に自分が入室したことをアナウンス
    RoomMessageBroadcastJob.perform_later({
      status: "user-in",
      room_id: params['room'],
      user_id: current_user.id,
      nickname: current_user.nickname
    })

    # ロビーにもアナウンス
    LobbyDetailBroadcastJob.perform_later "lobby_channel"
  end

  def unsubscribed
    # ゲーム進行中なら中断理由をアナウンス
    player = GamePlayer.includes(:room).includes(:user).find_by("user_id = ?", current_user.id)
    if player.present?
      if player.room.kifu.present?
        player.room.update(kifu: nil)
        ActionCable.server.broadcast "room_channel_#{player.room_id}", {
          status: 'abort',
          announce: ApplicationController.renderer.render(
            partial: 'rooms/announce',
            locals: { announce: "【ゲーム終了。#{player.user.nickname}さんとの接続が切れました】" }
          )
        }
      end
      player.destroy
    end


    records = RoomUser.where("user_id = ?", current_user.id)
    records.destroy_all

    # 退室したことを部屋内にアナウンス
    RoomMessageBroadcastJob.perform_later({
      status: "user-out",
      room_id: params['room'],
      user_id: current_user.id,
      nickname: current_user.nickname
    })
    
    # ロビーへアナウンス
    LobbyDetailBroadcastJob.perform_later "lobby_channel"

    # 部屋内へアナウンス
    SeatStatusBroadcastJob.perform_later params['room']
  end

  def speak(data)
    RoomMessageBroadcastJob.perform_later({
      status: "user-chat",
      message: data['message'],
      room_id: params['room'],
      nickname: current_user.nickname
    })
  end

  # 対戦席へ移動する場合
  def getToSeat(data)
    room_id = params['room']
    seat_number = data['seat_number']
    if RoomUser.where("room_id = ? AND user_id = ?", room_id, current_user.id).exists?
      unless GamePlayer.where("room_id = ? AND seat = ?", room_id, seat_number).exists?
        records = GamePlayer.where("user_id = ?", current_user.id)
        records.destroy_all
        GamePlayer.create(room_id: room_id, user_id: current_user.id, seat: seat_number)
      end
    end
  end

  # 観戦席へ移動の場合
  def decline
    room_id = params['room']
    records = GamePlayer.where("user_id = ?", current_user.id)
    unless records.empty?
      records.destroy_all
      ActionCable.server.broadcast "room_channel_#{room_id}", {
        status: 'update-game-players',
        body: getGamePlayers()
      }
    end
  end

  def getRoomDetail
    # ゲーム参加者一覧を送信
    ActionCable.server.broadcast "user_channel_#{current_user.id}", {
      status: 'update-game-players',
      body: getGamePlayers()
    }

    # 対戦中なら状況を送信
    room = Room.find_by(id: params['room'])
    if room.present? && room.kifu.present?
      kifu = JSON.parse(room.kifu)
      ActionCable.server.broadcast "user_channel_#{current_user.id}", {
        status: 'playing',
        records: kifu["records"]
      }
    end
  end

  # ゲーム開始、初期設定を送信
  def startGame
    room_id = params['room']
    # check sender is valid.
    owner = GamePlayer.includes(:user).find_by(user_id: current_user.id, room_id: room_id)
    if owner.present? && owner.seat == 1
      # 初期設定
      players =  GamePlayer.includes(:user).order("seat").where("room_id = ?", room_id)
      setting = {}
      order = []
      players.zip("RGPB".split("")) do |player, color|
        setting[color] = {
          "user_id" => player.user_id.to_s,
          "nickname" => player.user.nickname,
          "rings" => [3, 3, 3]
        }
        order << player.user_id.to_s
      end

      # 先番を決める
      next_color = "RGPB"[rand(4)]
      next_player_id = setting[next_color]["user_id"]
      next_player_nickname = setting[next_color]["nickname"]
      next_jpn_color_name = get_jpn_color_name(next_color)

      # 棋譜を保存
      kifu = {
        "setting" => setting,
        "order" => order,
        "next_player_id" => next_player_id,
        "board" => create_board(),
        "records" => []
      }
      room = Room.find(room_id)
      room.update(kifu: kifu.to_json)
    end
    
    # ゲーム開始をアナウンス
    ActionCable.server.broadcast "room_channel_#{room_id}", {
      status: 'start',
      next_player_id: next_player_id
    }

    # 次のプレイヤー名を部屋にアナウンス
    ActionCable.server.broadcast "room_channel_#{room_id}", {
      status: 'announce',
      announce: ApplicationController.renderer.render(
        partial: 'rooms/announce',
        locals: { announce: "【#{next_jpn_color_name} : #{next_player_nickname}さんの手番です】" }
      )
    }
  end

  def move(data)
    # check sender is valid.
    player = GamePlayer.includes(:room).find_by(room_id: params['room'], user_id: current_user.id)
    if player.present?
      kifu = JSON.parse(player.room.kifu)

      if kifu["next_player_id"] != current_user.id.to_s
        return
      end

      x = data['x'].to_i
      y = data['y'].to_i
      s = data['size']
      user_color = "RGPB"[player.seat - 1]
      size = { "S" => 0, "M" => 1, "L" => 2 }

      # cant move if you dont have pieces
      if kifu["setting"][user_color]["rings"][size[s]] == 0
        return
      else
        kifu["setting"][user_color]["rings"][size[s]] -= 1
      end

      # cant move if its not a gray ring
      if kifu["board"][y - 1][x - 1][size[s]] != "N"
        return ActionCable.server.broadcast "room_channel_#{player.room_id}", {
          status: 'next',
          next_player_id: kifu["next_player_id"],
          new_record: kifu["records"][-1]
        }
      end

      # update board with new record
      kifu["board"][y - 1][x - 1][size[s]] = user_color

      # add new record to kifu
      new_record = [x, y, s, user_color]
      kifu["records"] << new_record

      # set next player
      i = kifu["order"].index(kifu["next_player_id"])
      i = (i + 1) % 4
      kifu["next_player_id"] = kifu["order"][i]
      next_jpn_color_name = get_jpn_color_name("RGPB"[i])

      next_player_nickname = ""
      "RGPB".split("").each do |color|
        if kifu["setting"][color]["user_id"] == kifu["next_player_id"]
          next_player_nickname = kifu["setting"][color]["nickname"]
          break
        end
      end

      # 棋譜の保存
      room = Room.find(player.room_id)
      room.update(kifu: kifu.to_json)

      # 勝利判定
      result = judge(kifu["board"], new_record)
      if result["status"] == "win"
        # battle_records テーブルに保存
        BattleRecord.create(
          winner_id: current_user.id,
          red_id:    kifu["setting"]["R"]["user_id"].to_i,
          green_id:  kifu["setting"]["G"]["user_id"].to_i,
          purple_id: kifu["setting"]["P"]["user_id"].to_i,
          blue_id:   kifu["setting"]["B"]["user_id"].to_i,
          kifu: { "records" => kifu["records"] }.to_json
        )

        # 棋譜の削除
        room.update(kifu: nil)

        ActionCable.server.broadcast "room_channel_#{room.id}", {
          status: 'win',
          win_detail: result["win_detail"],
          new_record: new_record,
          announce: ApplicationController.renderer.render(
            partial: 'rooms/announce',
            locals: { announce: "【#{current_user.nickname}さんの勝ちです】" }
          )
        }
        return
      end

      # 引き分け判定
      if kifu["records"].length == 27
         # 棋譜の削除
        room.update(kifu: nil)
        ActionCable.server.broadcast "room_channel_#{room.id}", {
          status: 'draw',
          new_record: new_record,
          announce: ApplicationController.renderer.render(
            partial: 'rooms/announce',
            locals: { announce: "【引き分けです】" }
          )
        }
        return
      end

      # broadcast next player for room
      ActionCable.server.broadcast "room_channel_#{room.id}", {
        status: 'next',
        next_player_id: kifu["next_player_id"],
        new_record: new_record,
        announce: ApplicationController.renderer.render(
          partial: 'rooms/announce',
          locals: { announce: "【#{next_jpn_color_name} : #{next_player_nickname}さんの手番です】" }
        )
      }
    end
  end

  def pass
    # check sender is valid.
    player = GamePlayer.includes(:room).find_by(room_id: params['room'], user_id: current_user.id)
    if player.present?
      kifu = JSON.parse(player.room.kifu)

      if kifu["next_player_id"] != current_user.id.to_s
        return
      end

      # set next player
      i = kifu["order"].index(kifu["next_player_id"])
      i = (i + 1) % 4
      kifu["next_player_id"] = kifu["order"][i]
      next_jpn_color_name = get_jpn_color_name("RGPB"[i])
      next_player_nickname = kifu["setting"]["RGPB"[i]]["nickname"]

      # save kifu
      room = Room.find(player.room_id)
      room.update(kifu: kifu.to_json)

      # broadcast next player for room
      ActionCable.server.broadcast "room_channel_#{room.id}", {
        status: 'pass',
        next_player_id: kifu["next_player_id"],
        announce: ApplicationController.renderer.render(
          partial: 'rooms/announce',
          locals: { announce: "【#{next_jpn_color_name} : #{next_player_nickname}さんの手番です】" }
        )
      }
    end
  end

  private

  def getGamePlayers
    array = {}
    players = GamePlayer.where("room_id = ?", params['room'])
    players.each do |player|
      array[player.seat] = player.user_id
    end
    return array
  end

  def render_message(message)
    ApplicationController.renderer.render partial: 'rooms/message', locals: { message: message, user_nickname: nil }
  end

  def create_board
    return [
      [["N", "N", "N"], ["N", "N", "N"], ["N", "N", "N"]],
      [["N", "N", "N"], ["N", "N", "N"], ["N", "N", "N"]],
      [["N", "N", "N"], ["N", "N", "N"], ["N", "N", "N"]]
    ]
  end

  def judge(board, record)
    x = record[0].to_i - 1
    y = record[1].to_i - 1
    s = record[2]
    c = record[3]

    result = { "status" => "next" }

    # 右下がりチェック
    if y == 0 && x == 0 || y == 1 && x == 1 || y == 2 && x == 2
      array = [board[0][0], board[1][1], board[2][2]]
      if check_array(array, s, c, result)
        if result["status"] == "same_size"
          result["win_detail"] = ["11N#{s}", "22N#{s}", "33N#{s}"]
        elsif result["status"] == "DESC"
          result["win_detail"] = ["11NL", "22NM", "33NS"]
        elsif result["status"] == "ASC"
          result["win_detail"] = ["11NS", "22NM", "33NL"]
        end
        result["status"] = "win"
        return result
      end
    end

    # 右上がりチェック
    if y == 2 && x == 0 || y == 1 && x == 1 || y == 0 && x == 2
      array = [board[2][0], board[1][1], board[0][2]]
      if check_array(array, s, c, result)
        if result["status"] == "same_size"
          result["win_detail"] = ["13N#{s}", "22N#{s}", "31N#{s}"]
        elsif result["status"] == "DESC"
          result["win_detail"] = ["13NL", "22NM", "31NS"]
        elsif result["status"] == "ASC"
          result["win_detail"] = ["13NS", "22NM", "31NL"]
        end
        result["status"] = "win"
        return result
      end
    end

    # 横チェック
    array = [board[y][0], board[y][1], board[y][2]]
    if check_array(array, s, c, result)
      if result["status"] == "same_size"
        result["win_detail"] = ["1#{y + 1}N#{s}", "2#{y + 1}N#{s}", "3#{y + 1}N#{s}"]
      elsif result["status"] == "DESC"
        result["win_detail"] = ["1#{y + 1}NL", "2#{y + 1}NM", "3#{y + 1}NS"]
      elsif result["status"] == "ASC"
        result["win_detail"] = ["1#{y + 1}NS", "2#{y + 1}NM", "3#{y + 1}NL"]
      end
      result["status"] = "win"
      return result
    end

    # 縦チェック
    array = [board[0][x], board[1][x], board[2][x]]
    if check_array(array, s, c, result)
      if result["status"] == "same_size"
        result["win_detail"] = ["#{x + 1}1N#{s}", "#{x + 1}2N#{s}", "#{x + 1}3N#{s}"]
      elsif result["status"] == "DESC"
        result["win_detail"] = ["#{x + 1}1NL", "#{x + 1}2NM", "#{x + 1}3NS"]
      elsif result["status"] == "ASC"
        result["win_detail"] = ["#{x + 1}1NS", "#{x + 1}2NM", "#{x + 1}3NL"]
      end
      result["status"] = "win"
      return result
    end

    # 同じセルをチェック
    if board[y][x][0] == c && board[y][x][1] == c && board[y][x][2] == c
      result["win_detail"] = ["#{x + 1}#{y + 1}NS", "#{x + 1}#{y + 1}NM", "#{x + 1}#{y + 1}NL"]
      result["status"] = "win"
      return result
    end

    return result
  end

  def check_array(array, s, c, result)
    size = { "S" => 0, "M" => 1, "L" => 2 }
    i = size[s]
    # 同じサイズ
    if array[0][i] == c && array[1][i] == c && array[2][i] == c
      result["status"] = "same_size"
      return true
    end
    # 大きい順
    if array[0][2] == c && array[1][1] == c && array[2][0] == c
      result["status"] = "DESC"
      return true
    end

    # 小さい順
    if array[0][0] == c && array[1][1] == c && array[2][2] == c
      result["status"] = "ASC"
      return true
    end

    return false
  end

  def get_jpn_color_name(c)
    full_color_name = {
      "R" => "赤",
      "G" => "緑",
      "P" => "紫",
      "B" => "青"
    }
    return full_color_name[c]
  end
end
