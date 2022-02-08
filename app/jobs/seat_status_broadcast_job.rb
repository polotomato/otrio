class SeatStatusBroadcastJob < ApplicationJob
  queue_as :default

  def perform(game_player)
    ActionCable.server.broadcast "room_channel_#{game_player.room_id}", {
      status:     'game-player-in',
      user_id:     game_player.user_id,
      nickname:    game_player.user.nickname,
      seat_number: game_player.seat
    }
  end
end
