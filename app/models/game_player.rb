class GamePlayer < ApplicationRecord
  belongs_to :room
  belongs_to :user

  validates :seat, presence: true, numericality: {
    only_integer: true,
    greater_than_or_equal_to: 1,
    less_than_or_equal_to: 4
  }

  after_create_commit { SeatStatusBroadcastJob.perform_later self }
end
