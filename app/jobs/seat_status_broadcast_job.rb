class SeatStatusBroadcastJob < ApplicationJob
  queue_as :default

  def perform(room_id)
    ActionCable.server.broadcast "room_channel_#{room_id}", {
      status: 'update-game-players',
      body: getGamePlayers(room_id)
    }
  end

  private

  def getGamePlayers(room_id)
    array = {}
    players = GamePlayer.where("room_id = ?", room_id)
    players.each do |player|
      array[player.seat] = player.user_id
    end
    return array
  end
end
