class RoomMessageBroadcastJob < ApplicationJob
  queue_as :default

  def perform(data)
    case data[:status]
    when 'user-chat'
      ActionCable.server.broadcast "room_channel_#{data[:room_id]}", {
        status: 'user-chat',
        message: render_message({
          msg: data[:msg],
          user_nickname: data[:user_nickname]
          })}
    when 'user-in'
      ActionCable.server.broadcast "room_channel_#{data[:room_id]}", { 
        tatus: 'user-in',
        message: render_message({
          msg: data[:msg],
          user_nickname: data[:user_nickname]
        }),
        user_id: data[:user_id],
        nickname: data[:nickname]
      }
    when 'user-out'
      ActionCable.server.broadcast "room_channel_#{data[:room_id]}", {
        status: 'user-out',
        message: render_message({
          msg: data[:msg],
          user_nickname: data[:user_nickname]
        }),
        user_id: data[:user_id],
        nickname: data[:nickname]
      }
    end
  end

  private

  def render_message(data)
    ApplicationController.renderer.render(partial: 'rooms/message',
                                          locals: { message: data[:msg],
                                                    user_nickname: data[:user_nickname]
                                          })
  end
end
