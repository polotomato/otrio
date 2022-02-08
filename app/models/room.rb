class Room < ApplicationRecord
  validates :kifu, length: { maximum: 2000 }

  has_many :room_users
  has_many :users, through: :room_users
  has_many :game_players
end
