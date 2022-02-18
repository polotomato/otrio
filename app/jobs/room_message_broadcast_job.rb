class RoomMessageBroadcastJob < ApplicationJob
  queue_as :default

  def perform(data)
    case data[:status]
    when 'user-chat'
      ActionCable.server.broadcast "room_channel_#{data[:room_id]}", {
        status: 'user-chat',
        message: ApplicationController.renderer.render(
          partial: 'rooms/message',
          locals: { user_nickname: data[:nickname], message: data[:message] }
        )
      }
    when 'user-in'
      ActionCable.server.broadcast "room_channel_#{data[:room_id]}", { 
        status: 'user-in',
        announce: ApplicationController.renderer.render(
          partial: 'rooms/announce',
          locals: { announce: "【#{data[:nickname]}さんが入室しました】" }
        ),
        user_id: data[:user_id],
        nickname: data[:nickname]
      }
    when 'user-out'
      ActionCable.server.broadcast "room_channel_#{data[:room_id]}", {
        status: 'user-out',
        announce: ApplicationController.renderer.render(
          partial: 'rooms/announce',
          locals: { announce: "【#{data[:nickname]}さんが退室しました】" }
        ),
        user_id: data[:user_id],
        nickname: data[:nickname]
      }
    end
  end
end
