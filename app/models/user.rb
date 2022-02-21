class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  
  validates :nickname, presence: true, length: { maximum: 50 }
  
  has_many :game_players, dependent: :destroy
  has_many :messages,     dependent: :destroy
  has_many :room_users,   dependent: :destroy
  has_many :rooms,        through: :room_users
  has_many :battle_records, foreign_key: :winner_id
end
