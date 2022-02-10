class Message < ApplicationRecord
  validates :content, presence: true,
                      length: { minimum: 1, maximum: 200 }
  belongs_to :user

  after_create_commit { LobbyMessageBroadcastJob.perform_later self }
end
