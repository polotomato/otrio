class LobbyDetailBroadcastJob < ApplicationJob
  queue_as :default

  def perform(channel)
    array = []
    rooms = Room.includes(:users).includes(:players)
    rooms.each do |room|
      array << [room.players.size, room.users.size]
    end

    ActionCable.server.broadcast channel, { status: 'get9RoomsDetail', body: array }
  end
end
