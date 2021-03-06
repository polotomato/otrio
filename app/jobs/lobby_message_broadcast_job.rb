class LobbyMessageBroadcastJob < ApplicationJob
  queue_as :default

  def perform(message)
    ActionCable.server.broadcast 'lobby_channel', { status: 'chat-message', message: render_message(message) }
  end



  private

  def render_message(message)
    ApplicationController.renderer.render partial: 'rooms/message', locals: { message: message.content, user_nickname: message.user.nickname }
  end
end
