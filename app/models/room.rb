class Room < ApplicationRecord
  validates :kifu, length: { maximum: 2000 }
end
