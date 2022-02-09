class SeatStatusBroadcastJob < ApplicationJob
  queue_as :default

  def perform(game_player)
    ActionCable.server.broadcast "room_channel_#{game_player.room_id}", {
      status: 'update-game-players',
      body: getGamePlayers(game_player)
    }
  end

  private

  def getGamePlayers(game_player)
    array = {}
    players = GamePlayer.where("room_id = ?", game_player.room_id)
    players.each do |player|
      array[player.seat] = [player.user_id, User.find(player.user_id).nickname] 
    end
    return array
  end
end
